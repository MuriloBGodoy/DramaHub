// Cliente de dados: o app fala direto com o Supabase (sem backend proprio).
// Catalogo e publico; progresso/favoritos/perfil ficam no usuario anonimo deste navegador (RLS).
// As funcoes devolvem os mesmos formatos (camelCase) que a antiga API Java, entao as telas nao mudam.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dramahub.auth' },
})

/** Antes era o proxy de uploads do backend; hoje todo video tem URL propria. */
export const mediaUrl = (path) => path

const SERIES_COLS = 'id,title,synopsis,cover_url,genre,tags,source,credit,featured,created_at'
const EPISODE_COLS = 'id,series_id,number,title,video_url,youtube_id,thumbnail_url,start_sec,end_sec,duration_sec'

// ---------- mapeamento (snake_case do banco -> formato antigo da API) ----------

const splitTags = (t) => (t ? t.split(',').map((x) => x.trim()).filter(Boolean) : [])

const toSummary = (s) => ({
  id: s.id, title: s.title, synopsis: s.synopsis, coverUrl: s.cover_url, genre: s.genre, tags: splitTags(s.tags),
  source: s.source, credit: s.credit, featured: s.featured,
  episodeCount: s.episode?.[0]?.count ?? s.episodeCount ?? 0,
})

const toEpisode = (e, s) => ({
  id: e.id, seriesId: e.series_id, seriesTitle: s?.title, seriesCoverUrl: s?.cover_url, number: e.number, title: e.title,
  streamUrl: e.video_url, youtubeId: e.youtube_id, thumbnailUrl: e.thumbnail_url,
  startSec: e.start_sec, endSec: e.end_sec, durationSec: e.duration_sec,
})

const toDetail = (s) => ({
  ...toSummary({ ...s, episodeCount: s.episode?.length }), script: s.script,
  episodes: [...(s.episode || [])].sort((a, b) => a.number - b.number).map((e) => toEpisode(e, s)),
})

const toProgress = (p) => ({
  episodeId: p.episode_id, seriesId: p.episode.series_id, episodeNumber: p.episode.number,
  positionSec: p.position_sec, completed: p.completed, episode: toEpisode(p.episode, p.episode.series),
})

const toUser = (p) => ({ id: p.id, name: p.name, avatar: p.avatar, role: p.is_admin ? 'ADMIN' : 'USER' })

/** Lanca o erro do Supabase com mensagem legivel. */
function check({ data, error }) {
  if (error) throw new Error(error.message || 'Erro de conexão')
  return data
}

/** O PostgREST devolve no maximo 1000 linhas por chamada: pagina ate o fim. */
async function all(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const rows = check(await build().range(from, from + 999))
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

// sessao atual em memoria (para o salvamento sincrono ao fechar a aba)
let current = null
supabase.auth.onAuthStateChange((_e, session) => { current = session })

const uid = async () => (await supabase.auth.getSession()).data.session?.user.id

/** Chama uma Edge Function e devolve o JSON (ou lanca a mensagem de erro dela). */
async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* sem corpo */ }
    throw new Error(msg)
  }
  return data
}

export const api = {
  // ---------- sessão (login anônimo do Supabase) ----------
  me: async () => toUser(check(await supabase.from('profile').select('*').eq('id', await uid()).single())),
  newSession: async () => {
    check(await supabase.auth.signInAnonymously())
    return { user: await api.me() }
  },
  endSession: async () => {
    await supabase.rpc('delete_me')
    await supabase.auth.signOut({ scope: 'local' })
  },
  updateMe: async ({ name, avatar }) =>
    toUser(check(await supabase.from('profile').update({ name: name?.trim() || 'Visitante', avatar }).eq('id', await uid()).select().single())),
  unlockAdmin: async (code) => toUser(check(await supabase.rpc('unlock_admin', { code }))),

  // ---------- catálogo ----------
  series: async ({ genre, source, q } = {}) => {
    const rows = await all(() => {
      let query = supabase.from('series').select(`${SERIES_COLS},episode(count)`)
      if (genre) query = query.ilike('genre', genre)
      if (source) query = query.eq('source', source)
      if (q) {
        const term = q.replace(/[,()%*\\]/g, ' ').trim()
        if (term) query = query.or(`title.ilike.*${term}*,tags.ilike.*${term}*`)
      }
      return query.order('featured', { ascending: false }).order('created_at', { ascending: false }).order('id')
    })
    return rows.map(toSummary)
  },
  genres: async () => check(await supabase.from('genres').select('genre')).map((g) => g.genre),
  seriesDetail: async (id) => {
    const s = check(await supabase.from('series').select(`${SERIES_COLS},script,episode(${EPISODE_COLS})`).eq('id', id).maybeSingle())
    if (!s) throw new Error('Série não encontrada')
    return toDetail(s)
  },
  episode: async (id) => {
    const e = check(await supabase.from('episode').select(`${EPISODE_COLS},series(title,cover_url)`).eq('id', id).maybeSingle())
    if (!e) throw new Error('Episódio não encontrado')
    return toEpisode(e, e.series)
  },
  /** Feed "Para você": o 1º episódio de cada série. */
  feed: async () => {
    const rows = await all(() => supabase.from('series').select(`id,title,cover_url,featured,created_at,episode!inner(${EPISODE_COLS})`)
      .eq('episode.number', 1).order('featured', { ascending: false }).order('created_at', { ascending: false }).order('id'))
    return rows.map((s) => toEpisode(s.episode[0], s))
  },

  // ---------- meu progresso / favoritos ----------
  saveProgress: async (episodeId, positionSec, completed, keepalive = false) => {
    const row = {
      user_id: current?.user.id ?? await uid(), episode_id: episodeId, position_sec: Math.max(0, positionSec || 0),
      completed: !!completed, updated_at: new Date().toISOString(),
    }
    if (keepalive && current) {
      // aba fechando: fetch com keepalive sobrevive ao descarregamento da pagina
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/watch_progress`, {
        method: 'POST', keepalive: true, body: JSON.stringify(row),
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${current.access_token}`,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
        },
      }).catch(() => {})
      return null
    }
    check(await supabase.from('watch_progress').upsert(row))
    return null
  },
  seriesProgress: async (seriesId) => {
    const rows = check(await supabase.from('watch_progress')
      .select(`episode_id,position_sec,completed,updated_at,episode!inner(${EPISODE_COLS},series(title,cover_url))`)
      .eq('episode.series_id', seriesId))
    return rows.map(toProgress)
  },
  /** Último episódio tocado de cada série, mais recente primeiro. */
  continueWatching: async () => {
    const rows = await all(() => supabase.from('watch_progress')
      .select(`episode_id,position_sec,completed,updated_at,episode!inner(${EPISODE_COLS},series(${SERIES_COLS},episode(count)))`)
      .order('updated_at', { ascending: false }))
    const seen = new Set()
    return rows.filter((p) => !seen.has(p.episode.series_id) && seen.add(p.episode.series_id))
      .map((p) => ({ series: toSummary(p.episode.series), progress: toProgress(p) }))
  },
  favorites: async () => {
    const rows = check(await supabase.from('favorite').select(`created_at,series(${SERIES_COLS},episode(count))`).order('created_at', { ascending: false }))
    return rows.filter((f) => f.series).map((f) => toSummary(f.series))
  },
  isFavorite: async (seriesId) => {
    const rows = check(await supabase.from('favorite').select('series_id').eq('series_id', seriesId))
    return { favorite: rows.length > 0 }
  },
  toggleFavorite: async (seriesId) => {
    const { favorite } = await api.isFavorite(seriesId)
    if (favorite) check(await supabase.from('favorite').delete().eq('series_id', seriesId))
    else check(await supabase.from('favorite').insert({ series_id: seriesId }))
    return { favorite: !favorite }
  },

  // ---------- estúdio (admin; o banco confere via RLS) ----------
  createSeries: async (b) => {
    const blank = (v) => (v == null || String(v).trim() === '' ? null : v)
    const s = check(await supabase.from('series').insert({
      title: b.title.trim(), synopsis: b.synopsis, cover_url: blank(b.coverUrl), genre: blank(b.genre), tags: blank(b.tags),
      source: b.source || 'ai', credit: blank(b.credit), featured: !!b.featured, script: blank(b.script),
    }).select(SERIES_COLS).single())
    return toDetail({ ...s, episode: [] })
  },
  deleteSeries: async (id) => { check(await supabase.from('series').delete().eq('id', id)); return null },
  addEpisodeByUrl: async (seriesId, b) => {
    const n = Number(b.number)
    const e = check(await supabase.from('episode').insert({
      series_id: Number(seriesId), number: n, title: b.title?.trim() || `Episódio ${n}`,
      video_url: b.videoUrl.trim(), thumbnail_url: b.thumbnailUrl || null,
    }).select(EPISODE_COLS).single())
    return toEpisode(e)
  },

  // ---------- Edge Functions ----------
  aiStatus: () => invoke('ai-script', { status: true }),
  aiScript: (body) => invoke('ai-script', body),
  importPreview: (url) => invoke('youtube-import', { action: 'preview', url }),
  importRun: (body) => invoke('youtube-import', { action: 'import', ...body }),
}

export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

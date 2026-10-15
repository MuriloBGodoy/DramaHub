// Bateria de importacao: le os uploads dos canais oficiais no YouTube, filtra dramas completos
// em portugues e grava direto no Supabase (chave secreta do .env da raiz).
// Uso: node tools/batch-import.mjs [--dry]     (Node 22.18+ - importa os modulos .ts das Edge Functions)
import fs from 'node:fs'
import { preview } from '../supabase/functions/_shared/youtube.ts'
import { planImport } from '../supabase/functions/_shared/importer.ts'

const ENV = Object.fromEntries(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\n/)
  .map((l) => l.trim()).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const DB = `${ENV.SUPABASE_URL}/rest/v1`
const KEY = ENV.SUPABASE_SECRET_KEY
const DRY = process.argv.includes('--dry')
const ONLY = process.env.ONLY // ex: ONLY=ai roda so os canais de IA

const SOURCES = [
  { name: 'ShortMax - Latinoamérica', playlist: 'UUUlvMtNmSGc8lBDhfKEppTw', langCheck: true },
  { name: 'MoboReels PT', playlist: 'UUOsd0pXCLHkO512hcX2waGw', langCheck: false },
  { name: 'StardustTV Português', playlist: 'UUuVMQvJ4299hZtlAnypVYSA', langCheck: false },
  // canais de dramas GERADOS POR IA (conteudo proprio do canal) -> source "ai"
  { name: 'Amor em Série IA', playlist: 'UUMTu_hf3U9LYkCkEkYqwTwg', langCheck: false, source: 'ai' },
  { name: 'Império IA', playlist: 'UUJnnqPKuwHFsqs8kSlKI9CA', langCheck: false, source: 'ai' },
  { name: 'Teatro da Lua', playlist: 'UUqzTt1aagtRl9zN_vz8ymVw', langCheck: false, source: 'ai' },
  { name: 'PoPo Drama Vício IA', playlist: 'UUEKmOYvoHzmfsp0My_FWciA', langCheck: false, source: 'ai' },
  { name: 'Next_Episode (Drama de IA)', playlist: 'UUg4bKWN64z2sV20ZR24vu6Q', langCheck: true, source: 'ai' },
  { name: 'DramaTales (IA)', playlist: 'UUiC5X3RSsFXqHJuaVc9ymUA', langCheck: true, source: 'ai' },

  // ---- 2026-10: canais novos (marcados com novo: true; rode so eles com ONLY=novo) ----
  // Canais que se declaram produtores de drama GERADO POR IA
  { name: 'Velvet Romance (IA)', playlist: 'UUpizx5k3N-KfXV0Eihm0-NQ', langCheck: true, source: 'ai', novo: true },
  { name: 'Unreal Hearts (IA)', playlist: 'UUj_kPtykol6IeijzehdUoZQ', langCheck: true, source: 'ai', novo: true },
  { name: 'DramaLure (IA)', playlist: 'UUfpFahhyqs5caxVD9bUSVuQ', langCheck: true, source: 'ai', novo: true },
  // Canais mistos: so os videos marcados como IA no titulo
  { name: 'Drama Diary', playlist: 'UU8jpOC31Ks-Dr5BL_KKjR0Q', langCheck: true, source: 'ai', aiOnly: true, novo: true },
  { name: 'Cineminha do Destino', playlist: 'UUd690sjJFCcVDkOZByHNPoA', langCheck: true, source: 'ai', aiOnly: true, novo: true },
  { name: 'HotMinissérie', playlist: 'UUVeHRoBtfvtc0IqqNIvt2Nw', langCheck: true, source: 'ai', aiOnly: true, novo: true },
  { name: 'Drama da Lua', playlist: 'UU07XAIvhFK4jaO8yowAJs2A', langCheck: true, source: 'ai', aiOnly: true, novo: true },
  { name: 'Puro Frio na Barriga', playlist: 'UUnMW7LyoeD7N1btRPrrrCIw', langCheck: true, source: 'ai', aiOnly: true, novo: true },
  // Canais oficiais de apps / conteudo declarado como licenciado (sem hashtags de outras plataformas)
  { name: 'KalosTV PT (oficial)', playlist: 'UU2BeNC4vTu7zWQfaAjimCYw', langCheck: true, novo: true },
  { name: 'FlexTV · CineFesta (oficial)', playlist: 'UU5MFT4piu-8q1tnTUgLSq6g', langCheck: true, novo: true },
  { name: 'LoveReel PT (oficial)', playlist: 'UUiG8GrCaPpZUTE6HlLzQVvg', langCheck: true, novo: true },
  { name: 'StardustTV (oficial)', playlist: 'UUHaddPbDDW8KMXLBR7yu80Q', langCheck: true, novo: true },
  { name: 'Clube de Skit Viciado', playlist: 'UUsDK_Ra9Ko-Shz1eLYxG_lQ', langCheck: true, novo: true },
  { name: 'Teatro Romântico (licenciado)', playlist: 'UUsTVaApBDR8H0NAEc-0Fusw', langCheck: true, novo: true },
  { name: 'Minicinema BR (licenciado)', playlist: 'UUY2rcPMArM3uQt92hY3LFCQ', langCheck: true, novo: true },
  { name: 'Vibra Amor (autorizado)', playlist: 'UUwjXlDvX-jUTOZhaqiSfjOg', langCheck: true, novo: true },
  { name: 'Alpha Supremo Drama (licenciado)', playlist: 'UUkKZD3iSx3o2kDpBwSz4lFg', langCheck: true, novo: true },
  { name: 'Lunar Tales (licenciado)', playlist: 'UUPbd5sF0KBpWF_MrurId-Rg', langCheck: true, novo: true },
  { name: 'Yuewen Drama Português', playlist: 'UUM_AZ-Eg0u8qRad651PFUQQ', langCheck: true, novo: true },
  { name: 'Aven TV Português', playlist: 'UUC42Bf61MVkrZMsrTj_R_UA', langCheck: true, novo: true },
]
const MIN_SEC = 40 * 60
// marcacao explicita de video feito com IA ("ia" solto e o verbo ir; "sobre IA" e tema, nao origem)
const AI_TITLE = /#(ia|ai|aidrama|aivideo|aishorts|aimovie|aiart)\b|(criad|gerad|feit)[oa]s? (por|com) (a )?IA|drama de IA|【[^】]*\b(IA|AI)\b[^】]*】|[[(](IA|AI)[\])]/i
const EXCLUDE = /\b(parte|part)\s*\d|\bep\.?\s*\d|epis[oó]dio\s*\d|cap[ií]tulo\s*\d|trailer|teaser|\b(1|2|3)\/\d\b|\[(1|2|3)\]/i

// Heuristica de idioma para o canal LatAm (mistura espanhol e portugues)
const PT = /\b(não|nao|você|voce|ela|ele|com|foi|até|ate|mas|para|seu|sua|dele|dela|casamento|noiva|esposa|marido|bilionário|bilionario|chefão|chefao|máfia|mafia|é|são|sao|ficou|virou|descobriu|salvou|dublado|completo|filha|filho|mãe|mae|pai|rei|rainha|dragão|dragao|vingança|vinganca|coração|coracao|amor)\b/gi
const ES = /\b(no|ella|él|el|con|fue|hasta|pero|para|su|boda|novia|esposa|esposo|marido|millonario|jefe|mafia|es|son|se|descubrió|salvó|doblado|completo|hija|hijo|madre|padre|rey|reina|dragón|venganza|corazón|amor|mujer|hombre|después|ahora|nadie|todos|siempre|nunca|cuando|quien|quién)\b/gi
const ES_STRONG = /[ñ]|\b(ella|él|hasta|después|mujer|hombre|nadie|siempre|cuando|quién|doblado|boda|jefe|millonario|hija|hijo|dragón|venganza|corazón|descubrió|salvó|está|están|fue|pero|con la|con el|de la|del)\b/i
const PT_STRONG = /[ãõç]|\b(não|você|ela|ele|até|mas|dele|dela|meu|minha|meus|marido|depois|demais|tarde|quando|todos|ninguém|sabia|dublado|noiva|casamento|chefão|bilionário|é|são|foi|ficou|virou|descobriu|salvou|filha|filho|mãe|dragão|vingança|coração|com a|com o|da|do)\b/i

function isPortuguese(title) {
  const t = title.normalize('NFC')
  if (/[Ѐ-ӿ一-鿿぀-ヿ]/.test(t)) return false // russo / chines / japones
  if (/(the|my|he|she|his|her|me|you|was|were|with|and|for|until|after|before|wife|husband|love|never)/i.test(t) && !PT_STRONG.test(t)) return false
  if (PT_STRONG.test(t) && !ES_STRONG.test(t)) return true
  if (ES_STRONG.test(t) && !PT_STRONG.test(t)) return false
  const pt = (t.match(PT) || []).length, es = (t.match(ES) || []).length
  return pt > es
}

const GENRES = [
  ['Fantasia', /drag[ãa]o|alfa|lobo|lobisomem|vampir|feiticeir|bruxa|deus|deusa|imortal|renasc|reencarn|mágic|magic|imperador|imperatriz|dinastia|antig|reino|príncipe|princesa|feras?\b|monstro|demônio|inferno|lúcifer|anjo|sobrenatural|poder oculto|cultiv/i],
  ['Ação', /máfia|mafia|chefão|assassin|atirador|soldado|guerra|general|marechal|comandante|matou|vingança|vinganca|guarda-costas|espião|piloto|lutador|combate|rei do submundo|cartel|gangue|inimigo/i],
  ['Suspense', /segredo|mentira|traição|traida|traído|sequestr|desapareceu|acusada|presa|prisão|golpe|impostor|trocada|falsa|sumiu|verdade|escondid/i],
  ['Romance', /ceo|bilion|milion|casamento|casou|noiva|noivo|esposa|marido|amor|apaixon|beijo|contrato|grávida|gravida|bebê|gêmeos|trigêmeos|filhos|herdeira|herdeiro|ex\b|divórcio|divorci|namorad/i],
]
const genreOf = (title) => (GENRES.find(([, re]) => re.test(title)) || ['Drama'])[0]

async function rest(path, init = {}) {
  const r = await fetch(`${DB}/${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers } })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw new Error(j?.message || r.status)
  return j
}

/** youtube_id de todos os episodios do catalogo (para nao duplicar). */
async function existingIds() {
  const ids = new Set()
  for (let from = 0; ; from += 1000) {
    const rows = await rest('episode?select=youtube_id&youtube_id=not.is.null', { headers: { Range: `${from}-${from + 999}` } })
    rows.forEach((r) => ids.add(r.youtube_id))
    if (rows.length < 1000) return ids
  }
}

/** Mesmo fluxo da Edge Function youtube-import, mas com a chave secreta. */
async function importVideos(p, req) {
  const plan = planImport(p, req, await existingIds())
  for (let i = 0; i < plan.series.length; i++) {
    const [s] = await rest('series', { method: 'POST', body: JSON.stringify(plan.series[i]) })
    await rest('episode', { method: 'POST', body: JSON.stringify(plan.episodes[i].map((e) => ({ ...e, series_id: s.id }))) })
  }
  return { created: plan.series, skipped: plan.skipped }
}

(async () => {
  if (!KEY) throw new Error('SUPABASE_SECRET_KEY nao esta no .env da raiz')
  const summary = []
  const pick = (x) => !ONLY || (ONLY === 'novo' ? x.novo : ONLY === 'mix' ? x.aiOnly : ONLY === 'ai' ? x.source === 'ai' : x.source !== 'ai')
  for (const src of SOURCES.filter(pick)) {
    console.log(`\n===== ${src.name}`)
    let p
    for (let tentativa = 1; !p; tentativa++) {
      try { p = await preview('https://www.youtube.com/playlist?list=' + src.playlist) } catch (e) {
        console.log(`   falhou (${e.message})${tentativa < 3 ? ', tentando de novo' : ', pulando o canal'}`)
        if (tentativa >= 3) break
        await new Promise((r) => setTimeout(r, 10000))
      }
    }
    if (!p) continue
    const all = p.videos
    const long = all.filter((v) => v.available && (v.durationSec || 0) >= MIN_SEC)
    const complete = long.filter((v) => !EXCLUDE.test(v.title) && (!src.aiOnly || AI_TITLE.test(v.title)))
    const pt = src.langCheck ? complete.filter((v) => isPortuguese(v.title)) : complete
    console.log(`videos: ${all.length} | >=40min: ${long.length} | completos: ${complete.length} | em português: ${pt.length}`)
    if (src.langCheck) complete.filter((v) => !isPortuguese(v.title)).slice(0, 5).forEach((v) => console.log('   [ES?] ' + v.title.slice(0, 80)))

    const byGenre = {}
    pt.forEach((v) => (byGenre[genreOf(v.title)] ||= []).push(v))
    for (const [genre, vids] of Object.entries(byGenre)) {
      console.log(`  ${genre}: ${vids.length}`)
      vids.slice(0, 3).forEach((v) => console.log(`     ${Math.round(v.durationSec / 60)}min  ${v.title.slice(0, 80)}`))
      if (DRY) continue
      const r = await importVideos(p, {
        url: 'https://www.youtube.com/playlist?list=' + src.playlist,
        mode: 'collection', genre, source: src.source || 'yt',
        tags: src.source === 'ai' ? 'ia, gerado por ia, drama completo' : 'dublado, drama completo',
        credit: `YouTube · canal ${src.name}`,
        episodes: vids.map((v) => ({ videoId: v.videoId })),
      })
      console.log(`     -> importadas ${r.created.length} séries (${r.skipped.length} puladas)`)
      summary.push({ source: src.name, genre, created: r.created.length, skipped: r.skipped.length })
    }
  }
  console.log('\n===== RESUMO'); console.table(summary)
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })

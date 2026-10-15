// Le playlists e videos publicos do YouTube sem chave de API, a partir do JSON (ytInitialData)
// embutido nas paginas. Roda no Deno (Edge Function) e no Node 22+ (tools/batch-import.ts).
// So sintaxe TS "apagavel" (sem enum/namespace), para o Node conseguir rodar direto.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
const INITIAL_DATA = /ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s
const PLAYER_RESPONSE = /ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*(?:var|<\/script>)/s
const API_KEY = /"INNERTUBE_API_KEY":"([^"]+)"/
const CLIENT_VERSION = /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/
const VIDEO_ID = /(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/
const PLAYLIST_ID = /[?&]list=([A-Za-z0-9_-]+)/
const DURATION = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/

export type Video = { videoId: string; title: string; durationSec: number | null; available: boolean; thumbnailUrl: string }
export type Preview = { kind: 'playlist' | 'video'; id: string; title: string; channel: string; videos: Video[] }

// deno-lint-ignore no-explicit-any
type Json = any

export class UserError extends Error {}

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/** Le uma URL de playlist ou de video e devolve os videos (com checagem de disponibilidade). */
export async function preview(url: string): Promise<Preview> {
  url = url.trim()
  const pl = url.match(PLAYLIST_ID)
  const vid = url.match(VIDEO_ID)
  let p: Preview
  if (pl && !pl[1].startsWith('RD')) p = await playlist(pl[1])
  else if (vid) p = await singleVideo(vid[1])
  else if (/^[A-Za-z0-9_-]{11}$/.test(url)) p = await singleVideo(url)
  else throw new UserError('URL do YouTube não reconhecida (use um link de playlist ou de vídeo)')
  return { ...p, videos: await checkAvailability(p.videos) }
}

// ---------- playlist ----------

async function playlist(playlistId: string): Promise<Preview> {
  const html = await get(`https://www.youtube.com/playlist?list=${playlistId}`)
  const data = extract(html, INITIAL_DATA, 'ytInitialData')
  let title: string = data?.metadata?.playlistMetadataRenderer?.title || ''
  if (!title) title = firstText(data?.header, 'pageTitle')

  // Nome do canal: a parte de metadados que tem link (commandRuns) para o canal
  let channel = ''
  outer: for (const parts of findAll(data?.header, 'metadataParts')) {
    for (const part of parts || []) {
      if (part?.text?.commandRuns) { channel = text(part.text); break outer }
    }
  }
  if (!channel) channel = firstText(data?.sidebar, 'ownerText')

  const videos: Video[] = []
  const seen = new Set<string>()
  collectVideos(data, videos, seen)

  // Paginacao (playlists com mais de 100 videos)
  const apiKey = html.match(API_KEY)?.[1]
  const clientVersion = html.match(CLIENT_VERSION)?.[1]
  let token = continuationToken(data)
  for (let guard = 0; token && apiKey && guard < 50; guard++) {
    const page = await browseContinuation(apiKey, clientVersion, token)
    collectVideos(page, videos, seen)
    token = continuationToken(page)
  }
  if (!videos.length) throw new UserError(`Playlist vazia, privada ou não encontrada: ${playlistId}`)
  return { kind: 'playlist', id: playlistId, title, channel, videos }
}

async function browseContinuation(apiKey: string, clientVersion: string | undefined, token: string): Promise<Json> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/json', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: clientVersion || '2.20240101.00.00', hl: 'pt', gl: 'BR' } },
      continuation: token,
    }),
  })
  if (!res.ok) throw new Error(`Falha ao paginar a playlist (${res.status})`)
  return res.json()
}

function collectVideos(root: Json, out: Video[], seen: Set<string>) {
  for (const r of findAll(root, 'playlistVideoRenderer')) {
    const id: string | undefined = r?.videoId
    if (!id || seen.has(id)) continue
    seen.add(id)
    const dur = r.lengthSeconds != null ? parseInt(r.lengthSeconds, 10) : null
    out.push({ videoId: id, title: text(r.title), durationSec: dur, available: r.isPlayable !== false, thumbnailUrl: thumb(id) })
  }
  for (const lv of findAll(root, 'lockupViewModel')) {
    if (lv?.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') continue
    const id: string | undefined = lv.contentId
    if (!id || seen.has(id)) continue
    seen.add(id)
    const title: string = lv.metadata?.lockupMetadataViewModel?.title?.content || ''
    let dur: number | null = null
    for (const badge of findAll(lv.contentImage, 'thumbnailBadgeViewModel')) {
      dur = parseDuration(badge?.text || '')
      if (dur != null) break
    }
    out.push({ videoId: id, title, durationSec: dur, available: true, thumbnailUrl: thumb(id) })
  }
}

/** Token de paginacao - layout antigo (continuationItemRenderer) e novo (continuationItemViewModel). */
function continuationToken(root: Json): string | null {
  for (const c of findAll(root, 'continuationCommand')) if (c?.token) return c.token
  return null
}

// ---------- video unico ----------

async function singleVideo(videoId: string): Promise<Preview> {
  const html = await get(`https://www.youtube.com/watch?v=${videoId}`)
  const player = extract(html, PLAYER_RESPONSE, 'ytInitialPlayerResponse')
  const details = player?.videoDetails || {}
  const status = player?.playabilityStatus || {}
  const ok = status.status === 'OK' && status.playableInEmbed !== false
  const dur = details.lengthSeconds != null ? parseInt(details.lengthSeconds, 10) : null
  const v: Video = { videoId, title: details.title || '', durationSec: dur, available: ok, thumbnailUrl: thumb(videoId) }
  return { kind: 'video', id: videoId, title: v.title, channel: details.author || '', videos: [v] }
}

// ---------- disponibilidade ----------

/** Confirma cada video via oEmbed (rapido e leve): 200 = publico e disponivel. 8 em paralelo. */
async function checkAvailability(videos: Video[]): Promise<Video[]> {
  const out = [...videos]
  let next = 0
  const worker = async () => {
    while (next < out.length) {
      const i = next++
      if (out[i].available) out[i] = { ...out[i], available: await oembedOk(out[i].videoId) }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  return out
}

async function oembedOk(videoId: string): Promise<boolean> {
  try {
    const u = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
    await res.body?.cancel()
    return res.status === 200
  } catch {
    return false
  }
}

// ---------- titulos ----------

const EP_NUMBER = /\b(?:EP|EPIS[OÓ]DIO|CAP[IÍ]TULO)\.?\s*0*(\d{1,3})\b/i
const BRACKETS = /[[【(（][^\]】)）]*[\]】)）]/g
const EMOJI = /[\p{So}\p{Cn}️‍]+/gu
const CJK_TITLE = /《([^》]+)》/
const CJK_CHARS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu
const TRAILING_CHANNEL = /\s*[|｜#].*$/

export function episodeNumber(title: string): number | null {
  const m = title.match(EP_NUMBER)
  return m ? parseInt(m[1], 10) : null
}

/** Remove tags entre colchetes, emojis e o sufixo "| Canal" dos titulos do YouTube. */
export function cleanTitle(raw: string | null | undefined): string {
  if (!raw) return ''
  const cjk = raw.match(CJK_TITLE)
  let t = cjk ? cjk[1] : raw
  t = t.replace(/[丨｜|].*$/, ' ') // segmentos apos separadores asiaticos
  t = t.replace(CJK_CHARS, ' ')
  t = t.replace(BRACKETS, ' ')
  t = t.replace(TRAILING_CHANNEL, '')
  t = t.replace(EMOJI, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  t = t.replace(/^[\s\-–|:]+|[\s\-–|:]+$/g, '')
  return t || raw.trim()
}

// ---------- util ----------

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' },
    signal: AbortSignal.timeout(30000),
  })
  if (res.status !== 200) throw new UserError(`YouTube respondeu ${res.status} para ${url}`)
  return res.text()
}

function extract(html: string, re: RegExp, name: string): Json {
  const m = html.match(re)
  if (!m) throw new UserError(`Não encontrei ${name} na página (vídeo/playlist inexistente ou página bloqueada)`)
  return JSON.parse(m[1])
}

/** Percorre a arvore e devolve todos os nos com a chave informada. */
function findAll(node: Json, key: string, out: Json[] = []): Json[] {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) { for (const c of node) findAll(c, key, out); return out }
  if (key in node) out.push(node[key])
  for (const v of Object.values(node)) findAll(v, key, out)
  return out
}

function firstText(node: Json, key: string): string {
  for (const n of findAll(node, key)) { const t = text(n); if (t) return t }
  return ''
}

/** Texto de um no do YouTube: {simpleText} | {runs:[{text}]} | {content} | string */
function text(n: Json): string {
  if (n == null) return ''
  if (typeof n === 'string') return n
  if (n.simpleText != null) return n.simpleText
  if (n.content != null) return n.content
  if (Array.isArray(n.runs)) return n.runs.map((r: Json) => r?.text || '').join('')
  return ''
}

function parseDuration(s: string): number | null {
  const m = s.trim().match(DURATION)
  if (!m) return null
  return (m[1] ? parseInt(m[1], 10) : 0) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
}

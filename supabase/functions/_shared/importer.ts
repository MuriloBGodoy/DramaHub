// Monta as series/episodios a partir de um preview do YouTube (mesma regra do antigo ImportService).
import { cleanTitle, episodeNumber, UserError } from './youtube.ts'
import type { Preview, Video } from './youtube.ts'

export type ImportRequest = {
  url: string
  /** "series": a playlist inteira vira UMA serie; "collection": cada video vira uma serie (drama completo) */
  mode?: string
  title?: string; synopsis?: string; genre?: string; tags?: string; coverUrl?: string; credit?: string
  featured?: boolean
  episodes?: { videoId: string; title?: string }[]
  /** filtros opcionais quando "episodes" nao e informado */
  minDurationSec?: number; titleRegex?: string; excludeRegex?: string
  /** "yt" (padrao) ou "ai" (canal de dramas gerados por IA) */
  source?: string
}

export type SeriesRow = {
  title: string; synopsis: string | null; cover_url: string | null; genre: string; tags: string | null
  source: string; credit: string; featured: boolean
}
export type EpisodeRow = { number: number; title: string; youtube_id: string; thumbnail_url: string; duration_sec: number | null }
export type Plan = { series: SeriesRow[]; episodes: EpisodeRow[][]; skipped: string[] }

const blank = (s?: string | null) => !s || !s.trim()

export function planImport(preview: Preview, req: ImportRequest, existingIds: Set<string>): Plan {
  const byId = new Map(preview.videos.map((v) => [v.videoId, v]))

  // Selecao: a lista enviada pelo cliente (na ordem dela) ou todos os videos da playlist
  let selected: Video[] = []
  const customTitles = new Map<string, string>()
  if (req.episodes?.length) {
    for (const ie of req.episodes) {
      const v = byId.get(ie.videoId)
      if (!v) continue
      selected.push(v)
      if (!blank(ie.title)) customTitles.set(v.videoId, ie.title!.trim())
    }
  } else {
    const inc = blank(req.titleRegex) ? null : new RegExp(req.titleRegex!, 'i')
    const exc = blank(req.excludeRegex) ? null : new RegExp(req.excludeRegex!, 'i')
    selected = preview.videos.filter((v) =>
      (req.minDurationSec == null || (v.durationSec ?? 0) >= req.minDurationSec) &&
      (!inc || inc.test(v.title)) && (!exc || !exc.test(v.title)))
  }

  const skipped: string[] = []
  let ok: Video[] = []
  for (const v of selected) {
    if (v.available) ok.push(v)
    else skipped.push(`${v.videoId} - ${v.title} (indisponivel)`)
  }
  if (!ok.length) throw new UserError('Nenhum vídeo disponível para importar (confira os filtros)')

  // Nao duplicar: ignora videos que ja estao no catalogo
  const fresh: Video[] = []
  for (const v of ok) {
    if (existingIds.has(v.videoId)) skipped.push(`${v.videoId} - ${v.title} (ja importado)`)
    else fresh.push(v)
  }
  ok = fresh
  if (!ok.length) return { series: [], episodes: [], skipped }

  const credit = blank(req.credit) ? `YouTube · canal ${preview.channel}` : req.credit!
  const collection = req.mode?.toLowerCase() === 'collection'
  const newSeries = (title: string, cover: string): SeriesRow => ({
    title, synopsis: req.synopsis || null,
    cover_url: blank(req.coverUrl) || collection ? cover : req.coverUrl!,
    genre: blank(req.genre) ? 'Drama' : req.genre!, tags: blank(req.tags) ? null : req.tags!,
    source: blank(req.source) ? 'yt' : req.source!, credit, featured: !!req.featured,
  })
  const newEpisode = (number: number, title: string, v: Video): EpisodeRow =>
    ({ number, title, youtube_id: v.videoId, thumbnail_url: v.thumbnailUrl, duration_sec: v.durationSec })

  if (collection) {
    return {
      series: ok.map((v) => newSeries(cleanTitle(v.title), v.thumbnailUrl)),
      episodes: ok.map((v) => [newEpisode(1, 'Drama completo', v)]),
      skipped,
    }
  }

  const title = blank(req.title) ? cleanTitle(preview.title) : req.title!.trim()
  // Se todos os videos tem "EP N" (distintos) no titulo, usamos essa numeracao e ordem; senao, sequencial
  const nums = ok.map((v) => episodeNumber(v.title))
  const useEp = nums.every((n) => n != null) && new Set(nums).size === ok.length
  const ordered = ok.map((v, i) => ({ v, n: nums[i] }))
  if (useEp) ordered.sort((a, b) => a.n! - b.n!)
  const eps = ordered.map(({ v, n }, i) => {
    const number = useEp ? n! : i + 1
    return newEpisode(number, customTitles.get(v.videoId) ?? (useEp ? `Episódio ${number}` : cleanTitle(v.title)), v)
  })
  return { series: [newSeries(title, ok[0].thumbnailUrl)], episodes: [eps], skipped }
}

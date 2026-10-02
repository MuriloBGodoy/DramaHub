// Divide os episódios em "EPs" de ~10 min, só no frontend, a partir de durationSec.
// Os dramas do YouTube são um vídeo único de 40 min a 2h40; um episódio curto (< 15 min) continua sendo 1 EP.
// Progresso continua salvo por episódio real (positionSec relativo ao início do episódio).

export const EP_TARGET_SEC = 630
const SPLIT_FROM_SEC = 15 * 60

/** Duração útil do episódio (segmento start..end, se houver). */
export const epDuration = (ep) => {
  if (ep.durationSec) return ep.durationSec
  if (ep.endSec) return ep.endSec - (ep.startSec || 0)
  return 0
}

/** Quantos EPs um episódio real vira. */
export const partsOf = (ep) => {
  const d = epDuration(ep)
  return d >= SPLIT_FROM_SEC ? Math.max(2, Math.round(d / EP_TARGET_SEC)) : 1
}

/**
 * Lista plana de EPs da série: [{ n, episode, part, from, to }] com from/to em segundos relativos ao episódio.
 * Episódio sem duração conhecida vira 1 EP com to = null.
 */
export function buildEps(episodes) {
  const out = []
  for (const episode of episodes) {
    const d = epDuration(episode)
    const parts = partsOf(episode)
    const len = d ? Math.ceil(d / parts) : null
    for (let k = 0; k < parts; k++) {
      out.push({ n: out.length + 1, episode, part: k, from: len ? k * len : 0, to: len ? Math.min(d, (k + 1) * len) : null })
    }
  }
  return out
}

/** EP que contém a posição `pos` (segundos relativos) dentro do episódio real `episodeId`. */
export const epAt = (eps, episodeId, pos) => {
  const mine = eps.filter((e) => e.episode.id === episodeId)
  return mine.find((e) => e.to == null || pos < e.to) || mine[mine.length - 1]
}

/** Total da série em segundos. */
export const totalDuration = (episodes) => episodes.reduce((a, e) => a + epDuration(e), 0)

/** "1h 24min" / "38 min". */
export const fmtDur = (sec) => {
  sec = Math.max(0, Math.round(sec || 0))
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${Math.max(1, m)} min`
}

/** "faltam 38 min" para um progresso (posição relativa) num episódio. */
export const timeLeft = (durationSec, positionSec) => {
  if (!durationSec) return ''
  const m = Math.max(1, Math.round((durationSec - positionSec) / 60))
  return `faltam ${m} min`
}

/** Para "continuar assistindo": EP atual, total de EPs e texto de tempo restante de um ProgressDto. */
export function progressInfo(p) {
  const ep = p.episode
  const d = epDuration(ep)
  const parts = partsOf(ep)
  const len = d ? Math.ceil(d / parts) : 0
  const idx = p.completed ? parts - 1 : len ? Math.min(parts - 1, Math.floor(p.positionSec / len)) : 0
  const pct = p.completed ? 100 : d ? Math.min(100, (p.positionSec / d) * 100) : 0
  return {
    // numeração local ao episódio quando ele é dividido; senão, o número do episódio real
    ep: parts > 1 ? idx + 1 : p.episodeNumber,
    of: parts > 1 ? parts : null,
    pct,
    left: p.completed ? 'concluído' : p.positionSec > 5 ? timeLeft(d, p.positionSec) : 'não começou',
  }
}

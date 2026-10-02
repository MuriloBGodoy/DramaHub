import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { VerticalFrame } from '../components/Cover'
import SeriesCard from '../components/SeriesCard'
import { BackIcon, CheckIcon, HeartIcon, PlayIcon } from '../components/Icons'
import { buildEps, epAt, epDuration, fmtDur, totalDuration } from '../eps'
import { ytIdFrom } from '../yt'

/** Roteiro salvo (JSON do Roteirista IA) em texto legível. */
function scriptToText(raw) {
  try {
    const j = JSON.parse(raw)
    return (j.episodes || []).map((e) => {
      const prompts = (e.scenes || []).map((sc, i) => `  ${i + 1}. ${sc.videoPrompt}`).join('\n')
      return [`EP ${e.number} · ${e.title}`, e.summary || '', '', e.script || '', '', 'PROMPTS:', prompts].join('\n')
    }).join('\n\n————————\n\n')
  } catch {
    return raw
  }
}

const SOURCE = { ai: 'Feito com IA', yt: 'YouTube oficial', cc: 'Creative Commons', own: 'Produção própria' }
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
/** Link para um EP: abre o episódio real já no início do trecho. */
const epLink = (e) => `/assistir/${e.episode.id}${e.from > 0 ? `?t=${Math.floor(e.from)}` : ''}`

export default function SeriesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [series, setSeries] = useState(null)
  const [progress, setProgress] = useState([])
  const [fav, setFav] = useState(false)
  const [more, setMore] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api.seriesDetail(id).then((s) => {
      setSeries(s)
      api.series({ genre: s.genre }).then((l) => setMore(l.filter((x) => x.id !== s.id).slice(0, 12))).catch(() => {})
    }).catch((e) => setError(e.message))
    api.seriesProgress(id).then(setProgress).catch(() => {})
    api.isFavorite(id).then((r) => setFav(r.favorite)).catch(() => {})
  }, [id])

  if (error) {
    return (
      <div className="state">
        <h3>Não deu para abrir esta série</h3>
        <p>{error}</p>
        <button className="btn" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    )
  }
  if (!series) return <div className="sp"><div className="sp-bg skeleton" /></div>

  const eps = buildEps(series.episodes)
  const progById = Object.fromEntries(progress.map((p) => [p.episodeId, p]))
  const isDone = (e) => {
    const p = progById[e.episode.id]
    return !!p && (p.completed || (e.to != null && p.positionSec >= e.to - 5))
  }

  // EP do botão principal: onde parou no último episódio tocado; se ele terminou, o próximo episódio
  const last = progress.length ? progress.reduce((a, b) => (a.episodeNumber > b.episodeNumber ? a : b)) : null
  let cur = eps[0]
  if (last) {
    if (last.completed) {
      const nextReal = series.episodes.find((e) => e.number > last.episodeNumber)
      cur = nextReal ? eps.find((e) => e.episode.id === nextReal.id) : eps[0]
    } else {
      cur = epAt(eps, last.episodeId, last.positionSec) || eps[0]
    }
  }
  const started = last && !last.completed && last.positionSec > 5 && cur?.episode.id === last.episodeId
  const total = totalDuration(series.episodes)
  let watched = 0
  if (started) {
    for (const e of series.episodes) {
      if (e.id === last.episodeId) { watched += last.positionSec; break }
      watched += epDuration(e)
    }
  }
  const split = eps.length > series.episodes.length
  const yt = series.episodes[0]?.youtubeId || ytIdFrom(series.coverUrl)
  const tags = series.tags.filter((t) => t.toLowerCase() !== (series.genre || '').toLowerCase())

  const toggleFav = () => api.toggleFavorite(id).then((r) => setFav(r.favorite)).catch(() => {})

  return (
    <div className="sp">
      <div className="sp-bg">
        <VerticalFrame key={yt || series.id} youtubeId={yt} fallback={series.coverUrl} title={series.title} />
        <button className="ib" onClick={() => navigate(-1)} aria-label="Voltar"><BackIcon /></button>
      </div>

      <div className="sp-body">
        <h1>{series.title}</h1>
        <div className="tags">
          {series.genre && <span>{series.genre}</span>}
          {tags.map((t) => <span key={t}>{cap(t)}</span>)}
          {eps.length > 0 && <span>{eps.length} {eps.length === 1 ? 'EP' : 'EPs'}{total ? ` · ${fmtDur(total)}` : ''}</span>}
        </div>

        {series.synopsis && <p className="synopsis">{series.synopsis}</p>}

        <div className="sub-h">
          <h2>Episódios</h2>
          {started && <span>EP {cur.n} de {eps.length}</span>}
        </div>
        {eps.length === 0 ? (
          <p className="hint">Ainda sem episódios.</p>
        ) : (
          <div className="epg">
            {eps.map((e) => {
              const done = isDone(e)
              const isCur = started && e === cur
              return (
                <Link key={e.n} to={epLink(e)} className={`ep ${done ? 'done' : ''} ${isCur ? 'cur' : ''}`} aria-label={`EP ${e.n}${done ? ', visto' : ''}${isCur ? ', você parou aqui' : ''}`}>
                  {e.n}
                  {done && <span className="ck"><CheckIcon /></span>}
                  {isCur && <span className="eq"><i /><i /><i /></span>}
                </Link>
              )
            })}
          </div>
        )}
        {split && <p className="hint">Cada EP é um trecho de ~10 min do drama completo.</p>}

        {isAdmin && series.script && (
          <details className="script-saved">
            <summary>Roteiro gerado (só admin vê)</summary>
            <pre>{scriptToText(series.script)}</pre>
          </details>
        )}
        {(series.credit || SOURCE[series.source]) && <p className="credit">{series.credit || SOURCE[series.source]}</p>}
      </div>

      {more.length > 0 && (
        <section className="row">
          <div className="row-h"><h2>Mais {series.genre}</h2></div>
          <div className="sc">{more.map((s) => <SeriesCard key={s.id} series={s} />)}</div>
        </section>
      )}
      <div className="endpad big" />

      {cur && (
        <div className="sticky">
          <Link className="btn wide" to={started ? `/assistir/${cur.episode.id}` : epLink(cur)}>
            <PlayIcon />{started ? 'Continuar' : 'Assistir'} EP {cur.n}
            {started && total > 0 && <small>· faltam {Math.max(1, Math.round((total - watched) / 60))} min</small>}
          </Link>
          <button className={`circ ${fav ? 'on' : ''}`} onClick={toggleFav} aria-label={fav ? 'Remover dos salvos' : 'Salvar'} aria-pressed={fav}>
            <HeartIcon filled={fav} />
          </button>
        </div>
      )}
    </div>
  )
}

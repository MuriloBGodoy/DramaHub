import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, fmtTime } from '../api'
import { useAuth } from '../auth'
import Cover from '../components/Cover'
import { BackIcon, HeartIcon, PlayIcon, CheckIcon } from '../components/Icons'

/** Roteiro salvo (JSON do Roteirista IA) em texto legivel. */
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

export default function SeriesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [series, setSeries] = useState(null)
  const [progress, setProgress] = useState([])
  const [fav, setFav] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.seriesDetail(id).then(setSeries).catch((e) => setError(e.message))
    api.seriesProgress(id).then(setProgress).catch(() => {})
    api.isFavorite(id).then((r) => setFav(r.favorite)).catch(() => {})
  }, [id])

  if (error) return <div className="page"><div className="notice err">{error}</div></div>
  if (!series) return <div className="series-hero skeleton" />

  const progById = Object.fromEntries(progress.map((p) => [p.episodeId, p]))
  // Episodio para o botao principal: o ultimo tocado e nao concluido; senao, o proximo apos o ultimo concluido; senao, o 1.
  const lastTouched = progress.length
    ? progress.reduce((a, b) => (a.episodeNumber > b.episodeNumber ? a : b))
    : null
  let startEp = series.episodes[0]
  if (lastTouched) {
    startEp = lastTouched.completed
      ? series.episodes.find((e) => e.number === lastTouched.episodeNumber + 1) || series.episodes[0]
      : series.episodes.find((e) => e.id === lastTouched.episodeId)
  }

  const toggleFav = () => api.toggleFavorite(id).then((r) => setFav(r.favorite))

  return (
    <div>
      <div className="series-hero">
        <button className="back-btn" onClick={() => navigate(-1)}><BackIcon /></button>
        <Cover src={series.coverUrl} title={series.title} />
        <div className="hero-fade" />
      </div>

      <div className="series-body">
        <h1>{series.title}</h1>
        <div className="meta">
          <span>{series.genre}</span>
          <span>{series.episodes.length} episódios</span>
          <span>{series.source === 'ai' ? '✨ Gerado por IA' : series.source === 'yt' ? '▶ YouTube oficial' : 'Creative Commons'}</span>
        </div>
        {series.tags.length > 0 && (
          <div className="tags">{series.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
        )}

        <div className="hero-actions" style={{ marginBottom: 18 }}>
          {startEp && (
            <button className="btn btn-primary" onClick={() => navigate(`/assistir/${startEp.id}`)}>
              <PlayIcon /> {lastTouched ? `Continuar EP ${startEp.number}` : 'Assistir EP 1'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={toggleFav} style={fav ? { color: 'var(--accent)' } : undefined}>
            <HeartIcon filled={fav} /> {fav ? 'Salvo' : 'Salvar'}
          </button>
        </div>

        <p className="synopsis">{series.synopsis}</p>

        <section className="row">
          <div className="row-head"><h3>Episódios</h3></div>
          {series.episodes.length === 0 && <div className="empty">Ainda sem episódios.</div>}
          <div className="ep-grid">
            {series.episodes.map((e) => {
              const p = progById[e.id]
              const pct = p ? (p.completed ? 100 : Math.min(100, (p.positionSec / (e.durationSec || 1)) * 100)) : 0
              return (
                <button key={e.id} className="ep-card" onClick={() => navigate(`/assistir/${e.id}`)}>
                  <div className="ep-thumb">
                    <Cover src={e.thumbnailUrl || series.coverUrl} title={`EP ${e.number}`} />
                    <span className="num">EP {e.number}</span>
                    {e.durationSec && <span className="dur">{fmtTime(e.durationSec)}</span>}
                    {p?.completed && <span className="done"><CheckIcon /></span>}
                    {pct > 0 && <div className="progress-bar"><i style={{ width: `${pct}%` }} /></div>}
                  </div>
                  <div className="ep-title">{e.title}</div>
                </button>
              )
            })}
          </div>
        </section>

        {isAdmin && series.script && (
          <details className="script-saved">
            <summary>📝 Roteiro gerado (só admin vê)</summary>
            <pre>{scriptToText(series.script)}</pre>
          </details>
        )}
        {series.credit && <div className="credit">{series.credit}</div>}
      </div>
    </div>
  )
}

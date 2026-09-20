import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Row } from '../components/SeriesCard'
import Cover from '../components/Cover'
import { PlayIcon } from '../components/Icons'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [series, setSeries] = useState(null)
  const [cont, setCont] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api.series().then(setSeries).catch((e) => setError(e.message))
    api.continueWatching().then(setCont).catch(() => {})
  }, [])

  const featured = series?.find((s) => s.featured) || series?.[0]
  const byGenre = {}
  series?.forEach((s) => { (byGenre[s.genre || 'Outros'] ||= []).push(s) })

  return (
    <>
      <header className="topbar">
        <div className="brand">Drama<span>Hub</span></div>
        <Link className="avatar" title="Conta" to="/conta">{user.avatar}</Link>
      </header>

      <div className="page" style={{ paddingTop: 0 }}>
        {error && <div className="notice err">Não consegui falar com o servidor: {error}. O backend está rodando?</div>}
        {!series && !error && <div className="hero skeleton" />}

        {featured && (
          <div className="hero">
            <Cover src={featured.coverUrl} title={featured.title} />
            <div className="hero-fade" />
            <div className="hero-body">
              <div className="card-sub" style={{ marginBottom: 6, color: 'var(--accent)', fontWeight: 700 }}>
                EM DESTAQUE · {featured.genre}
              </div>
              <h2>{featured.title}</h2>
              <p>{featured.synopsis}</p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => navigate(`/series/${featured.id}`)}>
                  <PlayIcon /> Assistir
                </button>
                <Link className="btn btn-ghost" to={`/series/${featured.id}`}>Detalhes</Link>
              </div>
            </div>
          </div>
        )}

        {cont.length > 0 && (
          <section className="row">
            <div className="row-head"><h3>Continuar assistindo</h3></div>
            <div className="scroller">
              {cont.map(({ series: s, progress: p }) => {
                const dur = p.episode.durationSec || 1
                const pct = p.completed ? 100 : Math.min(100, (p.positionSec / dur) * 100)
                return (
                  <Link key={s.id} to={`/assistir/${p.episodeId}`} className="card cw-card">
                    <div className="card-cover cw-cover">
                      <Cover src={p.episode.thumbnailUrl || s.coverUrl} title={s.title} />
                      <span className="ep">EP {p.episodeNumber}{p.completed ? ' · concluído' : ''}</span>
                      <div className="progress-bar"><i style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div className="card-title">{s.title}</div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {series && <Row title="✨ Feitos com IA" items={series.filter((s) => s.source === 'ai').slice(0, 30)} to="/buscar?source=ai" />}
        {series && <Row title="Novidades" items={series.slice(0, 10)} to="/buscar" />}
        {Object.entries(byGenre).map(([g, items]) => (
          <Row key={g} title={`${g} · ${items.length}`} items={items.slice(0, 30)} to={`/buscar?genre=${encodeURIComponent(g)}`} />
        ))}

        {series?.length === 0 && (
          <div className="empty">
            Nenhum drama ainda. Vá no <Link to="/estudio" style={{ color: 'var(--accent)' }}>Estúdio</Link> e cadastre o primeiro!
          </div>
        )}
      </div>
    </>
  )
}

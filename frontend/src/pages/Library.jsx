import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import SeriesCard from '../components/SeriesCard'
import Cover from '../components/Cover'

export default function Library() {
  const [favs, setFavs] = useState(null)
  const [cont, setCont] = useState([])

  useEffect(() => {
    api.favorites().then(setFavs).catch(() => setFavs([]))
    api.continueWatching().then(setCont).catch(() => {})
  }, [])

  return (
    <div className="page">
      <h1 className="page-title">Minha lista</h1>

      {cont.length > 0 && (
        <section className="row" style={{ marginTop: 0 }}>
          <div className="row-head"><h3>Histórico</h3></div>
          <div className="scroller">
            {cont.map(({ series: s, progress: p }) => (
              <Link key={s.id} to={`/assistir/${p.episodeId}`} className="card cw-card">
                <div className="card-cover cw-cover">
                  <Cover src={p.episode.thumbnailUrl || s.coverUrl} title={s.title} />
                  <span className="ep">EP {p.episodeNumber}</span>
                </div>
                <div className="card-title">{s.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="row">
        <div className="row-head"><h3>Favoritos</h3></div>
        {favs === null ? null : favs.length === 0 ? (
          <div className="empty">Toque no ❤️ em uma série para salvar aqui.</div>
        ) : (
          <div className="grid">{favs.map((s) => <SeriesCard key={s.id} series={s} />)}</div>
        )}
      </section>
    </div>
  )
}

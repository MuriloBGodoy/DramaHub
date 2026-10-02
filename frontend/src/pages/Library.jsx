import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import SeriesCard from '../components/SeriesCard'
import Cover from '../components/Cover'
import { FeedIcon, HeartIcon } from '../components/Icons'
import { progressInfo } from '../eps'

export default function Library() {
  const [favs, setFavs] = useState(null)
  const [cont, setCont] = useState([])

  useEffect(() => {
    api.favorites().then(setFavs).catch(() => setFavs([]))
    api.continueWatching().then(setCont).catch(() => {})
  }, [])

  return (
    <div className="page">
      <h1 className="page-title">Salvos</h1>

      {cont.length > 0 && (
        <section className="row flush">
          <div className="row-h"><h2>Histórico</h2></div>
          <div className="sc">
            {cont.map(({ series: s, progress: p }) => {
              const info = progressInfo(p)
              return (
                <Link key={s.id} to={`/assistir/${p.episodeId}`} className="lc">
                  <div className="th"><Cover src={p.episode.thumbnailUrl || s.coverUrl} title={s.title} /></div>
                  <div className="pb"><i style={{ width: `${Math.max(2, info.pct)}%` }} /></div>
                  <div className="s"><b>EP {info.ep}{info.of ? `/${info.of}` : ''}</b> · {info.left}</div>
                  <div className="t">{s.title}</div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="row flush">
        <div className="row-h"><h2>Salvos {favs?.length > 0 && <small>{favs.length}</small>}</h2></div>
        {favs === null ? (
          <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="pc"><div className="po skeleton" /></div>)}</div>
        ) : favs.length === 0 ? (
          <div className="state">
            <span className="state-ic"><HeartIcon /></span>
            <h3>Nenhum drama salvo</h3>
            <p>Toque no coração durante um episódio, na página da série ou no feed <b>Para você</b> e ele aparece aqui.</p>
            <Link className="btn" to="/feed"><FeedIcon />Abrir Para você</Link>
          </div>
        ) : (
          <div className="grid">{favs.map((s) => <SeriesCard key={s.id} series={s} />)}</div>
        )}
      </section>
    </div>
  )
}

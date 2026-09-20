import { Link } from 'react-router-dom'
import Cover from './Cover'

export default function SeriesCard({ series }) {
  return (
    <Link to={`/series/${series.id}`} className="card">
      <div className="card-cover">
        <Cover src={series.coverUrl} title={series.title} />
        {series.source === 'ai' && <span className="badge ai">IA</span>}
        {series.source === 'yt' && <span className="badge">YouTube</span>}
      </div>
      <div className="card-title">{series.title}</div>
      <div className="card-sub">{series.episodeCount} ep · {series.genre}</div>
    </Link>
  )
}

export function Row({ title, items, to }) {
  if (!items?.length) return null
  return (
    <section className="row">
      <div className="row-head">
        <h3>{title}</h3>
        {to && <Link to={to}>Ver tudo</Link>}
      </div>
      <div className="scroller">
        {items.map((s) => <SeriesCard key={s.id} series={s} />)}
      </div>
    </section>
  )
}

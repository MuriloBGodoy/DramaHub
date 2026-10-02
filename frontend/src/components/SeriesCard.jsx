import { Link } from 'react-router-dom'
import Cover from './Cover'
import { SparkIcon, ChevronIcon } from './Icons'

/** Pôster 2:3 (recorte central da arte do canal). */
export default function SeriesCard({ series }) {
  return (
    <Link to={`/series/${series.id}`} className="pc">
      <div className="po">
        <Cover src={series.coverUrl} title={series.title} />
        {series.source === 'ai' && <span className="ia"><SparkIcon />IA</span>}
        {series.episodeCount > 1 && <span className="eps">{series.episodeCount} EPs</span>}
      </div>
      <div className="t">{series.title}</div>
      <div className="s">{series.genre}</div>
    </Link>
  )
}

export function Row({ title, items, to }) {
  if (!items?.length) return null
  return (
    <section className="row">
      <div className="row-h">
        <h2>{title}</h2>
        {to && <Link to={to}>Ver tudo<ChevronIcon /></Link>}
      </div>
      <div className="sc">
        {items.map((s) => <SeriesCard key={s.id} series={s} />)}
      </div>
    </section>
  )
}

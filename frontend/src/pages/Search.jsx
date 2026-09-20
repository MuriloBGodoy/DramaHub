import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import SeriesCard from '../components/SeriesCard'
import { SearchIcon } from '../components/Icons'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const genre = params.get('genre') || ''
  const source = params.get('source') || ''
  const [q, setQ] = useState(params.get('q') || '')
  const [genres, setGenres] = useState([])
  const [results, setResults] = useState(null)

  useEffect(() => { api.genres().then(setGenres).catch(() => {}) }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      api.series({ genre, source, q }).then(setResults).catch(() => setResults([]))
    }, 200)
    return () => clearTimeout(t)
  }, [genre, source, q])

  const setGenre = (g) => setParams({ ...(g ? { genre: g } : {}), ...(source ? { source } : {}) })
  const toggleSource = () => setParams({ ...(genre ? { genre } : {}), ...(source ? {} : { source: 'ai' }) })

  return (
    <div className="page">
      <h1 className="page-title">Buscar</h1>
      <div className="search-box">
        <SearchIcon />
        <input
          placeholder="Título, tema, tag..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div className="chips">
        <button className={`chip ${source ? 'active' : ''}`} onClick={toggleSource}>✨ IA</button>
        <button className={`chip ${!genre ? 'active' : ''}`} onClick={() => setGenre('')}>Todos</button>
        {genres.map((g) => (
          <button key={g} className={`chip ${genre === g ? 'active' : ''}`} onClick={() => setGenre(g)}>{g}</button>
        ))}
      </div>

      {results === null ? (
        <div className="grid">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '2/3' }} />)}</div>
      ) : results.length === 0 ? (
        <div className="empty">Nada encontrado.</div>
      ) : (
        <div className="grid">{results.map((s) => <SeriesCard key={s.id} series={s} />)}</div>
      )}
    </div>
  )
}

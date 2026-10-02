import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import SeriesCard from '../components/SeriesCard'
import { SearchIcon, SparkIcon } from '../components/Icons'

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
      <label className="search-box">
        <SearchIcon />
        <input
          type="search"
          enterKeyHint="search"
          aria-label="Buscar dramas"
          placeholder="Título, tema, tag..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </label>
      <div className="chips">
        <button className={`chip ${!genre ? 'on' : ''}`} onClick={() => setGenre('')}>Todos</button>
        {genres.map((g) => (
          <button key={g} className={`chip ${genre === g ? 'on' : ''}`} onClick={() => setGenre(g)}>{g}</button>
        ))}
        <button className={`chip ${source ? 'on' : ''}`} onClick={toggleSource} aria-pressed={!!source}><SparkIcon />Feitos com IA</button>
      </div>

      {results === null ? (
        <div className="grid">{[...Array(6)].map((_, i) => <div key={i} className="pc"><div className="po skeleton" /></div>)}</div>
      ) : results.length === 0 ? (
        <div className="state">
          <h3>Nada encontrado</h3>
          <p>{q ? <>Nenhum drama com “{q}”{genre ? ` em ${genre}` : ''}. Tente outra palavra ou tire o filtro.</> : 'Nenhum drama neste filtro.'}</p>
        </div>
      ) : (
        <>
          <p className="count">{results.length} {results.length === 1 ? 'drama' : 'dramas'}</p>
          <div className="grid">{results.map((s) => <SeriesCard key={s.id} series={s} />)}</div>
        </>
      )}
    </div>
  )
}

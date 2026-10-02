import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import SeriesCard, { Row } from '../components/SeriesCard'
import Cover, { VerticalFrame } from '../components/Cover'
import { PlayIcon, SearchIcon, SparkIcon } from '../components/Icons'
import { buildEps, fmtDur, progressInfo, totalDuration } from '../eps'
import { ytIdFrom } from '../yt'

const AI_TAB = '__ai'

export default function Home() {
  const { isAdmin } = useAuth()
  const [series, setSeries] = useState(null)
  const [cont, setCont] = useState([])
  const [hero, setHero] = useState([])
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('')

  useEffect(() => {
    api.series().then(setSeries).catch((e) => setError(e.message))
    api.continueWatching().then(setCont).catch(() => {})
  }, [])

  // Carrossel: as séries em destaque com o detalhe (duração e 1º episódio vêm só do detalhe)
  const featured = useMemo(() => {
    if (!series) return []
    const f = series.filter((s) => s.featured)
    return (f.length ? f : series).slice(0, 6)
  }, [series])

  useEffect(() => {
    if (!featured.length) return
    let off = false
    Promise.all(featured.map((s) => api.seriesDetail(s.id).catch(() => null)))
      .then((list) => { if (!off) setHero(list.filter((d) => d && d.episodes.length)) })
    return () => { off = true }
  }, [featured])

  const byGenre = useMemo(() => {
    const g = {}
    series?.forEach((s) => { (g[s.genre || 'Outros'] ||= []).push(s) })
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length)
  }, [series])

  const ai = series?.filter((s) => s.source === 'ai') || []
  const tabs = [['', 'Para você'], ...byGenre.filter(([, l]) => l.length > 1).map(([g]) => [g, g]), ...(ai.length ? [[AI_TAB, 'IA']] : [])]
  const filtered = tab === AI_TAB ? ai : tab ? series?.filter((s) => (s.genre || 'Outros') === tab) : null

  return (
    <div className="home">
      <div className="tabs">
        <div className="tl" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k || 'pv'} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <Link className="ib plain" to="/buscar" aria-label="Buscar"><SearchIcon /></Link>
      </div>

      {error && (
        <div className="state">
          <h3>Não consegui falar com o servidor</h3>
          <p>{error}. Confira se o backend está rodando e tente de novo.</p>
          <button className="btn" onClick={() => window.location.reload()}>Tentar de novo</button>
        </div>
      )}

      {!series && !error && (
        <>
          <div className="car"><div className="hc skeleton" /><div className="hc skeleton" /></div>
          <div className="row"><div className="sc">{[0, 1, 2].map((i) => <div key={i} className="lc"><div className="th skeleton" /></div>)}</div></div>
        </>
      )}

      {series?.length === 0 && (
        <div className="state">
          <h3>Nenhum drama ainda</h3>
          <p>O catálogo está vazio.{isAdmin && <> Cadastre ou importe o primeiro no <Link to="/estudio" className="u">Estúdio</Link>.</>}</p>
        </div>
      )}

      {filtered && (
        <section className="row">
          <div className="row-h"><h2>{tab === AI_TAB ? 'Feitos com IA' : tab} <small>{filtered.length}</small></h2></div>
          <div className="grid">{filtered.map((s) => <SeriesCard key={s.id} series={s} />)}</div>
        </section>
      )}

      {series?.length > 0 && !filtered && (
        <>
          {hero.length > 0 && (
            <div className="car">
              {hero.map((d) => {
                const eps = buildEps(d.episodes)
                const yt = d.episodes[0].youtubeId || ytIdFrom(d.coverUrl)
                return (
                  <div key={d.id} className="hc">
                    <Link to={`/series/${d.id}`} className="hc-link" aria-label={d.title}>
                      <VerticalFrame key={yt || d.id} youtubeId={yt} fallback={d.coverUrl} title={d.title} />
                    </Link>
                    <div className="hc-i">
                      <span className="meta">{d.genre} · {eps.length} {eps.length === 1 ? 'EP' : 'EPs'} · {fmtDur(totalDuration(d.episodes))}</span>
                      <Link to={`/series/${d.id}`}><h3>{d.title}</h3></Link>
                      <Link to={`/assistir/${d.episodes[0].id}`} className="btn"><PlayIcon />Assistir EP 1</Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {cont.length > 0 && (
            <section className="row">
              <div className="row-h"><h2>Continuar assistindo</h2></div>
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

          {ai.length > 0 && <Row title={<><SparkIcon />Feitos com IA</>} items={ai.slice(0, 20)} to="/buscar?source=ai" />}
          {byGenre.map(([g, items]) => (
            <Row key={g} title={g} items={items.slice(0, 20)} to={`/buscar?genre=${encodeURIComponent(g)}`} />
          ))}
        </>
      )}
      <div className="endpad" />
    </div>
  )
}

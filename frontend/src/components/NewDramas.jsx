import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// Aviso de dramas novos: aparece ao abrir o app quando entrou drama no catálogo desde o último "OK"
// deste navegador. Fica aparecendo (a cada abertura) até a pessoa aceitar; depois só volta com novidades.
// Mostra as capas e em quais seções da Início eles estão.
const KEY = 'dramahub.novidades.vistoAte'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const save = (v) => { try { localStorage.setItem(KEY, v) } catch { /* modo privado */ } }

const where = (s) => [s.source === 'ai' ? 'Feitos com IA' : null, s.genre].filter(Boolean).join(' · ')

export default function NewDramas() {
  const [news, setNews] = useState(null) // { total, items, sections, until }
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const latest = await api.latestSeriesAt()
        if (!latest) return
        const seen = read()
        // primeira visita: tudo é "novo", então só marca a partir de agora
        if (!seen) return save(latest)
        if (new Date(latest) <= new Date(seen)) return
        const r = await api.newSeriesSince(seen)
        if (alive && r.total > 0) setNews({ ...r, until: latest })
      } catch { /* sem rede: tenta na próxima abertura */ }
    })()
    return () => { alive = false }
  }, [])

  if (!news) return null

  const accept = () => { save(news.until); setNews(null) }
  const go = (to) => { accept(); navigate(to) }
  const [first, ...rest] = news.items
  const more = news.total - news.items.length

  return (
    <div className="nd-bg" role="dialog" aria-modal="true" aria-labelledby="nd-title">
      <div className="nd">
        <div className="nd-kicker">{news.total === 1 ? 'Drama novo' : `${news.total} dramas novos`} no DramaHub</div>

        <button className="nd-hero" onClick={() => go(`/series/${first.id}`)}>
          {first.coverUrl && <img src={first.coverUrl} alt="" />}
          <div>
            <h2 id="nd-title">{first.title}</h2>
            <span className="card-sub">em {where(first) || 'Início'} · {first.episodeCount} EP{first.episodeCount === 1 ? '' : 's'}</span>
          </div>
        </button>

        {rest.length > 0 && (
          <ul className="nd-covers">
            {rest.map((s) => (
              <li key={s.id}>
                <button onClick={() => go(`/series/${s.id}`)} title={s.title}>
                  <span className="nd-c">
                    {s.coverUrl && <img src={s.coverUrl} alt="" loading="lazy" />}
                    {s.source === 'ai' && <span className="nd-ai">IA</span>}
                  </span>
                  <span className="nd-ct">{s.title}</span>
                  <span className="nd-cw">{s.genre || where(s)}</span>
                </button>
              </li>
            ))}
            {more > 0 && (
              <li>
                <button className="nd-moreb" onClick={() => go(news.sections[0]?.to || '/buscar')}>+{more}<small>no catálogo</small></button>
              </li>
            )}
          </ul>
        )}

        {news.sections.length > 0 && (
          <>
            <div className="nd-sub">Onde encontrar</div>
            <div className="nd-secs">
              {news.sections.slice(0, 6).map((s) => (
                <button key={s.label} className={`chip${s.ai ? ' active' : ''}`} onClick={() => go(s.to)}>
                  {s.ai ? '✨ ' : ''}{s.label} <b>{s.count}</b>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="nd-actions">
          <button className="btn" onClick={() => go(`/series/${first.id}`)}>Assistir agora</button>
          <button className="ghost" onClick={accept}>OK</button>
        </div>
      </div>
    </div>
  )
}

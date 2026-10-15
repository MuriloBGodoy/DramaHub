import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// Aviso de dramas novos: aparece ao abrir o app quando entrou drama no catálogo desde o último "OK"
// deste navegador. Fica aparecendo (a cada abertura) até a pessoa aceitar; depois só volta com novidades.
const KEY = 'dramahub.novidades.vistoAte'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const save = (v) => { try { localStorage.setItem(KEY, v) } catch { /* modo privado */ } }

export default function NewDramas() {
  const [news, setNews] = useState(null) // { total, items, until }
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
  const watch = (s) => { accept(); navigate(`/series/${s.id}`) }
  const [first, ...rest] = news.items
  const more = news.total - news.items.length

  return (
    <div className="nd-bg" role="dialog" aria-modal="true" aria-labelledby="nd-title">
      <div className="nd">
        <div className="nd-kicker">{news.total === 1 ? 'Drama novo' : `${news.total} dramas novos`} no DramaHub</div>

        <button className="nd-hero" onClick={() => watch(first)}>
          {first.coverUrl && <img src={first.coverUrl} alt="" />}
          <div>
            <h2 id="nd-title">{first.title}</h2>
            <span className="card-sub">{first.source === 'ai' ? '✨ IA · ' : ''}{first.genre} · {first.episodeCount} EP{first.episodeCount === 1 ? '' : 's'}</span>
          </div>
        </button>

        {rest.length > 0 && (
          <ul className="nd-list">
            {rest.map((s) => (
              <li key={s.id}>
                <button onClick={() => watch(s)}>
                  {s.source === 'ai' && <span className="nd-ai">IA</span>}
                  <span className="nd-t">{s.title}</span>
                  <span className="nd-go">Assistir</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {more > 0 && <p className="card-sub nd-more">e mais {more} {more === 1 ? 'drama' : 'dramas'} no catálogo</p>}

        <div className="nd-actions">
          <button className="btn" onClick={() => watch(first)}>Assistir agora</button>
          <button className="ghost" onClick={accept}>OK</button>
        </div>
      </div>
    </div>
  )
}

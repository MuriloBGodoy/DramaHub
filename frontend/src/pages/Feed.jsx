import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mediaUrl } from '../api'
import { HeartIcon, MuteIcon, PlayIcon } from '../components/Icons'

/** Feed vertical estilo TikTok/DramaBox: primeiro episodio de cada serie, com autoplay do item visivel. */
export default function Feed() {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const containerRef = useRef(null)

  // "Para voce": amostra embaralhada do catalogo a cada visita
  useEffect(() => {
    api.feed().then((list) => setItems(list.sort(() => Math.random() - 0.5).slice(0, 40))).catch(() => {})
  }, [])

  // Descobre qual item esta na tela
  useEffect(() => {
    const root = containerRef.current
    if (!root || !items.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && en.intersectionRatio >= 0.6) setActive(Number(en.target.dataset.index))
        })
      },
      { root, threshold: [0.6] },
    )
    root.querySelectorAll('.feed-item').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [items])

  if (!items.length) return <div className="empty" style={{ paddingTop: 120 }}>Carregando o feed...</div>

  return (
    <div className="feed" ref={containerRef}>
      {items.map((ep, i) => (
        <FeedItem key={ep.id} ep={ep} index={i} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} />
      ))}
      <div className="feed-top">Para você</div>
      <button className="icon-btn feed-mute" onClick={() => setMuted((m) => !m)}>
        <MuteIcon muted={muted} />
      </button>
    </div>
  )
}

function FeedItem({ ep, index, active, near, muted }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [fav, setFav] = useState(false)
  const start = ep.startSec || 0

  useEffect(() => {
    api.isFavorite(ep.seriesId).then((r) => setFav(r.favorite)).catch(() => {})
  }, [ep.seriesId])

  useEffect(() => {
    const v = videoRef.current
    if (!v || ep.youtubeId) return
    if (active) {
      setPaused(false)
      v.play().catch(() => setPaused(true))
    } else {
      v.pause()
      v.currentTime = start
    }
  }, [active, start, ep.youtubeId])

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (ep.endSec && v.currentTime >= ep.endSec) v.currentTime = start // loop dentro do episodio
  }

  const toggle = () => {
    const v = videoRef.current
    if (v.paused) { v.play().catch(() => {}); setPaused(false) } else { v.pause(); setPaused(true) }
  }

  return (
    <div className="feed-item" data-index={index}>
      {ep.thumbnailUrl && <img className="poster" src={ep.thumbnailUrl} alt="" loading="lazy" />}
      {ep.youtubeId ? (
        <img className="yt-poster" src={ep.thumbnailUrl} alt="" loading="lazy" onClick={() => navigate(`/assistir/${ep.id}`)} />
      ) : near && (
        <video
          ref={videoRef}
          src={mediaUrl(ep.streamUrl)}
          poster={ep.thumbnailUrl || undefined}
          muted={muted}
          playsInline
          preload={active ? 'auto' : 'metadata'}
          onLoadedMetadata={(e) => { e.target.currentTime = start }}
          onTimeUpdate={onTimeUpdate}
          onClick={toggle}
        />
      )}
      {ep.youtubeId && (
        <button className="icon-btn big" style={{ position: 'absolute' }} onClick={() => navigate(`/assistir/${ep.id}`)}><PlayIcon /></button>
      )}
      {paused && !ep.youtubeId && (
        <button className="icon-btn big" style={{ position: 'absolute' }} onClick={toggle}><PlayIcon /></button>
      )}

      <div className="feed-side">
        <button onClick={() => api.toggleFavorite(ep.seriesId).then((r) => setFav(r.favorite))}>
          <span className="icon-btn" style={fav ? { color: 'var(--accent)' } : undefined}><HeartIcon filled={fav} /></span>
          {fav ? 'Salvo' : 'Salvar'}
        </button>
      </div>

      <div className="feed-info">
        <h2>{ep.seriesTitle}</h2>
        <p>EP {ep.number} · {ep.title}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/assistir/${ep.id}`)}>
            <PlayIcon /> Assistir
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/series/${ep.seriesId}`)}>Ver série</button>
        </div>
      </div>
    </div>
  )
}

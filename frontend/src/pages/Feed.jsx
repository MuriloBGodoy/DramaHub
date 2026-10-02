import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, mediaUrl } from '../api'
import { VerticalFrame } from '../components/Cover'
import { HeartIcon, ListIcon, MuteIcon, PlayIcon } from '../components/Icons'
import { buildEps, fmtDur } from '../eps'

/** Feed vertical estilo TikTok/DramaBox: primeiro episódio de cada série, com autoplay do item visível. */
export default function Feed() {
  const [items, setItems] = useState(null)
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const containerRef = useRef(null)

  // "Para você": amostra embaralhada do catálogo a cada visita
  useEffect(() => {
    api.feed().then((list) => setItems(list.sort(() => Math.random() - 0.5).slice(0, 40))).catch(() => setItems([]))
  }, [])

  // Descobre qual item está na tela
  useEffect(() => {
    const root = containerRef.current
    if (!root || !items?.length) return
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

  if (items === null) return <div className="feed"><div className="feed-item skeleton" /></div>
  if (!items.length) {
    return (
      <div className="state">
        <h3>Nada no feed ainda</h3>
        <p>Quando houver dramas no catálogo, eles aparecem aqui um atrás do outro.</p>
        <Link className="btn" to="/">Voltar ao início</Link>
      </div>
    )
  }

  return (
    <div className="feed" ref={containerRef}>
      <div className="feed-top"><span>Para você</span></div>
      {items.map((ep, i) => (
        <FeedItem key={ep.id} ep={ep} index={i} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} onMute={() => setMuted((m) => !m)} />
      ))}
    </div>
  )
}

function FeedItem({ ep, index, active, near, muted, onMute }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [fav, setFav] = useState(false)
  const start = ep.startSec || 0
  const eps = buildEps([ep])

  useEffect(() => {
    api.isFavorite(ep.seriesId).then((r) => setFav(r.favorite)).catch(() => {})
  }, [ep.seriesId])

  useEffect(() => {
    const v = videoRef.current
    if (!v || ep.youtubeId) return
    if (active) {
      v.play().then(() => setPaused(false)).catch(() => setPaused(true))
    } else {
      v.pause()
      v.currentTime = start
    }
  }, [active, start, ep.youtubeId])

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (ep.endSec && v.currentTime >= ep.endSec) v.currentTime = start // loop dentro do episódio
  }

  const toggle = () => {
    const v = videoRef.current
    if (v.paused) { v.play().catch(() => {}); setPaused(false) } else { v.pause(); setPaused(true) }
  }

  const watch = () => navigate(`/assistir/${ep.id}`)

  return (
    <div className="feed-item" data-index={index}>
      {ep.youtubeId ? (
        <button className="feed-media" onClick={watch} aria-label={`Assistir ${ep.seriesTitle}`}>
          <VerticalFrame youtubeId={ep.youtubeId} fallback={ep.thumbnailUrl || ep.seriesCoverUrl} title={ep.seriesTitle} />
        </button>
      ) : near ? (
        <video
          ref={videoRef}
          className="feed-media"
          src={mediaUrl(ep.streamUrl)}
          poster={ep.thumbnailUrl || undefined}
          muted={muted}
          playsInline
          preload={active ? 'auto' : 'metadata'}
          onLoadedMetadata={(e) => { e.target.currentTime = start }}
          onTimeUpdate={onTimeUpdate}
          onClick={toggle}
        />
      ) : (
        <div className="feed-media" />
      )}
      {paused && !ep.youtubeId && (
        <button className="ctl big feed-play" onClick={toggle} aria-label="Tocar"><PlayIcon /></button>
      )}

      <div className="rail">
        <button onClick={() => api.toggleFavorite(ep.seriesId).then((r) => setFav(r.favorite)).catch(() => {})} aria-pressed={fav}>
          <span className={`ric ${fav ? 'on' : ''}`}><HeartIcon filled={fav} /></span>{fav ? 'Salvo' : 'Salvar'}
        </button>
        <button onClick={() => navigate(`/series/${ep.seriesId}`)}>
          <span className="ric"><ListIcon /></span>{eps.length > 1 ? `${eps.length} EPs` : 'Série'}
        </button>
        {!ep.youtubeId && (
          <button onClick={onMute} aria-pressed={muted}><span className="ric"><MuteIcon muted={muted} /></span>{muted ? 'Sem som' : 'Som'}</button>
        )}
      </div>

      <div className="feed-info">
        <h3>{ep.seriesTitle}</h3>
        <span className="meta">{eps.length > 1 ? `${eps.length} EPs` : `EP ${ep.number}`}{ep.durationSec ? ` · ${fmtDur(ep.durationSec)}` : ''}</span>
        <button className="btn wide" onClick={watch}><PlayIcon />Assistir EP 1</button>
      </div>
    </div>
  )
}

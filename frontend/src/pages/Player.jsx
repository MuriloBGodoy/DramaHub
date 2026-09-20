import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, fmtTime, mediaUrl } from '../api'
import { BackIcon, ListIcon, MuteIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from '../components/Icons'
import YouTubePlayer from '../components/YouTubePlayer'

// Remonta o player a cada troca de episodio (estado limpo).
export default function Player() {
  const { id } = useParams()
  return <EpisodePlayer key={id} episodeId={Number(id)} />
}

const SAVE_EVERY_MS = 5000
const RESUME_MIN_SEC = 5

function EpisodePlayer({ episodeId }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const hideTimer = useRef(null)
  const lastSave = useRef(0)
  const resumeRef = useRef(0)
  const finishedRef = useRef(false)

  const [ep, setEp] = useState(null)
  const [series, setSeries] = useState(null)
  const [progressMap, setProgressMap] = useState({})
  const [error, setError] = useState(null)

  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(true)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)      // tempo relativo ao inicio do episodio
  const [dur, setDur] = useState(0)        // duracao do episodio (segmento)
  const [showUi, setShowUi] = useState(true)
  const [drawer, setDrawer] = useState(false)

  const start = ep?.startSec || 0

  // ---------- carga ----------
  useEffect(() => {
    let cancelled = false
    api.episode(episodeId)
      .then(async (e) => {
        const [s, prog] = await Promise.all([
          api.seriesDetail(e.seriesId),
          api.seriesProgress(e.seriesId).catch(() => []),
        ])
        if (cancelled) return
        const map = Object.fromEntries(prog.map((p) => [p.episodeId, p]))
        const mine = map[e.id]
        resumeRef.current = mine && !mine.completed && mine.positionSec > RESUME_MIN_SEC ? mine.positionSec : 0
        setProgressMap(map)
        setSeries(s)
        setEp(e)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [episodeId])

  const idx = series && ep ? series.episodes.findIndex((x) => x.id === ep.id) : -1
  const prevEp = idx > 0 ? series.episodes[idx - 1] : null
  const nextEp = idx >= 0 && idx < series.episodes.length - 1 ? series.episodes[idx + 1] : null

  // ---------- progresso ----------
  const save = useCallback((completed = false, keepalive = false) => {
    const v = videoRef.current
    if (!v || !ep) return
    if (finishedRef.current && !completed) return // nao sobrescrever o "concluido" ao desmontar
    const pos = Math.max(0, v.currentTime - start)
    lastSave.current = Date.now()
    api.saveProgress(ep.id, completed ? 0 : pos, completed, keepalive).catch(() => {})
  }, [ep, start])

  useEffect(() => {
    if (!ep) return
    const onHide = () => document.visibilityState === 'hidden' && save(false, true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      save(false, true)
    }
  }, [ep, save])

  const goTo = (e, replace = true) => e && navigate(`/assistir/${e.id}`, { replace })

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    save(true, true)
    if (nextEp) goTo(nextEp)
    else navigate(`/series/${ep.seriesId}`, { replace: true })
  }

  // ---------- eventos do <video> ----------
  const onLoadedMetadata = () => {
    const v = videoRef.current
    const end = ep.endSec || v.duration
    setDur(Math.max(0, end - start))
    if (resumeRef.current > 0 || !ep.youtubeId) v.currentTime = start + resumeRef.current
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !ep) return
    const rel = v.currentTime - start
    setTime(rel)
    if (ep.endSec && v.currentTime >= ep.endSec) {
      v.pause()
      finish()
      return
    }
    if (!v.paused && Date.now() - lastSave.current > SAVE_EVERY_MS) save(false)
  }

  // ---------- controles ----------
  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play().catch(() => {}) : v.pause()
  }

  const seekTo = (fraction) => {
    const v = videoRef.current
    if (!v || !dur) return
    v.currentTime = start + Math.min(Math.max(0, fraction), 0.999) * dur
    setTime(v.currentTime - start)
  }
  const skip = (delta) => seekTo((time + delta) / dur)

  const poke = useCallback(() => {
    setShowUi(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowUi(false), 3000)
  }, [])

  useEffect(() => {
    if (playing) poke()
    else { clearTimeout(hideTimer.current); setShowUi(true) }
    return () => clearTimeout(hideTimer.current)
  }, [playing, poke])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowRight') skip(10)
      if (e.code === 'ArrowLeft') skip(-10)
      if (e.code === 'Escape') navigate(-1)
      poke()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // barra de progresso: arrasto com pointer events
  const seekRef = useRef(null)
  const onSeekPointer = (e) => {
    const rect = seekRef.current.getBoundingClientRect()
    seekTo((e.clientX - rect.left) / rect.width)
  }
  const onSeekDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeekPointer(e)
  }
  const onSeekMove = (e) => e.buttons === 1 && onSeekPointer(e)

  if (error) {
    return (
      <div className="player">
        <div className="player-error">
          <div>
            <p>{error}</p>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>Voltar</button>
          </div>
        </div>
      </div>
    )
  }

  const pct = dur ? Math.min(100, (time / dur) * 100) : 0

  return (
    <div className="player" onPointerMove={poke}>
      {ep && ep.youtubeId ? (
        <YouTubePlayer
          ref={videoRef}
          videoId={ep.youtubeId}
          start={start}
          muted={muted}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onEnded={finish}
          onError={() => setError('Este vídeo do YouTube não pode ser reproduzido aqui (removido ou com embed bloqueado).')}
        />
      ) : ep && (
        <video
          ref={videoRef}
          src={mediaUrl(ep.streamUrl)}
          poster={ep.thumbnailUrl || undefined}
          playsInline
          preload='auto'
          muted={muted}
          onClick={() => (showUi ? togglePlay() : poke())}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onEnded={finish}
          onError={() => setError('Não foi possível carregar o vídeo. Verifique a conexão ou a URL do episódio.')}
        />
      )}

      <div className={`player-overlay ${showUi ? '' : 'hidden'}`} onClick={poke}>
        <div className="player-top">
          <button className="icon-btn" onClick={() => navigate(ep ? `/series/${ep.seriesId}` : -1)}><BackIcon /></button>
          <div className="info">
            <b>{ep?.seriesTitle || '...'}</b>
            <span>{ep ? `EP ${ep.number} · ${ep.title}` : ''}</span>
          </div>
          <button className="icon-btn" onClick={() => setMuted((m) => !m)}><MuteIcon muted={muted} /></button>
        </div>

        <div className="player-center">
          <button className="icon-btn" disabled={!prevEp} style={{ opacity: prevEp ? 1 : 0.3 }} onClick={() => goTo(prevEp)}><PrevIcon /></button>
          {buffering && !playing ? (
            <div className="spinner" />
          ) : (
            <button className="icon-btn big" onClick={togglePlay}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
          )}
          <button className="icon-btn" disabled={!nextEp} style={{ opacity: nextEp ? 1 : 0.3 }} onClick={() => goTo(nextEp)}><NextIcon /></button>
        </div>

        <div className="player-bottom">
          <div className="seek" ref={seekRef} onPointerDown={onSeekDown} onPointerMove={onSeekMove}>
            <div className="track">
              <div className="fill" style={{ width: `${pct}%` }} />
              <div className="knob" style={{ left: `${pct}%` }} />
            </div>
          </div>
          <div className="player-actions">
            <span className="time">{fmtTime(time)} / {fmtTime(dur)}</span>
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => setDrawer(true)}>
              <ListIcon /> Episódios
            </button>
            {nextEp && (
              <button className="btn btn-primary btn-sm" onClick={() => goTo(nextEp)}>
                Próximo <NextIcon />
              </button>
            )}
          </div>
        </div>
      </div>

      {drawer && series && (
        <>
          <div className="drawer-bg" onClick={() => setDrawer(false)} />
          <div className="drawer">
            <h3>{series.title} · {series.episodes.length} episódios</h3>
            <div className="ep-list">
              {series.episodes.map((e) => (
                <button
                  key={e.id}
                  className={`${e.id === ep.id ? 'current' : ''} ${progressMap[e.id]?.completed ? 'done' : ''}`}
                  onClick={() => { setDrawer(false); goTo(e, false) }}
                >
                  {e.number}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

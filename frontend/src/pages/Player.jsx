import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, fmtTime, mediaUrl } from '../api'
import { AlertIcon, BackIcon, CheckIcon, ExternalIcon, FitIcon, HeartIcon, ListIcon, MuteIcon, NextIcon, PauseIcon, PlayIcon, SkipIcon } from '../components/Icons'
import YouTubePlayer from '../components/YouTubePlayer'
import { buildEps, epAt, epDuration, timeLeft } from '../eps'

// Remonta o player a cada troca de episódio (estado limpo).
export default function Player() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const t = params.get('t')
  return <EpisodePlayer key={`${id}:${t || ''}`} episodeId={Number(id)} jumpTo={t != null ? Number(t) : null} />
}

const SAVE_EVERY_MS = 5000
const RESUME_MIN_SEC = 5
const FIT_KEY = 'dramahub.fit'

function EpisodePlayer({ episodeId, jumpTo }) {
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
  const [fav, setFav] = useState(false)

  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(true)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)      // tempo relativo ao início do episódio
  const [dur, setDur] = useState(0)        // duração do episódio (segmento)
  const [awake, setAwake] = useState(true) // controles visíveis por toque recente
  const [sheet, setSheet] = useState(false)
  // Preencher: o drama vertical ocupa a tela toda (corta as laterais borradas do quadro 16:9). Ajustar: vídeo inteiro.
  const [fill, setFill] = useState(() => { try { return localStorage.getItem(FIT_KEY) !== 'fit' } catch { return true } })

  const showUi = !playing || awake || sheet
  const start = ep?.startSec || 0

  // ---------- carga ----------
  useEffect(() => {
    let cancelled = false
    api.episode(episodeId)
      .then(async (e) => {
        const [s, prog, f] = await Promise.all([
          api.seriesDetail(e.seriesId),
          api.seriesProgress(e.seriesId).catch(() => []),
          api.isFavorite(e.seriesId).catch(() => ({ favorite: false })),
        ])
        if (cancelled) return
        const map = Object.fromEntries(prog.map((p) => [p.episodeId, p]))
        const mine = map[e.id]
        if (jumpTo != null) resumeRef.current = Math.max(0, jumpTo)
        else resumeRef.current = mine && !mine.completed && mine.positionSec > RESUME_MIN_SEC ? mine.positionSec : 0
        setProgressMap(map)
        setFav(f.favorite)
        setSeries(s)
        setEp(e)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [episodeId, jumpTo])

  const idx = series && ep ? series.episodes.findIndex((x) => x.id === ep.id) : -1
  const nextReal = idx >= 0 && idx < series.episodes.length - 1 ? series.episodes[idx + 1] : null
  const eps = series ? buildEps(series.episodes) : []
  const curEp = ep && eps.length ? epAt(eps, ep.id, time) : null
  const nextEp = curEp ? eps[curEp.n] || null : null // eps[n] = o EP seguinte (n é 1-based)

  // ---------- progresso ----------
  const save = useCallback((completed = false, keepalive = false) => {
    const v = videoRef.current
    if (!v || !ep) return
    if (finishedRef.current && !completed) return // não sobrescrever o "concluído" ao desmontar
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

  const goToEpisode = (e, replace = true) => e && navigate(`/assistir/${e.id}`, { replace })

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    save(true, true)
    if (nextReal) goToEpisode(nextReal)
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
  const poke = useCallback(() => {
    setAwake(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setAwake(false), 3000)
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    hideTimer.current = setTimeout(() => setAwake(false), 3000)
    return () => clearTimeout(hideTimer.current)
  }, [playing])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
    poke()
  }

  const seekRel = (sec) => {
    const v = videoRef.current
    if (!v || !dur) return
    const s = Math.min(Math.max(0, sec), dur - 0.5)
    v.currentTime = start + s
    setTime(s)
  }
  const skip = (delta) => { seekRel(time + delta); poke() }

  /** Pula para um EP: no mesmo episódio é só um seek; em outro, troca de episódio já no início do trecho. */
  const goToEp = (e) => {
    setSheet(false)
    if (!e) return
    if (e.episode.id === ep.id) { seekRel(e.from); videoRef.current?.play?.()?.catch?.(() => {}); poke() }
    else navigate(`/assistir/${e.episode.id}${e.from > 0 ? `?t=${Math.floor(e.from)}` : ''}`, { replace: true })
  }

  const toggleFit = () => {
    setFill((f) => {
      try { localStorage.setItem(FIT_KEY, f ? 'fit' : 'fill') } catch { /* privado */ }
      return !f
    })
    poke()
  }

  const toggleFav = () => api.toggleFavorite(ep.seriesId).then((r) => setFav(r.favorite)).catch(() => {})

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowRight') skip(10)
      if (e.code === 'ArrowLeft') skip(-10)
      if (e.code === 'Escape') { if (sheet) setSheet(false); else navigate(-1) }
      poke()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // barra de progresso: arrasto com pointer events
  const seekRef = useRef(null)
  const onSeekPointer = (e) => {
    const rect = seekRef.current.getBoundingClientRect()
    seekRel(((e.clientX - rect.left) / rect.width) * dur)
  }
  const onSeekDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeekPointer(e)
    poke()
  }
  const onSeekMove = (e) => e.buttons === 1 && onSeekPointer(e)

  if (error) {
    const yt = ep?.youtubeId
    return (
      <div className="player err">
        <div className="pl-top"><button className="ib" onClick={() => navigate(-1)} aria-label="Voltar"><BackIcon /></button></div>
        <div className="state">
          <span className="state-ic danger"><AlertIcon /></span>
          <h3>Este EP não carregou</h3>
          <p>{error}</p>
          {yt && <a className="btn" href={`https://www.youtube.com/watch?v=${yt}&t=${Math.floor(start + time)}s`} target="_blank" rel="noreferrer"><ExternalIcon />Abrir no YouTube</a>}
          <button className="ghost" onClick={() => navigate(ep ? `/series/${ep.seriesId}` : '/')}>Voltar para a série</button>
        </div>
      </div>
    )
  }

  const pct = dur ? Math.min(100, (time / dur) * 100) : 0
  const parts = curEp ? eps.filter((e) => e.episode.id === ep.id) : []
  const epLen = curEp && curEp.to != null ? curEp.to - curEp.from : 0
  const epPos = curEp ? Math.max(0, time - curEp.from) : 0

  return (
    <div className={`player ${fill ? 'fill' : 'fit'}`} onPointerMove={poke}>
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
          onError={() => setError('O canal removeu o vídeo ou bloqueou a reprodução fora do YouTube.')}
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
        <div className="pl-top">
          <button className="ib" onClick={() => navigate(ep ? `/series/${ep.seriesId}` : -1)} aria-label="Voltar para a série"><BackIcon /></button>
          <span className="ttl">{curEp ? `EP ${curEp.n} de ${eps.length}` : ''}</span>
          {ep?.youtubeId ? (
            <button className="ib" onClick={toggleFit} aria-label={fill ? 'Mostrar o vídeo inteiro' : 'Preencher a tela'}><FitIcon fill={fill} /></button>
          ) : <span className="ib nil" aria-hidden="true" />}
        </div>

        <div className="pl-mid">
          <button className="ctl" onClick={() => skip(-10)} aria-label="Voltar 10 segundos"><SkipIcon /></button>
          {buffering && !playing ? (
            <div className="spinner" role="status" aria-label="Carregando" />
          ) : (
            <button className="ctl big" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Tocar'}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
          )}
          <button className="ctl" onClick={() => skip(10)} aria-label="Avançar 10 segundos"><SkipIcon forward /></button>
        </div>

        <div className="rail">
          <button onClick={toggleFav} aria-pressed={fav}><span className={`ric ${fav ? 'on' : ''}`}><HeartIcon filled={fav} /></span>{fav ? 'Salvo' : 'Salvar'}</button>
          <button onClick={() => setSheet(true)}><span className="ric"><ListIcon /></span>EPs</button>
          <button onClick={() => setMuted((m) => !m)} aria-pressed={muted}><span className="ric"><MuteIcon muted={muted} /></span>{muted ? 'Sem som' : 'Som'}</button>
          {(nextEp || nextReal) && (
            <button onClick={() => (nextEp ? goToEp(nextEp) : goToEpisode(nextReal))}><span className="ric"><NextIcon /></span>EP {(curEp?.n || 0) + 1}</button>
          )}
        </div>

        <div className="pl-bot">
          <h3>{ep?.seriesTitle || ''}</h3>
          <div className="seek" ref={seekRef} onPointerDown={onSeekDown} onPointerMove={onSeekMove} role="slider" aria-label="Posição" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(time)}>
            <div className="tr">
              {dur > 0 && parts.length > 1 && parts.map((p) => (
                <span key={p.n} className="seg" style={{ left: `${(p.from / dur) * 100}%`, width: `${(((p.to ?? dur) - p.from) / dur) * 100}%` }} />
              ))}
              {(parts.length <= 1 || !dur) && <span className="seg" style={{ left: 0, width: '100%' }} />}
              <i style={{ width: `${pct}%` }} />
              <b style={{ left: `${pct}%` }} />
            </div>
          </div>
          <div className="time">
            <span>{curEp ? `EP ${curEp.n} · ` : ''}{fmtTime(epLen ? epPos : time)} / {fmtTime(epLen || dur)}</span>
            <span>{dur ? timeLeft(dur, time) : ''}</span>
          </div>
        </div>
      </div>

      {sheet && series && (
        <>
          <div className="drawer-bg" onClick={() => setSheet(false)} />
          <div className="drawer" role="dialog" aria-label="Episódios">
            <span className="grab" />
            <div className="sub-h"><h2>Episódios</h2><span className="clip">{series.title}</span></div>
            <div className="epg">
              {eps.map((e) => {
                const p = progressMap[e.episode.id]
                const isCur = curEp && e.n === curEp.n
                const done = !isCur && ((e.episode.id === ep.id && e.to != null && time >= e.to) || (p && (p.completed || (e.to != null && p.positionSec >= e.to - 5))))
                return (
                  <button key={e.n} className={`ep ${done ? 'done' : ''} ${isCur ? 'cur' : ''}`} onClick={() => goToEp(e)}>
                    {e.n}
                    {done && <span className="ck"><CheckIcon /></span>}
                    {isCur && <span className="eq"><i /><i /><i /></span>}
                  </button>
                )
              })}
            </div>
            <p className="hint">{eps.length > series.episodes.length ? `Cada EP é um trecho de ~10 min. ${series.episodes.length === 1 ? `O drama completo tem ${Math.round(epDuration(series.episodes[0]) / 60)} min.` : ''}` : 'Toque num EP para ir direto para ele.'}</p>
          </div>
        </>
      )}
    </div>
  )
}

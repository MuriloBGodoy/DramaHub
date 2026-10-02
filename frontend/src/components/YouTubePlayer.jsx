import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Carrega a IFrame API do YouTube uma unica vez
let apiPromise = null
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return apiPromise
}

/**
 * Player do YouTube que imita a interface do <video> (paused, currentTime, duration, play, pause)
 * e dispara os mesmos eventos, para o EpisodePlayer usar os dois de forma identica.
 */
const YouTubePlayer = forwardRef(function YouTubePlayer(
  { videoId, start = 0, muted, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onWaiting, onPlaying, onEnded, onError },
  ref,
) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const handlers = useRef({})
  handlers.current = { onLoadedMetadata, onTimeUpdate, onPlay, onPause, onWaiting, onPlaying, onEnded, onError }

  useImperativeHandle(ref, () => ({
    get paused() {
      const p = playerRef.current
      if (!p?.getPlayerState) return true
      const st = p.getPlayerState()
      return st !== window.YT.PlayerState.PLAYING && st !== window.YT.PlayerState.BUFFERING
    },
    get currentTime() { return playerRef.current?.getCurrentTime?.() || 0 },
    set currentTime(t) { playerRef.current?.seekTo?.(t, true) },
    get duration() { return playerRef.current?.getDuration?.() || 0 },
    play() { playerRef.current?.playVideo?.(); return Promise.resolve() },
    pause() { playerRef.current?.pauseVideo?.() },
  }), [])

  useEffect(() => {
    let disposed = false
    loadApi().then((YT) => {
      if (disposed || !hostRef.current) return
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, cc_load_policy: 0, disablekb: 1, start: Math.floor(start), hl: 'pt' },
        events: {
          onReady: (e) => {
            if (muted) e.target.mute()
            // Legendas automáticas do YouTube desligadas: os dramas já têm legenda queimada no vídeo e, com o
            // iframe preenchendo a tela, a caixa de legenda do YouTube ficaria cortada nas laterais.
            try { e.target.unloadModule('captions'); e.target.unloadModule('cc') } catch { /* sem módulo */ }
            handlers.current.onLoadedMetadata?.()
            e.target.playVideo()
            timerRef.current = setInterval(() => handlers.current.onTimeUpdate?.(), 250)
          },
          onStateChange: (e) => {
            const S = YT.PlayerState
            if (e.data === S.PLAYING) {
              try { e.target.unloadModule('captions') } catch { /* sem módulo */ }
              handlers.current.onPlaying?.(); handlers.current.onPlay?.()
            }
            else if (e.data === S.PAUSED) handlers.current.onPause?.()
            else if (e.data === S.BUFFERING) handlers.current.onWaiting?.()
            else if (e.data === S.ENDED) handlers.current.onEnded?.()
          },
          onError: () => handlers.current.onError?.(),
        },
      })
    })
    return () => {
      disposed = true
      clearInterval(timerRef.current)
      try { playerRef.current?.destroy?.() } catch { /* ja removido */ }
      playerRef.current = null
    }
    // videoId/start mudam apenas com remontagem (key no Player)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  useEffect(() => {
    const p = playerRef.current
    if (!p?.mute) return
    muted ? p.mute() : p.unMute()
  }, [muted])

  return (
    // Sem camada por cima do iframe: o botao "Pular anuncio" do YouTube precisa receber o clique.
    <div className="yt-wrap">
      <div ref={hostRef} />
    </div>
  )
})

export default YouTubePlayer

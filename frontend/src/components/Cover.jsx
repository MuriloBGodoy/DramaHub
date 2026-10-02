import { useState } from 'react'

// hqdefault/sddefault/hqN são 4:3 com faixas pretas em cima e embaixo (vídeo 16:9 dentro); "lb" amplia para escondê-las.
const isLetterboxed = (url) => /i\.ytimg\.com\/vi\/[^/]+\/(hq|sd)\w*\.jpg/.test(url || '')

/** Imagem de capa com fallback (título sobre gradiente) caso a URL falhe. */
export default function Cover({ src, title, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className={`fallback-cover ${className}`}><span>{title}</span></div>
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${className} ${isLetterboxed(src) ? 'lb' : ''}`}
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Quadro vertical do drama: os vídeos dos canais são 9:16 dentro de um quadro 16:9, então um quadro do meio do
 * vídeo (maxres2 → hq2) recortado no centro mostra o drama em pé. Sem vídeo do YouTube, cai para a capa.
 */
export function VerticalFrame({ youtubeId, fallback, title }) {
  const sources = youtubeId
    ? [`https://i.ytimg.com/vi/${youtubeId}/maxres2.jpg`, `https://i.ytimg.com/vi/${youtubeId}/hq2.jpg`]
    : []
  const [i, setI] = useState(0)
  if (i >= sources.length) return <Cover src={fallback} title={title} className="vf" />
  const src = sources[i]
  return (
    <img
      key={src}
      src={src}
      alt=""
      loading="lazy"
      className={`vf ${isLetterboxed(src) ? 'lb' : ''}`}
      onError={() => setI(i + 1)}
      // o YouTube responde 404 com uma imagem cinza de 120 px quando o maxres não existe
      onLoad={(e) => { if (e.currentTarget.naturalWidth <= 120) setI(i + 1) }}
    />
  )
}

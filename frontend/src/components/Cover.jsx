import { useState } from 'react'

/** Imagem de capa com fallback (gradiente + titulo) caso a URL falhe. */
export default function Cover({ src, title, className }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className={`fallback-cover ${className || ''}`}>{title}</div>
  }
  return <img src={src} alt={title} loading="lazy" className={className} onError={() => setFailed(true)} />
}

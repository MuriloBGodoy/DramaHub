import { useRef, useState } from 'react'
import { api } from '../api'

// profile.avatar guarda um emoji ou a URL de uma foto enviada pelo usuário.
const isPhoto = (v) => /^https?:\/\//.test(v || '')

export const AVATARS = ['💖', '🎬', '🍿', '🌸', '🔥', '👑', '🐺', '🦋', '🌙', '⭐', '🐉', '🎀']

export default function Avatar({ value, big = false }) {
  return (
    <div className={`avatar${big ? ' big' : ''}`}>
      {isPhoto(value) ? <img src={value} alt="" /> : value}
    </div>
  )
}

/** Escolha de avatar: enviar uma foto ou usar um dos emojis. */
export function AvatarPicker({ value, onChange, onError }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { onChange(await api.uploadAvatar(file)) } catch (err) { onError?.(`Não deu para enviar a foto: ${err.message}`) } finally { setBusy(false) }
  }

  return (
    <div className="avatar-pick">
      <button type="button" className={`photo${isPhoto(value) ? ' active' : ''}`} onClick={() => input.current.click()} disabled={busy}
        aria-label="Enviar foto">
        {isPhoto(value) ? <img src={value} alt="" /> : busy ? '…' : '📷'}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      {AVATARS.map((a) => (
        <button type="button" key={a} className={value === a ? 'active' : ''} onClick={() => onChange(a)}>{a}</button>
      ))}
    </div>
  )
}

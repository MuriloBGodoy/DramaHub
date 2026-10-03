import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { StudioIcon } from '../components/Icons'

const AVATARS = ['💖', '🎬', '🍿', '🌸', '🔥', '👑', '🐺', '🦋', '🌙', '⭐', '🐉', '🎀']

export default function Account() {
  const { user, setUser, reset, isAdmin } = useAuth()
  const [form, setForm] = useState({ name: user.name, avatar: user.avatar })
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [installEvt, setInstallEvt] = useState(null)

  // Prompt de instalacao do PWA (Android/Chrome/Edge)
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEvt(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      setUser(await api.updateMe(form))
      setMsg({ type: 'ok', text: 'Salvo!' })
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
  }

  const unlock = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      setUser(await api.unlockAdmin(code))
      setCode('')
      setMsg({ type: 'ok', text: 'Estúdio liberado neste navegador.' })
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
  }

  const restart = () => {
    if (confirm('Começar do zero? O progresso e os favoritos deste navegador serão apagados.')) reset()
  }

  const isIos = /iPhone|iPad/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone

  return (
    <div className="page">
      <h1 className="page-title">Perfil</h1>

      <div className="account-head">
        <div className="avatar big">{user.avatar}</div>
        <div>
          <b>{user.name}</b>
          <div className="card-sub">salvo neste navegador{isAdmin ? ' · administrador' : ''}</div>
        </div>
      </div>

      {!standalone && (
        <div className="notice info" style={{ marginBottom: 16 }}>
          <b>Instalar como app:</b>{' '}
          {installEvt ? (
            <button className="btn btn-sm" onClick={() => installEvt.prompt()}>Instalar DramaHub</button>
          ) : isIos ? (
            <>no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.</>
          ) : (
            <>no menu do navegador, escolha <b>Instalar app</b> / <b>Adicionar à tela inicial</b>.</>
          )}
        </div>
      )}

      {isAdmin && (
        <Link to="/estudio" className="ghost wide" style={{ marginBottom: 16 }}><StudioIcon />Abrir o Estúdio (catálogo)</Link>
      )}

      {msg && <div className={`notice ${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      <form className="form" onSubmit={save}>
        <h3>Perfil</h3>
        <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <div className="avatar-pick">
          {AVATARS.map((a) => (
            <button type="button" key={a} className={form.avatar === a ? 'active' : ''} onClick={() => setForm({ ...form, avatar: a })}>{a}</button>
          ))}
        </div>
        <button className="btn">Salvar</button>
      </form>

      {!isAdmin && (
        <form className="form" onSubmit={unlock}>
          <h3>Estúdio</h3>
          <p className="card-sub" style={{ margin: 0 }}>Para gerenciar o catálogo, digite o código de administrador.</p>
          <label>Código<input type="password" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <button className="btn">Liberar</button>
        </form>
      )}

      <div className="form">
        <h3>Sessão</h3>
        <p className="card-sub" style={{ margin: 0 }}>
          Não tem login: seu progresso e seus favoritos ficam guardados neste navegador. Em outro aparelho
          (ou se limpar os dados do navegador) começa uma sessão nova.
        </p>
      </div>

      <button className="ghost wide" onClick={restart}>Começar do zero</button>
    </div>
  )
}

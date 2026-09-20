import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

const AVATARS = ['💖', '🎬', '🍿', '🌸', '🔥', '👑', '🐺', '🦋', '🌙', '⭐', '🐉', '🎀']

export default function Account() {
  const { user, setUser, logout, isAdmin } = useAuth()
  const [devices, setDevices] = useState([])
  const [form, setForm] = useState({ name: user.name, avatar: user.avatar, currentPassword: '', newPassword: '' })
  const [msg, setMsg] = useState(null)
  const [installEvt, setInstallEvt] = useState(null)

  const loadDevices = () => api.devices().then(setDevices).catch(() => {})
  useEffect(() => { loadDevices() }, [])

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
      const u = await api.updateMe(form)
      setUser(u)
      setForm({ ...form, currentPassword: '', newPassword: '' })
      setMsg({ type: 'ok', text: 'Salvo!' })
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
  }

  const revoke = async (d) => {
    if (!confirm(`Desconectar "${d.name}"?`)) return
    await api.revokeDevice(d.id)
    loadDevices()
  }

  const fmt = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const isIos = /iPhone|iPad/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone

  return (
    <div className="page">
      <h1 className="page-title">Conta</h1>

      <div className="account-head">
        <div className="avatar big">{user.avatar}</div>
        <div>
          <b>{user.name}</b>
          <div className="card-sub">{user.email} · {isAdmin ? 'administrador' : 'membro'}</div>
        </div>
      </div>

      {!standalone && (
        <div className="notice info" style={{ marginBottom: 16 }}>
          📱 <b>Instalar como app:</b>{' '}
          {installEvt ? (
            <button className="btn btn-primary btn-sm" onClick={() => installEvt.prompt()}>Instalar DramaHub</button>
          ) : isIos ? (
            <>no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.</>
          ) : (
            <>no menu do navegador, escolha <b>Instalar app</b> / <b>Adicionar à tela inicial</b>.</>
          )}
        </div>
      )}

      {isAdmin && (
        <Link to="/estudio" className="btn btn-ghost" style={{ marginBottom: 16 }}>🎬 Abrir o Estúdio (catálogo)</Link>
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
        <div className="two">
          <label>Senha atual<input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} placeholder="só pra trocar a senha" /></label>
          <label>Nova senha<input type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></label>
        </div>
        <button className="btn btn-primary">Salvar</button>
      </form>

      <div className="form">
        <h3>Dispositivos conectados</h3>
        <p className="card-sub" style={{ margin: 0 }}>Seu progresso e favoritos ficam na conta — entre em qualquer aparelho e continue de onde parou.</p>
        {devices.map((d) => (
          <div key={d.id} className="device">
            <div>
              <b>{d.name}</b>{d.current && <span className="tag" style={{ marginLeft: 8 }}>este</span>}
              <div className="card-sub">conectado em {fmt(d.createdAt)} · último uso {fmt(d.lastSeenAt)}</div>
            </div>
            {!d.current && <button className="link-danger" onClick={() => revoke(d)}>Desconectar</button>}
          </div>
        ))}
      </div>

      <button className="btn btn-ghost" onClick={logout}>Sair deste dispositivo</button>
    </div>
  )
}

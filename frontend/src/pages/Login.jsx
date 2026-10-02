import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

const AVATARS = ['💖', '🎬', '🍿', '🌸', '🔥', '👑', '🐺', '🦋', '🌙', '⭐', '🐉', '🎀']

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [status, setStatus] = useState({ inviteRequired: false, hasUsers: true })
  const [form, setForm] = useState({ name: '', email: '', password: '', avatar: '💖', inviteCode: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    api.authStatus().then((s) => { setStatus(s); if (!s.hasUsers) setMode('register') }).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="login">
      <div className="login-bg" />
      <div className="login-card">
        <div className="brand">DramaHub</div>
        <p className="login-sub">
          {!status.hasUsers ? 'Crie a primeira conta — ela será a administradora.' : mode === 'login' ? 'Bom te ver de novo.' : 'Crie sua conta pra guardar seu progresso em qualquer dispositivo.'}
        </p>

        {status.hasUsers && (
          <div className="segmented">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(null) }}>Entrar</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(null) }}>Criar conta</button>
          </div>
        )}

        <form className="login-form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>Seu nome<input required autoComplete="name" value={form.name} onChange={set('name')} placeholder="Julia" /></label>
              <div className="avatar-pick">
                {AVATARS.map((a) => (
                  <button type="button" key={a} className={form.avatar === a ? 'active' : ''} onClick={() => setForm({ ...form, avatar: a })}>{a}</button>
                ))}
              </div>
            </>
          )}
          <label>E-mail<input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} placeholder="voce@email.com" /></label>
          <label>Senha
            <div className="pass-wrap">
              <input required type={showPass ? 'text' : 'password'} minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} placeholder="mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowPass((s) => !s)} aria-pressed={showPass}>{showPass ? 'ocultar' : 'mostrar'}</button>
            </div>
          </label>
          {mode === 'register' && status.inviteRequired && (
            <label>Código de convite<input required value={form.inviteCode} onChange={set('inviteCode')} placeholder="peça pra quem te convidou" /></label>
          )}
          {error && <div className="notice err">{error}</div>}
          <button className="btn wide" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <p className="login-foot">Você fica conectado neste dispositivo. Dá pra ver e desconectar seus dispositivos em <b>Conta</b>.</p>
      </div>
    </div>
  )
}

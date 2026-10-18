import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import Avatar, { AvatarPicker } from '../components/Avatar'
import { StudioIcon } from '../components/Icons'

export default function Account() {
  const { user, setUser, reset, createAccount, login, logout, isAdmin } = useAuth()
  const [form, setForm] = useState({ name: user.name, avatar: user.avatar })
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [installEvt, setInstallEvt] = useState(null)
  const [acc, setAcc] = useState({ mode: 'criar', name: user.name === 'Visitante' ? '' : user.name, avatar: user.avatar, email: '', password: '', busy: false })

  // trocou de usuário (entrou numa conta ou saiu): o formulário mostra o perfil dele
  useEffect(() => { setForm({ name: user.name, avatar: user.avatar }) }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const submitAccount = async (e) => {
    e.preventDefault()
    setMsg(null)
    setAcc((a) => ({ ...a, busy: true }))
    try {
      if (acc.mode === 'criar') {
        await createAccount(acc.email, acc.password)
        const me = await api.updateMe({ name: acc.name || user.name, avatar: acc.avatar })
        setUser(me)
        setForm({ name: me.name, avatar: me.avatar })
        setMsg({ type: 'ok', text: 'Conta criada! Agora é só entrar com esse e-mail e senha em qualquer aparelho.' })
      } else {
        await login(acc.email, acc.password)
        setMsg({ type: 'ok', text: 'Pronto, você entrou na sua conta.' })
      }
      setAcc((a) => ({ ...a, email: '', password: '', busy: false }))
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
      setAcc((a) => ({ ...a, busy: false }))
    }
  }

  const leave = () => {
    if (confirm('Sair da conta neste aparelho? Seus dados continuam salvos na conta.')) logout()
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
        <Avatar value={user.avatar} big />
        <div>
          <b>{user.name}</b>
          <div className="card-sub">{user.email || 'salvo neste navegador'}{isAdmin ? ' · administrador' : ''}</div>
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
        <AvatarPicker value={form.avatar} onChange={(avatar) => setForm({ ...form, avatar })} onError={(text) => setMsg({ type: 'err', text })} />
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

      {user.email ? (
        <div className="form">
          <h3>Conta</h3>
          <p className="card-sub" style={{ margin: 0 }}>
            Você está na conta <b>{user.email}</b>. Seu progresso, seus favoritos e seu perfil ficam salvos nela:
            é só entrar com esse e-mail e senha em qualquer aparelho.
          </p>
          <button type="button" className="ghost" onClick={leave}>Sair da conta</button>
        </div>
      ) : (
        <form className="form" onSubmit={submitAccount}>
          <h3>Conta</h3>
          <div className="chips" style={{ padding: 0 }}>
            <button type="button" className={`chip ${acc.mode === 'criar' ? 'active' : ''}`} onClick={() => setAcc({ ...acc, mode: 'criar' })}>Criar conta</button>
            <button type="button" className={`chip ${acc.mode === 'entrar' ? 'active' : ''}`} onClick={() => setAcc({ ...acc, mode: 'entrar' })}>Já tenho conta</button>
          </div>
          <p className="card-sub" style={{ margin: 0 }}>
            {acc.mode === 'criar'
              ? 'Hoje seu progresso e seus favoritos estão só neste navegador. Crie uma conta para guardar tudo e continuar de onde parou em qualquer aparelho.'
              : 'Entre para ver o progresso e os favoritos da sua conta neste aparelho.'}
          </p>
          {acc.mode === 'criar' && (
            <>
              <label>Seu nome<input value={acc.name} placeholder="Como quer ser chamada(o)" onChange={(e) => setAcc({ ...acc, name: e.target.value })} /></label>
              <div className="card-sub">Foto ou emoji</div>
              <AvatarPicker value={acc.avatar} onChange={(avatar) => setAcc({ ...acc, avatar })} onError={(text) => setMsg({ type: 'err', text })} />
            </>
          )}
          <label>E-mail<input type="email" autoComplete="email" required value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} /></label>
          <label>Senha<input type="password" minLength={6} required autoComplete={acc.mode === 'criar' ? 'new-password' : 'current-password'}
            value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} /></label>
          <button className="btn" disabled={acc.busy}>{acc.mode === 'criar' ? 'Criar conta' : 'Entrar'}</button>
        </form>
      )}

      {!user.email && <button className="ghost wide" onClick={restart}>Começar do zero</button>}
    </div>
  )
}

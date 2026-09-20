import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken, getToken } from './api'

const AuthContext = createContext(null)
const OLD_PROFILE_KEY = 'dramahub.profile'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = carregando, null = deslogado

  useEffect(() => {
    if (!getToken()) { setUser(null); return }
    api.me().then(setUser).catch(() => { setToken(null); setUser(null) })
  }, [])

  // Depois de entrar: se este navegador usava um perfil antigo (Julia/Murilo sem login),
  // traz o progresso e os favoritos dele para a conta.
  const finishLogin = async (session) => {
    setToken(session.token)
    setUser(session.user)
    try {
      const old = localStorage.getItem(OLD_PROFILE_KEY)
      if (old) { await api.claimProfile(old); localStorage.removeItem(OLD_PROFILE_KEY) }
    } catch { /* sem perfil antigo */ }
  }

  const login = (email, password) => api.login({ email, password }).then(finishLogin)
  const register = (data) => api.register(data).then(finishLogin)
  const logout = async () => {
    try { await api.logout() } catch { /* token ja invalido */ }
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setToken, getToken } from './api'

const AuthContext = createContext(null)
let inflight = null

// Sem login: na primeira visita o navegador ganha uma sessão (token salvo no localStorage)
// e o progresso/favoritos ficam nela.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = carregando, null = erro de conexão

  const start = useCallback(() => {
    // uma só chamada por vez (o StrictMode roda o efeito duas vezes e criaria duas sessões)
    inflight ||= (async () => {
      try {
        if (getToken()) {
          try { setUser(await api.me()); return } catch { setToken(null) }
        }
        const s = await api.newSession()
        setToken(s.token)
        setUser(s.user)
      } catch { setUser(null) } finally { inflight = null }
    })()
    return inflight
  }, [])

  useEffect(() => { start() }, [start])

  // Apaga a sessão deste navegador e começa outra do zero.
  const reset = async () => {
    try { await api.endSession() } catch { /* token ja invalido */ }
    setToken(null)
    setUser(undefined)
    await start()
  }

  return (
    <AuthContext.Provider value={{ user, setUser, start, reset, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

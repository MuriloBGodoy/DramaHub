import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, supabase } from './api'

const AuthContext = createContext(null)
let inflight = null

// Sem login: na primeira visita o navegador entra como usuário anônimo do Supabase
// (sessão salva no localStorage) e o progresso/favoritos ficam nele.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = carregando, null = erro de conexão

  const start = useCallback(() => {
    // uma só chamada por vez (o StrictMode roda o efeito duas vezes e criaria duas sessões)
    inflight ||= (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          try { setUser(await api.me()); return } catch { await supabase.auth.signOut({ scope: 'local' }) }
        }
        setUser((await api.newSession()).user)
      } catch { setUser(null) } finally { inflight = null }
    })()
    return inflight
  }, [])

  useEffect(() => { start() }, [start])

  // Apaga a sessão deste navegador e começa outra do zero.
  const reset = async () => {
    try { await api.endSession() } catch { /* sessão já inválida */ }
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

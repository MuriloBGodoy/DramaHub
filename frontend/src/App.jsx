import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Nav from './components/Nav'
import Home from './pages/Home'
import Feed from './pages/Feed'
import Search from './pages/Search'
import Library from './pages/Library'
import SeriesPage from './pages/SeriesPage'
import Player from './pages/Player'
import Studio from './pages/Studio'
import Account from './pages/Account'

function Shell() {
  const { user, isAdmin, start } = useAuth()
  const { pathname } = useLocation()

  // sessão apagada no servidor -> cria outra
  useEffect(() => {
    const h = () => start()
    window.addEventListener('dramahub:session-lost', h)
    return () => window.removeEventListener('dramahub:session-lost', h)
  }, [start])

  if (user === undefined) return <div className="splash"><div className="brand">DramaHub</div></div>
  if (!user) {
    return (
      <div className="splash">
        <div className="splash-err">
          <div className="brand">DramaHub</div>
          <p className="card-sub">Não foi possível conectar ao servidor.</p>
          <button className="btn" onClick={start}>Tentar de novo</button>
        </div>
      </div>
    )
  }

  const fullscreen = pathname.startsWith('/assistir')
  return (
    <div className={`app ${fullscreen ? 'no-nav' : ''}`}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/buscar" element={<Search />} />
        <Route path="/lista" element={<Library />} />
        <Route path="/series/:id" element={<SeriesPage />} />
        <Route path="/assistir/:id" element={<Player />} />
        <Route path="/conta" element={<Account />} />
        <Route path="/estudio" element={isAdmin ? <Studio /> : <Navigate to="/conta" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!fullscreen && <Nav />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  )
}

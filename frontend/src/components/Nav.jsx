import { NavLink } from 'react-router-dom'
import { HomeIcon, FeedIcon, SearchIcon, BookmarkIcon, UserIcon } from './Icons'

// Celular: barra inferior com "Para você" no centro. Desktop (>= 900 px): vira barra lateral (só CSS).
const items = [
  { to: '/', label: 'Início', Icon: HomeIcon },
  { to: '/buscar', label: 'Buscar', Icon: SearchIcon },
  { to: '/feed', label: 'Para você', Icon: FeedIcon, mid: true },
  { to: '/lista', label: 'Salvos', Icon: BookmarkIcon },
  { to: '/conta', label: 'Perfil', Icon: UserIcon },
]

export default function Nav() {
  return (
    <nav className="nav" aria-label="Navegação principal">
      <span className="nav-brand">DramaHub</span>
      {items.map(({ to, label, Icon, mid }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${isActive ? 'on' : ''} ${mid ? 'mid' : ''}`}>
          <span className="nav-ic"><Icon /></span>
          <span className="nav-lb">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

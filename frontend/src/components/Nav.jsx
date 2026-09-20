import { NavLink } from 'react-router-dom'
import { HomeIcon, FeedIcon, SearchIcon, HeartIcon, UserIcon } from './Icons'

const items = [
  { to: '/', label: 'Início', Icon: HomeIcon },
  { to: '/feed', label: 'Para você', Icon: FeedIcon },
  { to: '/buscar', label: 'Buscar', Icon: SearchIcon },
  { to: '/lista', label: 'Minha lista', Icon: HeartIcon },
  { to: '/conta', label: 'Conta', Icon: UserIcon },
]

export default function Nav() {
  return (
    <nav className="nav">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

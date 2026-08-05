import type { MouseEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Layout() {
  const { user, loading, refresh } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut(e: MouseEvent) {
    e.preventDefault()
    await insforge.auth.signOut()
    await refresh()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-tile">🁫</span> Dominó
        </Link>
        <div className="header-auth">
          {!loading && user && <span className="muted admin-email">{user.email}</span>}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <span className="bottom-nav-icon">🏠</span>
          Torneos
        </Link>
        <Link to="/lideres" className={location.pathname === '/lideres' ? 'active' : ''}>
          <span className="bottom-nav-icon">🏆</span>
          Líderes
        </Link>
        <Link to={user ? '#' : '/login'} onClick={user ? handleSignOut : undefined} className={location.pathname === '/login' ? 'active' : ''}>
          <span className="bottom-nav-icon">{user ? '🚪' : '👤'}</span>
          {user ? 'Salir' : 'Admin'}
        </Link>
      </nav>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'

type Mode = 'sign-in' | 'sign-up' | 'verify'

export default function LoginPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await insforge.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
    navigate('/')
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { data, error } = await insforge.auth.signUp({ email, password, name: 'Administrador' })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data?.requireEmailVerification) {
      setMode('verify')
      setInfo('Te enviamos un código de 6 dígitos a tu correo. Ingrésalo para activar la cuenta de administrador.')
    } else if (data?.accessToken) {
      await refresh()
      navigate('/')
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await insforge.auth.verifyEmail({ email, otp })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
    navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🁫 Torneos de Dominó</h1>
        <p className="auth-subtitle">Acceso de administrador</p>

        {mode === 'sign-in' && (
          <form onSubmit={handleSignIn} className="auth-form">
            <label>
              Correo
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
            <button type="button" className="link-button" onClick={() => { setMode('sign-up'); setError(null) }}>
              Crear cuenta de administrador
            </button>
          </form>
        )}

        {mode === 'sign-up' && (
          <form onSubmit={handleSignUp} className="auth-form">
            <label>
              Correo
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Contraseña (mínimo 6 caracteres)
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
            <button type="button" className="link-button" onClick={() => { setMode('sign-in'); setError(null) }}>
              Ya tengo cuenta, iniciar sesión
            </button>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="auth-form">
            {info && <p className="auth-info">{info}</p>}
            <label>
              Código de verificación
              <input value={otp} onChange={(e) => setOtp(e.target.value)} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Verificar y entrar'}</button>
          </form>
        )}

        <p className="auth-hint">La tabla de líderes y los torneos son públicos para ver; solo el administrador puede registrar partidas.</p>
      </div>
    </div>
  )
}

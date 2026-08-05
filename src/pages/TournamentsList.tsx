import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import type { Tournament } from '../types'

export default function TournamentsList() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await insforge.database
      .from('tournaments')
      .select()
      .order('created_at', { ascending: false })
    if (!error && data) setTournaments(data as Tournament[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Escribe un nombre para el torneo.')
      return
    }
    setCreating(true)
    setError(null)
    const { error } = await insforge.database
      .from('tournaments')
      .insert([{ name: name.trim() }])
      .select()
    setCreating(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    void load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Torneos</h1>
      </div>

      {user && (
        <form onSubmit={handleCreate} className="inline-form">
          <input
            placeholder="Nombre del torneo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" disabled={creating}>{creating ? 'Creando…' : '+ Nuevo torneo'}</button>
        </form>
      )}
      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : tournaments.length === 0 ? (
        <p className="empty-state">Todavía no hay torneos. {user ? 'Crea el primero arriba.' : ''}</p>
      ) : (
        <ul className="card-list">
          {tournaments.map((t) => (
            <li key={t.id} className={`card match-card ${t.status}`}>
              <Link to={`/torneos/${t.id}`}>
                <span className="card-icon">🁫</span>
                <span className="card-title">{t.name}</span>
                <span className={`badge ${t.status}`}>{t.status === 'active' ? 'En vivo' : 'Finalizado'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

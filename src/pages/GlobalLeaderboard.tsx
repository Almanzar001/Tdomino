import { useCallback, useEffect, useRef, useState } from 'react'
import { insforge } from '../lib/insforge'
import LeaderboardTable, { type LeaderboardRow } from '../components/LeaderboardTable'
import type { Tournament } from '../types'

const ALL = 'all'
const POLL_MS = 10000

export default function GlobalLeaderboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<string>(ALL)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const loadTournaments = useCallback(async () => {
    const { data, error } = await insforge.database
      .from('tournaments')
      .select()
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
    if (!error && data) setTournaments(data as Tournament[])
  }, [])

  const loadRows = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setRefreshing(true)
    const target = selectedRef.current
    if (target === ALL) {
      const { data, error } = await insforge.database
        .from('player_leaderboard')
        .select()
        .order('points', { ascending: false })
        .order('paseos', { ascending: false })
      if (!error && data) setRows(data as LeaderboardRow[])
    } else {
      const { data, error } = await insforge.database
        .from('tournament_leaderboard')
        .select()
        .eq('tournament_id', target)
        .order('points', { ascending: false })
        .order('paseos', { ascending: false })
      if (!error && data) setRows(data as LeaderboardRow[])
    }
    if (!silent) setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadTournaments()
  }, [loadTournaments])

  useEffect(() => {
    void loadRows()
  }, [selected, loadRows])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadTournaments()
      void loadRows(true)
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [loadTournaments, loadRows])

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏆 Tabla de líderes</h1>
        <button
          type="button"
          className="refresh-btn"
          onClick={() => void loadRows()}
          disabled={refreshing}
          title="Actualizar"
        >
          <span className={refreshing ? 'spin' : ''}>🔄</span>
        </button>
      </div>

      <div className="tournament-tabs">
        <button
          type="button"
          className={selected === ALL ? 'active' : ''}
          onClick={() => setSelected(ALL)}
        >
          General
        </button>
        {tournaments.map((t) => (
          <button
            key={t.id}
            type="button"
            className={selected === t.id ? 'active' : ''}
            onClick={() => setSelected(t.id)}
          >
            {t.name}
            {t.status === 'active' && <span className="tab-live-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <LeaderboardTable
          rows={rows}
          emptyMessage={
            selected === ALL
              ? 'Aún no hay partidas registradas.'
              : 'Aún no hay partidas registradas en este torneo.'
          }
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { insforge } from '../lib/insforge'
import LeaderboardTable, { type LeaderboardRow } from '../components/LeaderboardTable'
import type { Tournament } from '../types'

const ALL = 'all'

export default function GlobalLeaderboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<string>(ALL)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTournaments() {
      const { data, error } = await insforge.database
        .from('tournaments')
        .select()
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
      if (!error && data) setTournaments(data as Tournament[])
    }
    void loadTournaments()
  }, [])

  useEffect(() => {
    async function loadRows() {
      setLoading(true)
      if (selected === ALL) {
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
          .eq('tournament_id', selected)
          .order('points', { ascending: false })
          .order('paseos', { ascending: false })
        if (!error && data) setRows(data as LeaderboardRow[])
      }
      setLoading(false)
    }
    void loadRows()
  }, [selected])

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏆 Tabla de líderes</h1>
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

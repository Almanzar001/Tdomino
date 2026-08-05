import { useEffect, useState } from 'react'
import { insforge } from '../lib/insforge'
import PlayerAvatar from '../components/PlayerAvatar'
import type { PlayerLeaderboardRow } from '../types'

const MEDALS = ['🥇', '🥈', '🥉']
const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3']

export default function GlobalLeaderboard() {
  const [rows, setRows] = useState<PlayerLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await insforge.database
        .from('player_leaderboard')
        .select()
        .order('points', { ascending: false })
        .order('paseos', { ascending: false })
      if (!error && data) setRows(data as PlayerLeaderboardRow[])
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏆 Tabla de líderes general</h1>
      </div>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="empty-state">Aún no hay partidas registradas.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th title="Ganadas">G</th>
                <th title="Paseos">PA</th>
                <th title="Perdidas">PE</th>
                <th className="points-col" title="Puntos">PTS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id} className={i === 0 && r.points > 0 ? 'leader-row' : ''}>
                  <td className="rank-cell">{MEDALS[i] ?? i + 1}</td>
                  <td>
                    <span className="name-cell">
                      <span className={`avatar-slot ${RANK_CLASS[i] ?? ''}`}>
                        <PlayerAvatar name={r.player_name} url={r.player_avatar_url} size={i < 3 ? 72 : 52} />
                      </span>
                      {r.player_name}
                    </span>
                  </td>
                  <td>{r.wins}</td>
                  <td><strong>{r.paseos}</strong></td>
                  <td>{r.losses}</td>
                  <td className="points-col">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

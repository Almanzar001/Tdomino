import PlayerAvatar from './PlayerAvatar'

const MEDALS = ['🥇', '🥈', '🥉']
const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3']

export interface LeaderboardRow {
  player_id: string
  player_name: string
  player_avatar_url: string | null
  wins: number
  losses: number
  paseos: number
  points: number
}

export default function LeaderboardTable({
  rows,
  emptyMessage = 'Aún no hay partidas registradas.',
}: {
  rows: LeaderboardRow[]
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
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
  )
}

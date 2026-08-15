import { useLayoutEffect, useRef } from 'react'
import PlayerAvatar from './PlayerAvatar'

const MEDALS = ['🥇', '🥈', '🥉']
const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3']
const REORDER_MS = 500

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
  rankOffset = 0,
  compact = false,
  scale = 1,
}: {
  rows: LeaderboardRow[]
  emptyMessage?: string
  /** Rank of the first row, e.g. 10 when this table continues after a top-10 table. */
  rankOffset?: number
  /** Smaller avatars, no medal styling — for a secondary "everyone else" table. */
  compact?: boolean
  /** Proportionally scales text and avatars, e.g. 0.92 for 8% smaller. */
  scale?: number
}) {
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const prevTops = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const nextTops = new Map<string, number>()
    rowRefs.current.forEach((el, playerId) => {
      const top = el.getBoundingClientRect().top
      nextTops.set(playerId, top)
      const prevTop = prevTops.current.get(playerId)
      if (prevTop !== undefined) {
        const deltaY = prevTop - top
        if (deltaY !== 0) {
          el.style.transition = 'none'
          el.style.transform = `translateY(${deltaY}px)`
          requestAnimationFrame(() => {
            el.style.transition = `transform ${REORDER_MS}ms ease`
            el.style.transform = ''
            setTimeout(() => {
              el.style.transition = ''
            }, REORDER_MS)
          })
        }
      }
    })
    prevTops.current = nextTops
  }, [rows])

  if (rows.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <div className={`table-wrap ${compact ? 'table-compact' : ''}`} style={scale !== 1 ? { fontSize: `${scale * 100}%` } : undefined}>
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
          {rows.map((r, i) => {
            const rank = rankOffset + i + 1
            const medal = !compact ? MEDALS[rank - 1] : undefined
            const rankClass = !compact ? RANK_CLASS[rank - 1] : undefined
            return (
              <tr
                key={r.player_id}
                ref={(el) => {
                  if (el) rowRefs.current.set(r.player_id, el)
                  else rowRefs.current.delete(r.player_id)
                }}
                className={rank === 1 && r.points > 0 ? 'leader-row' : ''}
              >
                <td className="rank-cell">{medal ?? rank}</td>
                <td>
                  <span className="name-cell">
                    <span className={`avatar-slot ${rankClass ?? ''}`}>
                      <PlayerAvatar
                        name={r.player_name}
                        url={r.player_avatar_url}
                        size={Math.round((compact ? 30 : rank <= 3 ? 72 : 52) * scale)}
                      />
                    </span>
                    {r.player_name}
                  </span>
                </td>
                <td className="stat-wins">{r.wins}</td>
                <td className="stat-paseos">{r.paseos}</td>
                <td className="stat-losses">{r.losses}</td>
                <td className="points-col">{r.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

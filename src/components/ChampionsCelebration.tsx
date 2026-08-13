import PlayerAvatar from './PlayerAvatar'
import type { TournamentLeaderboardRow } from '../types'

const CONFETTI_COLORS = ['#ffcf5c', '#8a3ffc', '#ff6fb5', '#2fd980', '#4fb8ff', '#ff5b5b']
const PODIUM_ORDER: Array<{ rank: 0 | 1 | 2; slot: 'second' | 'first' | 'third' }> = [
  { rank: 1, slot: 'second' },
  { rank: 0, slot: 'first' },
  { rank: 2, slot: 'third' },
]
const MEDALS = ['🥇', '🥈', '🥉']

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i)
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((i) => {
        const left = Math.random() * 100
        const duration = 2.8 + Math.random() * 2.2
        const delay = Math.random() * 2.5
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        const size = 6 + Math.random() * 6
        const rotate = Math.random() * 360
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.4,
              background: color,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              transform: `rotate(${rotate}deg)`,
            }}
          />
        )
      })}
    </div>
  )
}

export default function ChampionsCelebration({
  tournamentName,
  top3,
  onClose,
}: {
  tournamentName: string
  top3: TournamentLeaderboardRow[]
  onClose: () => void
}) {
  return (
    <div className="celebration-overlay">
      <Confetti />
      <button type="button" className="celebration-close" onClick={onClose} title="Cerrar">✕</button>
      <div className="celebration-content">
        <p className="celebration-eyebrow">🏆 ¡Torneo finalizado!</p>
        <h1 className="celebration-title">{tournamentName}</h1>

        <div className="podium">
          {PODIUM_ORDER.map(({ rank, slot }) => {
            const row = top3[rank]
            if (!row) return <div key={slot} className={`podium-slot podium-${slot} podium-empty`} />
            return (
              <div key={slot} className={`podium-slot podium-${slot}`}>
                <div className="podium-medal">{MEDALS[rank]}</div>
                <div className={`podium-avatar rank-${rank + 1}`}>
                  <PlayerAvatar
                    name={row.player_name}
                    url={row.player_avatar_url}
                    size={slot === 'first' ? 160 : 120}
                  />
                </div>
                <div className="podium-name">{row.player_name}</div>
                <div className="podium-points">{row.points} pts</div>
                <div className={`podium-block podium-block-${slot}`}>{rank + 1}</div>
              </div>
            )
          })}
        </div>

        <button type="button" className="celebration-dismiss" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  )
}

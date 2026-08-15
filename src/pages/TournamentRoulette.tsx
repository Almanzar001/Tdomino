import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { playSpinTicks, playWinChime } from '../lib/rouletteSound'
import PlayerAvatar from '../components/PlayerAvatar'
import type { Player, Tournament, TournamentPlayer } from '../types'

const DEFAULT_TABLE_CAPACITY = 3
const DEFAULT_HANDS_PER_LITRO = 10
const SPIN_DURATION_MS = 3600
const EXTRA_SPINS = 5
const COLORS = ['#8a3ffc', '#ff6fb5', '#2fd980', '#ffcf5c', '#4fb8ff', '#ff5b5b', '#b891ff', '#ff9f4a']

function polar(cx: number, cy: number, r: number, clockAngleDeg: number) {
  const rad = (clockAngleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

function sliceLabel(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name
  return first.length > 14 ? `${first.slice(0, 13)}…` : first
}

function sliceLabelFontSize(label: string) {
  if (label.length <= 6) return 14
  if (label.length <= 8) return 12
  if (label.length <= 10) return 10.5
  if (label.length <= 12) return 9.5
  return 8.5
}

export default function TournamentRoulette() {
  const { id } = useParams<{ id: string }>()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [rosterPlayers, setRosterPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const [phase, setPhase] = useState<'setup' | 'drawing' | 'done'>('setup')
  const [tableCount, setTableCount] = useState(2)
  const [handsPerLitro, setHandsPerLitro] = useState(DEFAULT_HANDS_PER_LITRO)
  const [tables, setTables] = useState<Player[][]>([])
  const [remaining, setRemaining] = useState<Player[]>([])
  const [currentTableIndex, setCurrentTableIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [lastWinner, setLastWinner] = useState<{ player: Player; table: number } | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const [tournamentRes, rosterRes, playersRes] = await Promise.all([
        insforge.database.from('tournaments').select().eq('id', id).maybeSingle(),
        insforge.database.from('tournament_players').select().eq('tournament_id', id),
        insforge.database.from('players').select(),
      ])
      if (tournamentRes.data) setTournament(tournamentRes.data as Tournament)
      const roster = (rosterRes.data ?? []) as TournamentPlayer[]
      const players = (playersRes.data ?? []) as Player[]
      const inRoster = roster
        .map((rp) => players.find((p) => p.id === rp.player_id))
        .filter((p): p is Player => Boolean(p))
      setRosterPlayers(inRoster)
      setTableCount(Math.max(1, Math.ceil(inRoster.length / DEFAULT_TABLE_CAPACITY)) || 1)
      setLoading(false)
    }
    void load()
  }, [id])

  function startDraw() {
    if (rosterPlayers.length === 0) return
    setTables(Array.from({ length: tableCount }, () => []))
    setRemaining([...rosterPlayers])
    setCurrentTableIndex(0)
    setRotation(0)
    setLastWinner(null)
    setPhase('drawing')
  }

  function completeTable() {
    if (spinning) return
    if (currentTableIndex < tableCount - 1) {
      setCurrentTableIndex((i) => i + 1)
    } else {
      setPhase('done')
    }
  }

  function resetDraw() {
    setPhase('setup')
    setTables([])
    setRemaining([])
    setCurrentTableIndex(0)
    setLastWinner(null)
    setSaveState('idle')
    setSaveError(null)
  }

  async function persistTables() {
    if (!id) return
    const nonEmptyTables = tables
      .map((players, i) => ({ players, number: i + 1 }))
      .filter((t) => t.players.length > 0)
    if (nonEmptyTables.length === 0) return

    setSaveState('saving')
    setSaveError(null)
    try {
      // Best-effort cleanup of a previous draw for this tournament — this
      // can fail if games already reference the old tables (FK restrict),
      // which is fine: we just keep the old rows and add the new ones.
      await insforge.database.from('tables').delete().eq('tournament_id', id)

      for (const t of nonEmptyTables) {
        const { data: tableData, error: tableError } = await insforge.database
          .from('tables')
          .insert([{ tournament_id: id, table_number: t.number, hands_per_litro: handsPerLitro }])
          .select()
        if (tableError || !tableData?.[0]) {
          throw new Error(tableError?.message ?? 'No se pudo crear la mesa')
        }
        const tableId = tableData[0].id as string

        const { error: playersError } = await insforge.database
          .from('table_players')
          .insert(t.players.map((p) => ({ table_id: tableId, player_id: p.id })))
        if (playersError) throw new Error(playersError.message)

        const { error: litroError } = await insforge.database
          .from('litros')
          .insert([{ table_id: tableId, litro_number: 1, hands_played: 0, is_open: true }])
        if (litroError) throw new Error(litroError.message)
      }

      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'Error al guardar las mesas')
    }
  }

  function spin() {
    if (spinning || remaining.length === 0) return
    const idx = Math.floor(Math.random() * remaining.length)
    const winner = remaining[idx]
    const tableIdx = currentTableIndex
    const sliceAngle = 360 / remaining.length
    const winnerMid = idx * sliceAngle + sliceAngle / 2
    const desiredMod = (360 - winnerMid + 360) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    const diff = (desiredMod - currentMod + 360) % 360
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.4
    const target = rotation + diff + EXTRA_SPINS * 360 + jitter

    setSpinning(true)
    setRotation(target)
    playSpinTicks(SPIN_DURATION_MS)

    setTimeout(() => {
      setRemaining((prev) => prev.filter((p) => p.id !== winner.id))
      setTables((prev) => {
        const next = prev.map((t) => [...t])
        next[tableIdx] = [...next[tableIdx], winner]
        return next
      })
      setLastWinner({ player: winner, table: tableIdx })
      setSpinning(false)
      playWinChime()
    }, SPIN_DURATION_MS)
  }

  useEffect(() => {
    if (phase !== 'drawing') return
    if (remaining.length === 0 && tables.some((t) => t.length > 0)) {
      setPhase('done')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, remaining])

  useEffect(() => {
    if (phase !== 'done') return
    void persistTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>
  if (!tournament) return <div className="page"><p className="muted">Torneo no encontrado.</p></div>

  const size = 320
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 6
  const sliceAngle = remaining.length > 0 ? 360 / remaining.length : 360

  return (
    <div className="page">
      <div className="page-header">
        <h1>🎡 Ruleta de mesas</h1>
      </div>
      <p className="muted">{tournament.name}</p>

      {phase === 'setup' && (
        <section className="section roulette-setup">
          {rosterPlayers.length === 0 ? (
            <p className="empty-state">
              Este torneo no tiene jugadores inscritos todavía.{' '}
              <Link to={`/torneos/${id}`}>Ve a añadir jugadores</Link>.
            </p>
          ) : (
            <>
              <p className="muted">
                {rosterPlayers.length} jugador{rosterPlayers.length === 1 ? '' : 'es'} inscrito
                {rosterPlayers.length === 1 ? '' : 's'}
              </p>
              <label className="table-count-field">
                ¿Cuántas mesas?
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableCount}
                  onChange={(e) => setTableCount(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
              <label className="table-count-field">
                ¿Cuántas manos por litro?
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={handsPerLitro}
                  onChange={(e) => setHandsPerLitro(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
              <p className="muted">
                Tú decides cuántos jugadores van en cada mesa — usa "Completar mesa y seguir" cuando quieras pasar a la siguiente.
              </p>
              <button type="button" onClick={startDraw}>🎡 Empezar sorteo</button>
            </>
          )}
        </section>
      )}

      {phase !== 'setup' && (
        <section className="section roulette-stage">
          {phase === 'drawing' && (
            <div className="roulette-mesa-heading">
              <h2>Mesa {currentTableIndex + 1} de {tableCount}</h2>
              {tables[currentTableIndex]?.length ? (
                <div className="chip-list">
                  {tables[currentTableIndex].map((p) => (
                    <span key={p.id} className="chip">
                      <PlayerAvatar name={p.name} url={p.avatar_url} size={24} />
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Sin jugadores todavía.</p>
              )}
            </div>
          )}

          {phase === 'drawing' && remaining.length > 0 && (
            <div className="roulette-wheel-wrap">
              <div className="roulette-pointer" aria-hidden="true" />
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="roulette-wheel"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.65, 0.15, 1)`,
                }}
              >
                {remaining.map((p, i) => {
                  const start = i * sliceAngle
                  const end = start + sliceAngle
                  const p1 = polar(cx, cy, r, start)
                  const p2 = polar(cx, cy, r, end)
                  const largeArc = sliceAngle > 180 ? 1 : 0
                  const path =
                    remaining.length === 1
                      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                      : `M ${cx},${cy} L ${p1.x},${p1.y} A ${r},${r} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`
                  const mid = start + sliceAngle / 2
                  const labelPos = polar(cx, cy, r * 0.68, mid)
                  const label = sliceLabel(p.name)
                  return (
                    <g key={p.id}>
                      <path d={path} fill={COLORS[i % COLORS.length]} stroke="#0008" strokeWidth={1} />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        transform={`rotate(-90, ${labelPos.x}, ${labelPos.y})`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="roulette-label"
                        style={{ fontSize: sliceLabelFontSize(label) }}
                      >
                        {label}
                      </text>
                    </g>
                  )
                })}
              </svg>
              <div className="roulette-hub">🁫</div>
            </div>
          )}

          {phase === 'drawing' && (
            <div className="roulette-actions">
              <button type="button" className="roulette-spin-btn" onClick={spin} disabled={spinning || remaining.length === 0}>
                {spinning ? 'Girando…' : '🎡 Girar'}
              </button>
              <button type="button" className="secondary" onClick={completeTable} disabled={spinning}>
                ✅ Completar mesa y seguir
              </button>
              <button type="button" className="secondary danger" onClick={resetDraw} disabled={spinning}>
                🔄 Reiniciar sorteo
              </button>
            </div>
          )}

          {lastWinner && (
            <div className="roulette-winner-banner" key={lastWinner.player.id + lastWinner.table}>
              <PlayerAvatar name={lastWinner.player.name} url={lastWinner.player.avatar_url} size={40} />
              <span><strong>{lastWinner.player.name}</strong> va a la Mesa {lastWinner.table + 1}</span>
            </div>
          )}

          {phase === 'drawing' && (
            <div className="table-cards roulette-live-tables">
              {tables.map((t, i) => (
                <div key={i} className={`table-card ${i === currentTableIndex ? 'table-card-active' : ''}`}>
                  <h3>Mesa {i + 1}{i === currentTableIndex && <span className="tab-live-dot" aria-hidden="true" />}</h3>
                  {t.length === 0 ? (
                    <p className="muted">Sin jugadores todavía.</p>
                  ) : (
                    <ul className="chip-list">
                      {t.map((p) => (
                        <li key={p.id} className="chip">
                          <PlayerAvatar name={p.name} url={p.avatar_url} size={24} />
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {phase === 'done' && (
        <section className="section">
          <h2>🏆 Mesas listas</h2>
          {saveState === 'saving' && <p className="muted">Guardando mesas…</p>}
          {saveState === 'saved' && (
            <p className="muted">
              ✅ Mesas guardadas — {handsPerLitro} manos por litro. Los pagos pendientes se reinician solos cada vez que una mesa completa su litro.
            </p>
          )}
          {saveState === 'error' && (
            <div>
              <p className="auth-error">
                No se pudieron guardar las mesas{saveError ? `: ${saveError}` : ''}.
              </p>
              <button type="button" className="secondary" onClick={() => void persistTables()}>Reintentar</button>
            </div>
          )}
          <div className="table-cards">
            {tables.map((t, i) => (
              <div key={i} className="table-card">
                <h3>Mesa {i + 1}</h3>
                <ul className="chip-list">
                  {t.map((p) => (
                    <li key={p.id} className="chip">
                      <PlayerAvatar name={p.name} url={p.avatar_url} size={28} />
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {remaining.length > 0 && (
            <p className="muted">
              Sin asignar: {remaining.map((p) => p.name).join(', ')}
            </p>
          )}
          <div className="actions-row">
            <button type="button" className="secondary" onClick={resetDraw}>🎲 Repetir sorteo</button>
            <Link to={`/torneos/${id}`} className="secondary-link">Volver al torneo</Link>
          </div>
        </section>
      )}
    </div>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import { uploadPlayerPhoto } from '../lib/uploadPlayerPhoto'
import PlayerAvatar from '../components/PlayerAvatar'
import LeaderboardTable from '../components/LeaderboardTable'
import ChampionsCelebration from '../components/ChampionsCelebration'
import MesaDebtsPanel from '../components/MesaDebtsPanel'
import {
  GAME_POINTS,
  type Game,
  type LitroDebtRow,
  type LitroRow,
  type Player,
  type TablePlayer,
  type TableRow,
  type Tournament,
  type TournamentLeaderboardRow,
  type TournamentPlayer,
} from '../types'

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [roster, setRoster] = useState<TournamentPlayer[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardRow[]>([])
  const [tables, setTables] = useState<TableRow[]>([])
  const [tablePlayers, setTablePlayers] = useState<TablePlayer[]>([])
  const [openLitros, setOpenLitros] = useState<LitroRow[]>([])
  const [litroDebts, setLitroDebts] = useState<LitroDebtRow[]>([])
  const [selectedTableId, setSelectedTableId] = useState('')
  const [payBusyTableId, setPayBusyTableId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dangerBusy, setDangerBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reset' | 'delete' | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerFile, setNewPlayerFile] = useState<File | null>(null)
  const [existingPlayerId, setExistingPlayerId] = useState('')
  const [rosterBusy, setRosterBusy] = useState(false)
  const [editingAvatarFor, setEditingAvatarFor] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [renamingPlayerId, setRenamingPlayerId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [winnerId, setWinnerId] = useState('')
  const [loserId, setLoserId] = useState('')
  const [paseadorId, setPaseadorId] = useState('')
  const [gameBusy, setGameBusy] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
  const [showGameModal, setShowGameModal] = useState(false)

  function handleWinnerChange(value: string) {
    setWinnerId(value)
    if (loserId === value) setLoserId('')
    if (paseadorId === value) setPaseadorId('')
  }

  function handleLoserChange(value: string) {
    setLoserId(value)
    if (winnerId === value) setWinnerId('')
    if (paseadorId === value) setPaseadorId('')
  }

  function handlePaseadorChange(value: string) {
    setPaseadorId(value)
    if (winnerId === value) setWinnerId('')
    if (loserId === value) setLoserId('')
  }

  function closeGameModal() {
    setShowGameModal(false)
    setGameError(null)
    setWinnerId('')
    setLoserId('')
    setPaseadorId('')
    setSelectedTableId('')
  }

  async function loadAll(silent = false) {
    if (!id) return
    if (!silent) setLoading(true)
    setRefreshing(true)
    const [tournamentRes, playersRes, rosterRes, gamesRes, leaderboardRes, tablesRes, debtsRes] = await Promise.all([
      insforge.database.from('tournaments').select().eq('id', id).maybeSingle(),
      insforge.database.from('players').select().order('name', { ascending: true }),
      insforge.database.from('tournament_players').select().eq('tournament_id', id),
      insforge.database.from('games').select().eq('tournament_id', id).order('played_at', { ascending: false }),
      insforge.database
        .from('tournament_leaderboard')
        .select()
        .eq('tournament_id', id)
        .order('points', { ascending: false })
        .order('paseos', { ascending: false }),
      insforge.database.from('tables').select().eq('tournament_id', id).order('table_number', { ascending: true }),
      insforge.database.from('litro_debts').select().eq('tournament_id', id),
    ])

    if (tournamentRes.data) setTournament(tournamentRes.data as Tournament)
    if (playersRes.data) setAllPlayers(playersRes.data as Player[])
    if (rosterRes.data) setRoster(rosterRes.data as TournamentPlayer[])
    if (gamesRes.data) setGames(gamesRes.data as Game[])
    if (leaderboardRes.data) setLeaderboard(leaderboardRes.data as TournamentLeaderboardRow[])
    if (debtsRes.data) setLitroDebts(debtsRes.data as LitroDebtRow[])

    const tablesData = (tablesRes.data ?? []) as TableRow[]
    setTables(tablesData)
    const tableIds = tablesData.map((t) => t.id)
    if (tableIds.length > 0) {
      const [tpRes, litroRes] = await Promise.all([
        insforge.database.from('table_players').select().in('table_id', tableIds),
        insforge.database.from('litros').select().in('table_id', tableIds).eq('is_open', true),
      ])
      if (tpRes.data) setTablePlayers(tpRes.data as TablePlayer[])
      if (litroRes.data) setOpenLitros(litroRes.data as LitroRow[])
    } else {
      setTablePlayers([])
      setOpenLitros([])
    }

    if (!silent) setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadAll()
    const interval = setInterval(() => void loadAll(true), 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const rosterPlayers = roster
    .map((rp) => allPlayers.find((p) => p.id === rp.player_id))
    .filter((p): p is Player => Boolean(p))

  const playersNotInRoster = allPlayers.filter((p) => !roster.some((rp) => rp.player_id === p.id))

  const mesaDebtGroups = tables.map((t) => ({
    tableId: t.id,
    label: `Mesa ${t.table_number}`,
    debts: litroDebts.filter((d) => d.table_id === t.id),
  }))

  const playersForGame = selectedTableId
    ? rosterPlayers.filter((p) =>
        tablePlayers.some((tp) => tp.table_id === selectedTableId && tp.player_id === p.id)
      )
    : rosterPlayers

  function playerName(playerId: string) {
    return allPlayers.find((p) => p.id === playerId)?.name ?? '—'
  }

  function playerAvatar(playerId: string) {
    return allPlayers.find((p) => p.id === playerId)?.avatar_url ?? null
  }

  async function handleAddExisting(e: FormEvent) {
    e.preventDefault()
    if (!id || !existingPlayerId) return
    setRosterBusy(true)
    setError(null)
    const { error } = await insforge.database
      .from('tournament_players')
      .insert([{ tournament_id: id, player_id: existingPlayerId }])
    setRosterBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setExistingPlayerId('')
    void loadAll()
  }

  async function handleAddNew(e: FormEvent) {
    e.preventDefault()
    if (!id || !newPlayerName.trim()) return
    setRosterBusy(true)
    setError(null)

    let avatar_url: string | null = null
    let avatar_key: string | null = null
    if (newPlayerFile) {
      const uploaded = await uploadPlayerPhoto(newPlayerFile)
      if (uploaded.error) {
        setRosterBusy(false)
        setError(uploaded.error.message)
        return
      }
      avatar_url = uploaded.url
      avatar_key = uploaded.key
    }

    const { data: playerData, error: playerError } = await insforge.database
      .from('players')
      .insert([{ name: newPlayerName.trim(), avatar_url, avatar_key }])
      .select()
    if (playerError || !playerData?.[0]) {
      setRosterBusy(false)
      setError(playerError?.message ?? 'No se pudo crear el jugador')
      return
    }
    const { error: joinError } = await insforge.database
      .from('tournament_players')
      .insert([{ tournament_id: id, player_id: playerData[0].id }])
    setRosterBusy(false)
    if (joinError) {
      setError(joinError.message)
      return
    }
    setNewPlayerName('')
    setNewPlayerFile(null)
    void loadAll()
  }

  function triggerAvatarEdit(playerId: string) {
    setEditingAvatarFor(playerId)
    avatarInputRef.current?.click()
  }

  async function handleAvatarFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const playerId = editingAvatarFor
    e.target.value = ''
    if (!file || !playerId) return
    setRosterBusy(true)
    setError(null)
    const uploaded = await uploadPlayerPhoto(file)
    if (uploaded.error) {
      setRosterBusy(false)
      setError(uploaded.error.message)
      return
    }
    const { error } = await insforge.database
      .from('players')
      .update({ avatar_url: uploaded.url, avatar_key: uploaded.key })
      .eq('id', playerId)
    setRosterBusy(false)
    setEditingAvatarFor(null)
    if (error) {
      setError(error.message)
      return
    }
    void loadAll()
  }

  function startRename(p: Player) {
    setRenamingPlayerId(p.id)
    setRenameValue(p.name)
  }

  function cancelRename() {
    setRenamingPlayerId(null)
    setRenameValue('')
  }

  async function submitRename(e: FormEvent) {
    e.preventDefault()
    if (!renamingPlayerId || !renameValue.trim()) return
    setRosterBusy(true)
    setError(null)
    const { error } = await insforge.database
      .from('players')
      .update({ name: renameValue.trim() })
      .eq('id', renamingPlayerId)
    setRosterBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    cancelRename()
    void loadAll()
  }

  async function handleRemoveFromRoster(playerId: string) {
    if (!id) return
    const playedInTournament = games.some(
      (g) => g.winner_id === playerId || g.loser_id === playerId || g.paseador_id === playerId
    )
    if (playedInTournament) {
      setError('No puedes quitar a un jugador que ya tiene partidas registradas en este torneo.')
      return
    }
    setRosterBusy(true)
    setError(null)
    const { error } = await insforge.database
      .from('tournament_players')
      .delete()
      .eq('tournament_id', id)
      .eq('player_id', playerId)
    if (error) {
      setRosterBusy(false)
      setError(error.message)
      return
    }

    // If this was the player's last tournament and they have no games
    // anywhere, they're now an orphan record — delete them entirely so
    // they don't linger in the global leaderboard.
    const [{ data: otherRosters }, { data: anyGames }] = await Promise.all([
      insforge.database.from('tournament_players').select('tournament_id').eq('player_id', playerId),
      insforge.database
        .from('games')
        .select('id')
        .or(`winner_id.eq.${playerId},loser_id.eq.${playerId},paseador_id.eq.${playerId}`)
        .limit(1),
    ])
    if (!otherRosters?.length && !anyGames?.length) {
      await insforge.database.from('players').delete().eq('id', playerId)
    }

    setRosterBusy(false)
    void loadAll()
  }

  async function handleRegisterGame(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setGameError(null)
    if (!winnerId || !loserId || !paseadorId) {
      setGameError('Selecciona los tres jugadores.')
      return
    }
    if (winnerId === loserId || winnerId === paseadorId || loserId === paseadorId) {
      setGameError('El ganador, el perdedor y quien pasea deben ser tres jugadores distintos.')
      return
    }
    setGameBusy(true)

    let tableId: string | null = null
    let litroId: string | null = null
    if (selectedTableId) {
      tableId = selectedTableId
      const { data: freshLitro } = await insforge.database
        .from('litros')
        .select()
        .eq('table_id', selectedTableId)
        .eq('is_open', true)
        .maybeSingle()
      litroId = (freshLitro as LitroRow | null)?.id ?? null
    }

    const { error } = await insforge.database.from('games').insert([
      {
        tournament_id: id,
        winner_id: winnerId,
        loser_id: loserId,
        paseador_id: paseadorId,
        table_id: tableId,
        litro_id: litroId,
      },
    ])
    setGameBusy(false)
    if (error) {
      setGameError(error.message)
      return
    }
    closeGameModal()
    void loadAll()
  }

  async function handlePayMesa(tableId: string) {
    setPayBusyTableId(tableId)
    const { error } = await insforge.database
      .from('litros')
      .update({ paid: true })
      .eq('table_id', tableId)
      .eq('is_open', false)
      .eq('paid', false)
    setPayBusyTableId(null)
    if (error) {
      setError(error.message)
      return
    }
    void loadAll()
  }

  async function handleFinish() {
    if (!id) return
    const { error } = await insforge.database
      .from('tournaments')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      void loadAll()
      if (leaderboard.some((r) => r.points > 0)) setShowCelebration(true)
    }
  }

  async function handleReopen() {
    if (!id) return
    const { error } = await insforge.database
      .from('tournaments')
      .update({ status: 'active', finished_at: null })
      .eq('id', id)
    if (!error) void loadAll()
  }

  async function confirmResetGames() {
    if (!id) return
    setDangerBusy(true)
    setError(null)
    const { error } = await insforge.database.from('games').delete().eq('tournament_id', id)
    setDangerBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setConfirmAction(null)
    void loadAll()
  }

  async function confirmDeleteTournament() {
    if (!id) return
    setDangerBusy(true)
    setError(null)
    const { error } = await insforge.database.from('tournaments').delete().eq('id', id)
    setDangerBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setConfirmAction(null)
    navigate('/')
  }

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>
  if (!tournament) return <div className="page"><p className="muted">Torneo no encontrado.</p></div>

  return (
    <div className="page">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={handleAvatarFileChosen}
      />

      <div className="page-header">
        <h1>{tournament.name}</h1>
        <span className={`badge ${tournament.status}`}>
          {tournament.status === 'active' ? 'En vivo' : 'Finalizado'}
        </span>
        <button
          type="button"
          className="refresh-btn"
          onClick={() => void loadAll()}
          disabled={refreshing}
          title="Actualizar"
        >
          <span className={refreshing ? 'spin' : ''}>🔄</span>
        </button>
      </div>

      <div className="actions-row">
        <Link to={`/torneos/${id}/ruleta`} className="secondary-link roulette-link">
          🎡 Ruleta de mesas
        </Link>
        {tournament.status === 'finished' && leaderboard.some((r) => r.points > 0) && (
          <button type="button" className="secondary-link roulette-link" onClick={() => setShowCelebration(true)}>
            🏆 Ver campeones
          </button>
        )}
      </div>

      {showCelebration && leaderboard.length > 0 && (
        <ChampionsCelebration
          tournamentName={tournament.name}
          top3={leaderboard.slice(0, 3)}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {user && (
        <div className="actions-row">
          {tournament.status === 'active' ? (
            <button onClick={handleFinish} className="secondary">Finalizar torneo</button>
          ) : (
            <button onClick={handleReopen} className="secondary">Reabrir torneo</button>
          )}
          <button onClick={() => setConfirmAction('reset')} className="secondary danger" disabled={dangerBusy}>
            Reiniciar partidas
          </button>
          <button onClick={() => setConfirmAction('delete')} className="secondary danger" disabled={dangerBusy}>
            Eliminar torneo
          </button>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" onClick={() => !dangerBusy && setConfirmAction(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{confirmAction === 'delete' ? 'Eliminar torneo' : 'Reiniciar partidas'}</h2>
              <button type="button" className="modal-close" onClick={() => setConfirmAction(null)} disabled={dangerBusy}>✕</button>
            </div>
            <p className="muted">
              {confirmAction === 'delete'
                ? `Esto eliminará el torneo "${tournament.name}" por completo, junto con sus jugadores inscritos y todas sus partidas. Esta acción no se puede deshacer.`
                : `Esto borrará todas las partidas de "${tournament.name}" y pondrá la tabla de posiciones en cero. Los jugadores inscritos se mantienen.`}
            </p>
            {error && <p className="auth-error">{error}</p>}
            <div className="modal-confirm-actions">
              <button type="button" className="secondary" onClick={() => setConfirmAction(null)} disabled={dangerBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="danger-solid"
                onClick={confirmAction === 'delete' ? confirmDeleteTournament : confirmResetGames}
                disabled={dangerBusy}
              >
                {dangerBusy ? 'Procesando…' : 'Sí, continuar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <h2>🏆 Tabla de posiciones</h2>
        <LeaderboardTable rows={leaderboard} emptyMessage="Aún no hay partidas registradas en este torneo." />
      </section>

      {tables.length > 0 && (
        <section className="section">
          <h2>💰 Pagos pendientes</h2>
          <MesaDebtsPanel
            groups={mesaDebtGroups}
            canManage={Boolean(user)}
            busyTableId={payBusyTableId}
            onPay={handlePayMesa}
          />
        </section>
      )}

      {tables.length > 0 && (
        <section className="section">
          <h2>🎲 Manos jugadas por mesa</h2>
          <div className="table-cards">
            {tables.map((t) => {
              const litro = openLitros.find((l) => l.table_id === t.id)
              return (
                <div key={t.id} className="table-card">
                  <h3>Mesa {t.table_number}</h3>
                  <p className="muted">
                    {litro
                      ? `Litro ${litro.litro_number} · ${litro.hands_played}/${t.hands_per_litro} manos`
                      : 'Sin litro abierto'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Jugadores del torneo</h2>
        {rosterPlayers.length === 0 ? (
          <p className="empty-state">Todavía no hay jugadores inscritos.</p>
        ) : (
          <ul className="chip-list">
            {rosterPlayers.map((p) =>
              renamingPlayerId === p.id ? (
                <li key={p.id} className="chip chip-rename">
                  <form onSubmit={submitRename} className="chip-rename-form">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelRename()}
                    />
                    <button type="submit" className="chip-edit-btn" title="Guardar" disabled={rosterBusy}>✓</button>
                    <button type="button" className="chip-edit-btn" title="Cancelar" onClick={cancelRename}>✕</button>
                  </form>
                </li>
              ) : (
                <li key={p.id} className="chip">
                  <PlayerAvatar name={p.name} url={p.avatar_url} size={24} />
                  {p.name}
                  {user && (
                    <>
                      <button
                        type="button"
                        className="chip-edit-btn"
                        title="Cambiar foto"
                        onClick={() => triggerAvatarEdit(p.id)}
                        disabled={rosterBusy}
                      >
                        📷
                      </button>
                      <button
                        type="button"
                        className="chip-edit-btn"
                        title="Editar nombre"
                        onClick={() => startRename(p)}
                        disabled={rosterBusy}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="chip-edit-btn chip-delete-btn"
                        title="Quitar del torneo"
                        onClick={() => handleRemoveFromRoster(p.id)}
                        disabled={rosterBusy}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </li>
              )
            )}
          </ul>
        )}

        {user && (
          <div className="two-forms">
            <form onSubmit={handleAddExisting} className="inline-form">
              <select value={existingPlayerId} onChange={(e) => setExistingPlayerId(e.target.value)}>
                <option value="">Añadir jugador existente…</option>
                {playersNotInRoster.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button type="submit" disabled={!existingPlayerId || rosterBusy}>Añadir</button>
            </form>
            <form onSubmit={handleAddNew} className="inline-form avatar-uploader">
              <input
                placeholder="Nombre de jugador nuevo"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewPlayerFile(e.target.files?.[0] ?? null)}
              />
              <button type="submit" disabled={rosterBusy}>Crear y añadir</button>
            </form>
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
      </section>

      {user && showGameModal && (
        <div className="modal-overlay" onClick={closeGameModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar partida</h2>
              <button type="button" className="modal-close" onClick={closeGameModal}>✕</button>
            </div>
            <form onSubmit={handleRegisterGame} className="game-form">
              {tables.length > 0 && (
                <label>
                  Mesa
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      setSelectedTableId(e.target.value)
                      setWinnerId('')
                      setLoserId('')
                      setPaseadorId('')
                    }}
                  >
                    <option value="">Todos los jugadores del torneo</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>Mesa {t.table_number}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Ganador
                <select value={winnerId} onChange={(e) => handleWinnerChange(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {playersForGame
                    .filter((p) => p.id !== loserId && p.id !== paseadorId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </label>
              <label>
                Perdedor
                <select value={loserId} onChange={(e) => handleLoserChange(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {playersForGame
                    .filter((p) => p.id !== winnerId && p.id !== paseadorId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </label>
              <label>
                Pasea
                <select value={paseadorId} onChange={(e) => handlePaseadorChange(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {playersForGame
                    .filter((p) => p.id !== winnerId && p.id !== loserId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </label>
              {selectedTableId && (
                <p className="muted">
                  {(() => {
                    const litro = openLitros.find((l) => l.table_id === selectedTableId)
                    const table = tables.find((t) => t.id === selectedTableId)
                    return litro && table
                      ? `Litro ${litro.litro_number} · ${litro.hands_played}/${table.hands_per_litro} manos`
                      : 'Esta mesa no tiene un litro abierto todavía.'
                  })()}
                </p>
              )}
              <p className="muted points-rule">
                🏆 Ganador +{GAME_POINTS.win} · 🚶 Pasea +{GAME_POINTS.paseo} · ✕ Perdedor +{GAME_POINTS.loss}
              </p>
              {gameError && <p className="auth-error">{gameError}</p>}
              <button type="submit" disabled={gameBusy || playersForGame.length < 3}>
                {gameBusy ? 'Guardando…' : '🁫 Registrar partida'}
              </button>
              {playersForGame.length < 3 && (
                <p className="muted">
                  {selectedTableId
                    ? 'Esta mesa tiene menos de 3 jugadores asignados.'
                    : 'Se necesitan al menos 3 jugadores inscritos.'}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {user && (
        <button
          type="button"
          className="fab"
          title="Registrar partida"
          onClick={() => setShowGameModal(true)}
        >
          🁫
        </button>
      )}

      <section className="section">
        <h2>Historial de partidas</h2>
        {games.length === 0 ? (
          <p className="empty-state">Sin partidas todavía.</p>
        ) : (
          <ul className="game-list">
            {games.map((g) => (
              <li key={g.id}>
                <div className="game-list-players">
                  <span className="game-role win">
                    <PlayerAvatar name={playerName(g.winner_id)} url={playerAvatar(g.winner_id)} size={22} />
                    {playerName(g.winner_id)} <em>+{GAME_POINTS.win}</em>
                  </span>
                  <span className="game-role lose">
                    <PlayerAvatar name={playerName(g.loser_id)} url={playerAvatar(g.loser_id)} size={22} />
                    {playerName(g.loser_id)}
                  </span>
                  <span className="game-role walk">
                    <PlayerAvatar name={playerName(g.paseador_id)} url={playerAvatar(g.paseador_id)} size={22} />
                    {playerName(g.paseador_id)} <em>+{GAME_POINTS.paseo}</em>
                  </span>
                </div>
                <span className="muted game-date">{new Date(g.played_at).toLocaleString('es-DO')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import { uploadPlayerPhoto } from '../lib/uploadPlayerPhoto'
import PlayerAvatar from '../components/PlayerAvatar'
import { GAME_POINTS, type Game, type Player, type Tournament, type TournamentPlayer } from '../types'

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [roster, setRoster] = useState<TournamentPlayer[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }

  async function loadAll() {
    if (!id) return
    setLoading(true)
    const [tournamentRes, playersRes, rosterRes, gamesRes] = await Promise.all([
      insforge.database.from('tournaments').select().eq('id', id).maybeSingle(),
      insforge.database.from('players').select().order('name', { ascending: true }),
      insforge.database.from('tournament_players').select().eq('tournament_id', id),
      insforge.database.from('games').select().eq('tournament_id', id).order('played_at', { ascending: false }),
    ])

    if (tournamentRes.data) setTournament(tournamentRes.data as Tournament)
    if (playersRes.data) setAllPlayers(playersRes.data as Player[])
    if (rosterRes.data) setRoster(rosterRes.data as TournamentPlayer[])
    if (gamesRes.data) setGames(gamesRes.data as Game[])
    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const rosterPlayers = roster
    .map((rp) => allPlayers.find((p) => p.id === rp.player_id))
    .filter((p): p is Player => Boolean(p))

  const playersNotInRoster = allPlayers.filter((p) => !roster.some((rp) => rp.player_id === p.id))

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
    setRosterBusy(false)
    if (error) {
      setError(error.message)
      return
    }
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
    const { error } = await insforge.database.from('games').insert([
      {
        tournament_id: id,
        winner_id: winnerId,
        loser_id: loserId,
        paseador_id: paseadorId,
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

  async function handleFinish() {
    if (!id) return
    const { error } = await insforge.database
      .from('tournaments')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) void loadAll()
  }

  async function handleReopen() {
    if (!id) return
    const { error } = await insforge.database
      .from('tournaments')
      .update({ status: 'active', finished_at: null })
      .eq('id', id)
    if (!error) void loadAll()
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
      </div>

      {user && (
        <div className="actions-row">
          {tournament.status === 'active' ? (
            <button onClick={handleFinish} className="secondary">Finalizar torneo</button>
          ) : (
            <button onClick={handleReopen} className="secondary">Reabrir torneo</button>
          )}
        </div>
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
              <label>
                Ganador
                <select value={winnerId} onChange={(e) => handleWinnerChange(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {rosterPlayers
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
                  {rosterPlayers
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
                  {rosterPlayers
                    .filter((p) => p.id !== winnerId && p.id !== loserId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </label>
              <p className="muted points-rule">
                🏆 Ganador +{GAME_POINTS.win} · 🚶 Pasea +{GAME_POINTS.paseo} · ✕ Perdedor +{GAME_POINTS.loss}
              </p>
              {gameError && <p className="auth-error">{gameError}</p>}
              <button type="submit" disabled={gameBusy || rosterPlayers.length < 3}>
                {gameBusy ? 'Guardando…' : '🁫 Registrar partida'}
              </button>
              {rosterPlayers.length < 3 && <p className="muted">Se necesitan al menos 3 jugadores inscritos.</p>}
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

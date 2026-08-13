import { useCallback, useEffect, useRef, useState } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable, { type LeaderboardRow } from '../components/LeaderboardTable'
import MesaDebtsPanel, { type MesaDebtGroup } from '../components/MesaDebtsPanel'
import type { LitroDebtRow, LitroRow, TableRow, Tournament } from '../types'

const ALL = 'all'
const POLL_MS = 10000
const TOP_N = 8

export default function GlobalLeaderboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<string>(ALL)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [tables, setTables] = useState<TableRow[]>([])
  const [openLitros, setOpenLitros] = useState<LitroRow[]>([])
  const [litroDebts, setLitroDebts] = useState<LitroDebtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [topView, setTopView] = useState(false)
  const [showPayments, setShowPayments] = useState(false)
  const [payBusyKey, setPayBusyKey] = useState<string | null>(null)
  const [resetBusyTableId, setResetBusyTableId] = useState<string | null>(null)
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

  const loadMesaData = useCallback(async () => {
    const target = selectedRef.current

    const debtsQuery = insforge.database.from('litro_debts').select()
    const { data: debtsData } = target === ALL ? await debtsQuery : await debtsQuery.eq('tournament_id', target)
    if (debtsData) setLitroDebts(debtsData as LitroDebtRow[])

    const tablesQuery = insforge.database.from('tables').select()
    const { data: tablesData } = target === ALL ? await tablesQuery : await tablesQuery.eq('tournament_id', target)
    const tbls = (tablesData ?? []) as TableRow[]
    setTables(tbls)

    const tableIds = tbls.map((t) => t.id)
    if (tableIds.length > 0) {
      const { data: litroData } = await insforge.database
        .from('litros')
        .select()
        .in('table_id', tableIds)
        .eq('is_open', true)
      setOpenLitros((litroData ?? []) as LitroRow[])
    } else {
      setOpenLitros([])
    }
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
    void loadMesaData()
  }, [selected, loadRows, loadMesaData])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadTournaments()
      void loadRows(true)
      void loadMesaData()
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [loadTournaments, loadRows, loadMesaData])

  async function handlePayPlayer(tableId: string, playerId: string) {
    setPayBusyKey(`${tableId}:${playerId}`)
    await insforge.database
      .from('games')
      .update({ paid: true })
      .eq('table_id', tableId)
      .eq('loser_id', playerId)
      .eq('paid', false)
    setPayBusyKey(null)
    void loadMesaData()
  }

  async function handleResetMesa(tableId: string) {
    setResetBusyTableId(tableId)
    const litro = openLitros.find((l) => l.table_id === tableId)
    if (litro) {
      await insforge.database
        .from('litros')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('id', litro.id)
      await insforge.database
        .from('litros')
        .insert([{ table_id: tableId, litro_number: litro.litro_number + 1, hands_played: 0, is_open: true }])
    }
    setResetBusyTableId(null)
    void loadMesaData()
  }

  const emptyMessage =
    selected === ALL
      ? 'Aún no hay partidas registradas.'
      : 'Aún no hay partidas registradas en este torneo.'
  const topRows = rows.slice(0, TOP_N)
  const restRows = rows.slice(TOP_N)

  const mesaDebtGroups: MesaDebtGroup[] = tables.map((t) => {
    const litro = openLitros.find((l) => l.table_id === t.id)
    const tournamentName = selected === ALL ? tournaments.find((tour) => tour.id === t.tournament_id)?.name : undefined
    return {
      tableId: t.id,
      label: tournamentName ? `${tournamentName} · Mesa ${t.table_number}` : `Mesa ${t.table_number}`,
      litro: litro
        ? { litroNumber: litro.litro_number, handsPlayed: litro.hands_played, handsPerLitro: t.hands_per_litro }
        : null,
      debts: litroDebts.filter((d) => d.table_id === t.id),
    }
  })

  const isTripleView = showPayments && topView && restRows.length > 0

  return (
    <div className={`page ${isTripleView ? 'page-dense' : ''}`}>
      <div className="page-header">
        <h1>🏆 Tabla de líderes</h1>
        {rows.length > TOP_N && (
          <button
            type="button"
            className={`refresh-btn ${topView ? 'active' : ''}`}
            onClick={() => setTopView((v) => !v)}
            title={topView ? 'Ver tabla completa' : 'Ver Top 8'}
          >
            {topView ? '📋' : '8️⃣'}
          </button>
        )}
        {mesaDebtGroups.length > 0 && (
          <button
            type="button"
            className={`refresh-btn ${showPayments ? 'active' : ''}`}
            onClick={() => setShowPayments((v) => !v)}
            title={showPayments ? 'Ocultar pagos pendientes' : 'Ver pagos pendientes'}
          >
            💸
          </button>
        )}
        <button
          type="button"
          className="refresh-btn"
          onClick={() => {
            void loadRows()
            void loadMesaData()
          }}
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
      ) : showPayments || topView ? (
        <div className="top10-layout">
          {showPayments && mesaDebtGroups.length > 0 && (
            <div className="top10-payments">
              <h2>💰 Pagos pendientes</h2>
              <MesaDebtsPanel
                groups={mesaDebtGroups}
                canManage={Boolean(user)}
                payBusyKey={payBusyKey}
                resetBusyTableId={resetBusyTableId}
                onPayPlayer={handlePayPlayer}
                onResetMesa={handleResetMesa}
              />
            </div>
          )}
          <div className="top10-main">
            <LeaderboardTable
              rows={topView ? topRows : rows}
              emptyMessage={emptyMessage}
              scale={isTripleView ? 0.92 : 1}
            />
          </div>
          {topView && restRows.length > 0 && (
            <div className="top10-side">
              <LeaderboardTable rows={restRows} rankOffset={TOP_N} compact />
            </div>
          )}
        </div>
      ) : (
        <LeaderboardTable rows={rows} emptyMessage={emptyMessage} />
      )}
    </div>
  )
}

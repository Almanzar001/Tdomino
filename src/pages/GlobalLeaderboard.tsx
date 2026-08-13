import { useCallback, useEffect, useRef, useState } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable, { type LeaderboardRow } from '../components/LeaderboardTable'
import MesaDebtsPanel, { type MesaDebtGroup } from '../components/MesaDebtsPanel'
import type { LitroDebtRow, Tournament } from '../types'

const ALL = 'all'
const POLL_MS = 10000
const TOP_N = 8

export default function GlobalLeaderboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<string>(ALL)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [litroDebts, setLitroDebts] = useState<LitroDebtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [topView, setTopView] = useState(false)
  const [showPayments, setShowPayments] = useState(false)
  const [payBusyTableId, setPayBusyTableId] = useState<string | null>(null)
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

  const loadLitroDebts = useCallback(async () => {
    const target = selectedRef.current
    const query = insforge.database.from('litro_debts').select()
    const { data, error } = target === ALL ? await query : await query.eq('tournament_id', target)
    if (!error && data) setLitroDebts(data as LitroDebtRow[])
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
    void loadLitroDebts()
  }, [selected, loadRows, loadLitroDebts])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadTournaments()
      void loadRows(true)
      void loadLitroDebts()
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [loadTournaments, loadRows, loadLitroDebts])

  async function handlePayMesa(tableId: string) {
    setPayBusyTableId(tableId)
    await insforge.database
      .from('litros')
      .update({ paid: true })
      .eq('table_id', tableId)
      .eq('is_open', false)
      .eq('paid', false)
    setPayBusyTableId(null)
    void loadLitroDebts()
  }

  const emptyMessage =
    selected === ALL
      ? 'Aún no hay partidas registradas.'
      : 'Aún no hay partidas registradas en este torneo.'
  const topRows = rows.slice(0, TOP_N)
  const restRows = rows.slice(TOP_N)

  const mesaDebtGroups: MesaDebtGroup[] = []
  const groupIndex = new Map<string, number>()
  for (const d of litroDebts) {
    let idx = groupIndex.get(d.table_id)
    if (idx === undefined) {
      idx = mesaDebtGroups.length
      groupIndex.set(d.table_id, idx)
      const tournamentName = selected === ALL ? tournaments.find((t) => t.id === d.tournament_id)?.name : undefined
      mesaDebtGroups.push({
        tableId: d.table_id,
        label: tournamentName ? `${tournamentName} · Mesa ${d.table_number}` : `Mesa ${d.table_number}`,
        debts: [],
      })
    }
    mesaDebtGroups[idx].debts.push(d)
  }

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
            void loadLitroDebts()
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
                busyTableId={payBusyTableId}
                onPay={handlePayMesa}
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

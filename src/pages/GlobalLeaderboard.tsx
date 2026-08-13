import { useCallback, useEffect, useRef, useState } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable, { type LeaderboardRow } from '../components/LeaderboardTable'
import LossPaymentsPanel, { type LossDebt } from '../components/LossPaymentsPanel'
import type { Tournament } from '../types'

const ALL = 'all'
const POLL_MS = 10000
const TOP_N = 10

export default function GlobalLeaderboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<string>(ALL)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [paymentsBusy, setPaymentsBusy] = useState(false)
  const [topView, setTopView] = useState(false)
  const [showPayments, setShowPayments] = useState(false)
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

  const loadPaidMap = useCallback(async () => {
    const { data, error } = await insforge.database.from('players').select('id, losses_paid')
    if (!error && data) {
      const map: Record<string, boolean> = {}
      for (const p of data as { id: string; losses_paid: boolean }[]) map[p.id] = p.losses_paid
      setPaidMap(map)
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
    void loadPaidMap()
  }, [selected, loadRows, loadPaidMap])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadTournaments()
      void loadRows(true)
      void loadPaidMap()
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [loadTournaments, loadRows, loadPaidMap])

  async function handlePay(playerId: string) {
    setPaymentsBusy(true)
    setPaidMap((prev) => ({ ...prev, [playerId]: true }))
    await insforge.database.from('players').update({ losses_paid: true }).eq('id', playerId)
    setPaymentsBusy(false)
  }

  async function handleResetPayments() {
    const ids = debts.map((d) => d.player_id)
    if (ids.length === 0) return
    setPaymentsBusy(true)
    setPaidMap((prev) => {
      const next = { ...prev }
      for (const id of ids) next[id] = false
      return next
    })
    await insforge.database.from('players').update({ losses_paid: false }).in('id', ids)
    setPaymentsBusy(false)
  }

  const emptyMessage =
    selected === ALL
      ? 'Aún no hay partidas registradas.'
      : 'Aún no hay partidas registradas en este torneo.'
  const topRows = rows.slice(0, TOP_N)
  const restRows = rows.slice(TOP_N)
  const debts: LossDebt[] = rows
    .filter((r) => r.losses > 0)
    .map((r) => ({
      player_id: r.player_id,
      player_name: r.player_name,
      player_avatar_url: r.player_avatar_url,
      losses: r.losses,
      paid: paidMap[r.player_id] ?? false,
    }))
    .sort((a, b) => b.losses - a.losses)

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏆 Tabla de líderes</h1>
        {rows.length > TOP_N && (
          <button
            type="button"
            className={`refresh-btn ${topView ? 'active' : ''}`}
            onClick={() => setTopView((v) => !v)}
            title={topView ? 'Ver tabla completa' : 'Ver Top 10'}
          >
            {topView ? '📋' : '🔟'}
          </button>
        )}
        {debts.length > 0 && (
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
            void loadPaidMap()
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
          {showPayments && debts.length > 0 && (
            <div className="top10-payments">
              <LossPaymentsPanel
                debts={debts}
                canManage={Boolean(user)}
                busy={paymentsBusy}
                onPay={handlePay}
                onReset={handleResetPayments}
              />
            </div>
          )}
          <div className="top10-main">
            <LeaderboardTable rows={topView ? topRows : rows} emptyMessage={emptyMessage} />
          </div>
          {topView && restRows.length > 0 && (
            <div className="top10-side">
              <h2>El resto</h2>
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

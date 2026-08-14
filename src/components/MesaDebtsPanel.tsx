import PlayerAvatar from './PlayerAvatar'
import type { LitroDebtRow } from '../types'

export interface MesaDebtGroup {
  tableId: string
  label: string
  handsPlayed: number | null
  handsPerLitro: number | null
  debts: LitroDebtRow[]
}

export default function MesaDebtsPanel({
  groups,
  canManage = false,
  payBusyKey = null,
  resetBusyTableId = null,
  onPayPlayer,
  onResetMesa,
}: {
  groups: MesaDebtGroup[]
  canManage?: boolean
  payBusyKey?: string | null
  resetBusyTableId?: string | null
  onPayPlayer?: (tableId: string, playerId: string) => void
  onResetMesa?: (tableId: string) => void
}) {
  if (groups.length === 0) return null

  return (
    <div className="table-cards">
      {groups.map((g) => {
        return (
          <div key={g.tableId} className="table-card">
            <div className="mesa-debts-header">
              <h3>{g.label}</h3>
              <div className="mesa-debts-header-actions">
                {g.handsPlayed !== null && (
                  <span className="muted mesa-hands-count">
                    {g.handsPlayed}
                    {g.handsPerLitro !== null ? `/${g.handsPerLitro}` : ''} manos
                  </span>
                )}
                {canManage && onResetMesa && (() => {
                  const ready = g.handsPlayed !== null && g.handsPerLitro !== null && g.handsPlayed >= g.handsPerLitro
                  return (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onResetMesa(g.tableId)}
                      disabled={resetBusyTableId === g.tableId || !ready}
                      title={ready ? 'Reiniciar' : 'Se habilita al completar las manos del litro'}
                    >
                      {resetBusyTableId === g.tableId ? '…' : '🔄'}
                    </button>
                  )
                })()}
              </div>
            </div>
            {g.debts.length === 0 ? (
              <p className="muted">Sin pagos pendientes.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Jugador</th>
                      <th>Debe</th>
                      {canManage && onPayPlayer && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {g.debts.map((d) => {
                      const key = `${g.tableId}:${d.player_id}`
                      return (
                        <tr key={d.player_id} className={d.all_paid ? 'mesa-debt-row-paid' : ''}>
                          <td>
                            <span className="name-cell">
                              <PlayerAvatar name={d.player_name} url={d.player_avatar_url} size={26} />
                              {d.player_name}
                            </span>
                          </td>
                          <td className="stat-losses">{d.losses}</td>
                          {canManage && onPayPlayer && (
                            <td>
                              <button
                                type="button"
                                className="loss-pay-btn"
                                onClick={() => onPayPlayer(g.tableId, d.player_id)}
                                disabled={payBusyKey === key || d.all_paid}
                              >
                                {payBusyKey === key ? '…' : d.all_paid ? 'Pagado' : 'Pagar'}
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

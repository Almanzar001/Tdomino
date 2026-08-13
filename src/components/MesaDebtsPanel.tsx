import PlayerAvatar from './PlayerAvatar'
import { PESO_PER_HAND, type LitroDebtRow } from '../types'

export interface MesaLitroInfo {
  litroNumber: number
  handsPlayed: number
  handsPerLitro: number
}

export interface MesaDebtGroup {
  tableId: string
  label: string
  litro: MesaLitroInfo | null
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
        const total = g.debts.reduce((sum, d) => sum + d.losses, 0) * PESO_PER_HAND
        return (
          <div key={g.tableId} className="table-card">
            <div className="mesa-debts-header">
              <h3>{g.label}</h3>
              {canManage && onResetMesa && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onResetMesa(g.tableId)}
                  disabled={resetBusyTableId === g.tableId}
                >
                  {resetBusyTableId === g.tableId ? 'Reiniciando…' : '🔄 Reiniciar'}
                </button>
              )}
            </div>
            {g.litro && (
              <p className="muted">
                Litro {g.litro.litroNumber} · {g.litro.handsPlayed}/{g.litro.handsPerLitro} manos
              </p>
            )}
            {g.debts.length === 0 ? (
              <p className="muted">Sin pagos pendientes.</p>
            ) : (
              <>
                <p className="muted mesa-debts-total">
                  Total: <strong>${total}</strong>
                </p>
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
                          <tr key={d.player_id}>
                            <td>
                              <span className="name-cell">
                                <PlayerAvatar name={d.player_name} url={d.player_avatar_url} size={26} />
                                {d.player_name}
                              </span>
                            </td>
                            <td>${d.losses * PESO_PER_HAND}</td>
                            {canManage && onPayPlayer && (
                              <td>
                                <button
                                  type="button"
                                  className="loss-pay-btn"
                                  onClick={() => onPayPlayer(g.tableId, d.player_id)}
                                  disabled={payBusyKey === key}
                                >
                                  {payBusyKey === key ? '…' : 'Pagar'}
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

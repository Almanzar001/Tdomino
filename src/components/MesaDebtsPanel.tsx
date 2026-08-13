import PlayerAvatar from './PlayerAvatar'
import { PESO_PER_HAND, type LitroDebtRow } from '../types'

export interface MesaDebtGroup {
  tableId: string
  label: string
  debts: LitroDebtRow[]
}

export default function MesaDebtsPanel({
  groups,
  canManage = false,
  busyTableId = null,
  onPay,
}: {
  groups: MesaDebtGroup[]
  canManage?: boolean
  busyTableId?: string | null
  onPay?: (tableId: string) => void
}) {
  if (groups.length === 0) return null

  return (
    <div className="table-cards">
      {groups.map((g) => (
        <div key={g.tableId} className="table-card">
          <div className="mesa-debts-header">
            <h3>{g.label}</h3>
            {canManage && onPay && g.debts.length > 0 && (
              <button
                type="button"
                className="loss-pay-btn"
                onClick={() => onPay(g.tableId)}
                disabled={busyTableId === g.tableId}
              >
                {busyTableId === g.tableId ? 'Pagando…' : 'Pagar'}
              </button>
            )}
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
                  </tr>
                </thead>
                <tbody>
                  {g.debts.map((d) => (
                    <tr key={d.player_id}>
                      <td>
                        <span className="name-cell">
                          <PlayerAvatar name={d.player_name} url={d.player_avatar_url} size={26} />
                          {d.player_name}
                        </span>
                      </td>
                      <td>${d.losses * PESO_PER_HAND}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

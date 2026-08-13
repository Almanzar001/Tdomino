import PlayerAvatar from './PlayerAvatar'

export interface LossDebt {
  player_id: string
  player_name: string
  player_avatar_url: string | null
  losses: number
  paid: boolean
}

export default function LossPaymentsPanel({
  debts,
  canManage,
  busy,
  onPay,
  onReset,
}: {
  debts: LossDebt[]
  canManage: boolean
  busy: boolean
  onPay: (playerId: string) => void
  onReset: () => void
}) {
  if (debts.length === 0) return null

  return (
    <div className="loss-payments">
      <div className="loss-payments-header">
        <h2>💸 Pagos pendientes</h2>
        {canManage && (
          <button type="button" className="secondary" onClick={onReset} disabled={busy}>
            🔄 Reiniciar
          </button>
        )}
      </div>
      <ul className="loss-payments-list">
        {debts.map((d) => (
          <li key={d.player_id} className={`loss-payment-row ${d.paid ? 'paid' : ''}`}>
            <span className="name-cell">
              <PlayerAvatar name={d.player_name} url={d.player_avatar_url} size={32} />
              {d.player_name}
            </span>
            <span className="loss-count" title={`${d.losses} perdida${d.losses === 1 ? '' : 's'}`}>
              {d.losses}P
            </span>
            {canManage ? (
              d.paid ? (
                <span className="loss-paid-badge">✅ Pago</span>
              ) : (
                <button type="button" className="loss-pay-btn" onClick={() => onPay(d.player_id)} disabled={busy}>
                  Pagar
                </button>
              )
            ) : (
              <span className={d.paid ? 'loss-paid-badge' : 'loss-pending-badge'}>
                {d.paid ? '✅ Pago' : 'Pendiente'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

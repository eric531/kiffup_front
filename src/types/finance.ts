export interface PartnerBalances {
  locked: number
  available: number
  withdrawal_pending: number
  paid_out: number
}

export interface UpcomingRelease {
  reference: string | null
  amount: number
  available_at: string | null
}

export interface LedgerLine {
  id: number
  account: string
  kind: string
  amount: number
  reference: string | null
  created_at: string
}

export interface PartnerFinance {
  balances: PartnerBalances
  upcoming_releases: UpcomingRelease[]
  min_withdrawal_amount: number
  /** Transfer fee deducted from each withdrawal: percentage (basis points, rounded up) + fixed part. */
  withdrawal_fee: { bp: number; fixed: number }
  withdrawals_left_today: number
  payout: { method: string | null; account: string | null }
  entries: LedgerLine[]
}

/** processing → paid | failed. requested / rejected: former flow (admin validation), history only. */
export type WithdrawalStatus = 'processing' | 'paid' | 'failed' | 'requested' | 'rejected'

export interface Withdrawal {
  id: number
  reference: string
  /** Debited from the balance. */
  amount: number
  fee: number
  /** Received by the partner (amount − fee). */
  net_amount: number
  method: string
  account: string
  status: WithdrawalStatus
  payout_reference: string | null
  note: string | null
  processed_at: string | null
  created_at: string | null
  // Back-office only
  provider?: string | null
  provider_fee?: number | null
  attempts?: number
  partner?: { id: number; name: string } | null
}

/** Response of the code request: amounts shown before confirming. */
export interface WithdrawalCodeResult {
  amount: number
  fee: number
  net_amount: number
  sent_to?: string
  expires_in_minutes: number
  /** Local development only (WhatsApp messages are only logged). */
  dev_code?: string
}

/** Same rule as the API: percentage rounded up + fixed part. */
export function withdrawalFee(amount: number, fee: { bp: number; fixed: number }): number {
  return Math.ceil((amount * fee.bp) / 10_000) + fee.fixed
}

export interface FinanceSummary {
  platform: {
    commission: number
    penalties: number
    gateway_fees: number
    withdrawal_fees: number
    /** Boosts and Vitrine subscriptions paid by partners (V3, lot F3). */
    promotions: number
    /** Passes Vitrine paid by customers (V3, lot F8). */
    vitrine_passes: number
    net: number
  }
  partners: PartnerBalances
  customer_refunds: number
  refunds_to_handle: number
  /** Transfers not confirmed yet by the provider. */
  withdrawals_processing: { count: number; amount: number }
  /** Failed transfers of the last 7 days (refunded to the partners' balances). */
  withdrawals_failed_recent: number
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  processing: 'En cours d’envoi',
  paid: 'Versé',
  failed: 'Échoué, remis sur le solde',
  requested: 'Demandé (ancien circuit)',
  rejected: 'Refusé (ancien circuit)',
}

/** Human labels of journal lines, from the partner's point of view. */
export function ledgerLineLabel(line: LedgerLine): string {
  switch (line.kind) {
    case 'booking_paid':
      return 'Réservation payée (bloquée)'
    case 'release':
      return line.amount > 0 ? 'Débloqué : disponible au retrait' : 'Fin du blocage'
    case 'cancellation':
      return 'Annulation de la réservation'
    case 'withdrawal_requested':
      return line.amount < 0 ? 'Retrait' : 'Retrait en cours d’envoi'
    case 'withdrawal_paid':
      return line.amount > 0 ? 'Retrait versé (net de frais)' : 'Retrait envoyé'
    case 'withdrawal_failed':
      return line.amount > 0 ? 'Virement échoué : montant rendu' : 'Virement échoué'
    case 'withdrawal_rejected':
      return line.amount > 0 ? 'Retrait refusé : montant rendu' : 'Retrait refusé'
    default:
      return line.kind
  }
}

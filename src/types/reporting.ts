export interface EventReport {
  event: {
    id: number
    name: string
    slug: string | null
    status: string | null
    starts_at: string | null
  }
  orders: number
  units: number
  revenue: number
  partner_amount: number
  commission: number
  cancelled: number
  units_checked_in: number
  stock_total: number
  stock_available: number
  fill_rate_permille: number | null
  check_in_rate_permille: number | null
}

export interface ReportOverview {
  events: EventReport[]
  daily: { date: string; orders: number; revenue: number }[]
  totals: { orders: number; units: number; revenue: number; commission: number; cancelled: number }
  /** What "Découvrir" brings (V3, lot F3). */
  discovery: {
    bookings: { orders: number; revenue: number; commission: number }
    boosts: { count: number; amount: number }
    subscriptions: { count: number; amount: number }
    spotlights: { count: number; amount: number }
    active_boosts: number
  }
}

export interface AuditLog {
  id: number
  actor: { id: number | null; name: string | null; role: string | null }
  action: string
  method: string
  path: string
  subject: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  status: number
  ip: string | null
  created_at: string
}

/** Human labels of audited actions (route names). Unknown ones fall back to the raw name. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'admin.staff-users.store': 'Création d’un compte administrateur',
  'admin.staff-users.update': 'Modification d’un compte administrateur',
  'admin.events.store': 'Création d’un événement',
  'admin.events.update': 'Modification d’un événement',
  'admin.events.destroy': 'Suppression d’un événement',
  'admin.events.cover.store': 'Visuel d’événement ajouté',
  'admin.events.cover.destroy': 'Visuel d’événement retiré',
  'admin.partners.store': 'Création d’un partenaire',
  'admin.partners.update': 'Modification d’un partenaire',
  'admin.partners.account.store': 'Compte de connexion partenaire créé',
  'admin.listings.store': 'Création d’une offre',
  'admin.listings.update': 'Modification d’une offre',
  'admin.listings.destroy': 'Suppression d’une offre',
  'admin.listings.photos.store': 'Photo d’offre ajoutée',
  'admin.listings.photos.destroy': 'Photo d’offre supprimée',
  'admin.event-listings.store': 'Offre proposée à un événement',
  'admin.event-listings.update': 'Proposition d’offre modifiée',
  'admin.event-listings.destroy': 'Offre retirée d’un événement',
  'admin.settings.update': 'Modification des paramètres',
  'admin.bookings.cancel': 'Annulation d’une réservation (admin)',
  'admin.withdrawals.pay': 'Retrait marqué versé (ancien circuit)',
  'admin.withdrawals.reject': 'Retrait refusé (ancien circuit)',
  'partner.check-in.store': 'Arrivée d’un client enregistrée',
  'partner.withdrawals.code': 'Code de retrait demandé',
  'partner.withdrawals.store': 'Retrait (virement immédiat)',
}

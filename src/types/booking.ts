import type { PriceBreakdown, PricingUnit } from '@/types/catalog'

export type BookingStatus =
  'pending' | 'requested' | 'paid' | 'expired' | 'failed' | 'conflict' | 'cancelled'

/** Session (V3, lot F4): agreement on the time and answer to the reminders. */
export interface BookingSession {
  starts_at: string
  minutes: number | null
  /** The partner confirms, proposes another time or refuses before. */
  response_due_at: string | null
  /** Other time proposed by the partner, to accept before proposal_due_at. */
  proposed_starts_at: string | null
  proposal_due_at: string | null
  confirmed_at: string | null
  attendance: 'confirmed' | 'declined' | null
}

export interface BookingQuote {
  listing_id: number
  is_bookable: boolean
  quantity: number
  max_quantity: number
  remaining: number
  /** 'stay' = single price; 'night' / 'day' = amounts multiplied by the duration */
  pricing_unit: PricingUnit
  duration: number
  /** Y-m-d, null for a single price */
  stay_starts_on: string | null
  stay_ends_on: string | null
  /** Session: requested start (ISO) and length. */
  session_starts_at: string | null
  session_minutes: number | null
  unit_price: number
  total: number
  is_deductible: boolean
  unit_service_price: number | null
  balance_due_on_site: number | null
  /** Full rental cost at the partner's for the whole order. */
  service_price_total: number | null
  breakdown: {
    unit: PriceBreakdown
    partner_amount: number
    markup_amount: number
    service_fee: number
    total: number
  }
  /** Everything the stay costs: paid online + left to pay on site. */
  grand_total: number | null
  cancellable_until: string | null
  cancellation_penalty_bp: number
}

export interface BookingItem {
  listing_id: number
  type: string
  title: string
  quantity: number
  /** 'stay' = single price; 'night' / 'day' = amounts multiplied by the duration */
  pricing_unit: PricingUnit
  duration: number
  /** Y-m-d, null for a single price */
  stay_starts_on: string | null
  stay_ends_on: string | null
  session_starts_at: string | null
  session_minutes: number | null
  unit_price: number
  unit_partner_base: number
  unit_partner_amount: number
  unit_commission: number
  markup_bp: number
  total: number
  is_deductible: boolean
  unit_service_price: number | null
  balance_due_on_site: number | null
  checked_in_at: string | null
  partner_id?: number
  line_partner_amount?: number
  line_commission?: number
}

export interface Booking {
  code: string
  status: BookingStatus
  /** Event package orders only. */
  event_id: number | null
  event: { slug: string; name: string; starts_at: string; venue: string; city: string } | null
  customer: { name: string; phone: string; email: string | null }
  amount_total: number
  balance_due_on_site: number | null
  /** Transparency: detail of the price paid and cost of the rental (frozen at checkout). */
  price_breakdown: {
    partner_amount: number
    markup_amount: number
    service_fee: number
    total: number
    service_price_total: number | null
    balance_due_on_site: number | null
    grand_total: number | null
  }
  hold_expires_at?: string | null
  paid_at: string | null
  cancellable_until: string | null
  is_cancellable: boolean
  cancellation_penalty_bp: number | null
  cancellation_preview?: { penalty: number; refund: number }
  cancelled_at: string | null
  penalty_amount: number | null
  refund_amount: number | null
  cancelled_by?: string | null
  cancellation_reason?: string | null
  session: BookingSession | null
  items: BookingItem[]
  created_at: string | null
  /** "Mes réservations" of a customer account only: opens the tracking page on any device. */
  tracking_token?: string
  // Back-office only
  id?: number
  total_partner_amount?: number
  total_commission?: number
  payment_fee?: number | null
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Paiement en attente',
  requested: 'En attente du partenaire',
  paid: 'Confirmée',
  expired: 'Expirée',
  failed: 'Paiement échoué',
  conflict: 'À rembourser',
  cancelled: 'Annulée',
}

/** Countries offered for the customer phone (diaspora first after Côte d'Ivoire). */
export const PHONE_COUNTRIES = [
  { code: 'CI', label: "Côte d'Ivoire", dial: '+225' },
  { code: 'FR', label: 'France', dial: '+33' },
  { code: 'BE', label: 'Belgique', dial: '+32' },
  { code: 'CH', label: 'Suisse', dial: '+41' },
  { code: 'CA', label: 'Canada', dial: '+1' },
  { code: 'US', label: 'États-Unis', dial: '+1' },
  { code: 'GB', label: 'Royaume-Uni', dial: '+44' },
  { code: 'DE', label: 'Allemagne', dial: '+49' },
  { code: 'IT', label: 'Italie', dial: '+39' },
  { code: 'ES', label: 'Espagne', dial: '+34' },
  { code: 'SN', label: 'Sénégal', dial: '+221' },
  { code: 'ML', label: 'Mali', dial: '+223' },
  { code: 'BF', label: 'Burkina Faso', dial: '+226' },
  { code: 'GH', label: 'Ghana', dial: '+233' },
  { code: 'TG', label: 'Togo', dial: '+228' },
  { code: 'BJ', label: 'Bénin', dial: '+229' },
  { code: 'CM', label: 'Cameroun', dial: '+237' },
  { code: 'MA', label: 'Maroc', dial: '+212' },
] as const

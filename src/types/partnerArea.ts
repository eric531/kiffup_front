import type { BookingSession } from '@/types/booking'
import type { ListingType, PricingUnit } from '@/types/catalog'

export interface PartnerBookingLine {
  code: string
  status: 'requested' | 'paid' | 'cancelled'
  customer: { name: string; phone: string }
  event: { id: number; name: string; starts_at: string } | null
  title: string
  quantity: number
  /** 'stay' = single price; 'night' / 'day' = amounts multiplied by the duration */
  pricing_unit: PricingUnit
  duration: number
  /** Y-m-d, null for a single price */
  stay_starts_on: string | null
  stay_ends_on: string | null
  /** Session request or confirmed session (V3, lot F4). */
  session:
    (BookingSession & { cancelled_by: string | null; cancellation_reason: string | null }) | null
  partner_amount: number
  balance_due_on_site: number | null
  is_deductible: boolean
  paid_at: string | null
  /** The customer came from one of the partner's "Découvrir" videos (RG43). */
  origin_video_id: number | null
  cancelled_at: string | null
  checked_in_at: string | null
  /** "qr": the customer's QR code was scanned; "code": typed (a session's deposit then keeps its usual lock). */
  checked_in_via: 'qr' | 'code' | null
}

/** Free units per day of one of the partner's listings (occupancy grid). */
export interface PartnerOccupancy {
  id: number
  title: string
  type: ListingType
  units: number
  /** Y-m-d → free units */
  days: Record<string, number>
}

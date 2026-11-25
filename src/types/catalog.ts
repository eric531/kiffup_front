export type EventStatus = 'draft' | 'published' | 'closed' | 'archived'
export type ListingType = 'residence' | 'hotel_room' | 'car' | 'parking' | 'package' | 'service'
/** pending_review / rejected: listings created by the partners, decided by the admin (V3, lot F6). */
export type ListingStatus = 'active' | 'hidden' | 'pending_review' | 'rejected'
/**
 * stay = event package (single price for the event nights); night / day = per night / per day, dates chosen;
 * session = a session at a date and time, confirmed by the partner (V3, lot F4)
 */
export type PricingUnit = 'stay' | 'night' | 'day' | 'session'

/** Opening range of a weekday (ISO weekday, 1 = Monday), "HH:MM" in Abidjan time. */
export interface OpeningRange {
  day: number
  opens: string
  closes: string
}

/** When a session can be requested (V3, lot F4): every 30 min inside the opening hours. */
export interface SessionRules {
  minutes: number
  step_minutes: number
  available_from: string
  available_until: string
  opening_hours: OpeningRange[]
  /** Exceptional closing days (Y-m-d). */
  closed_dates: string[]
}

/** Bookable dates of a listing priced per night or per day (Y-m-d). */
export interface StayRules {
  available_from: string
  available_until: string
  min_duration: number
  max_duration: number | null
  default_starts_on: string
  default_ends_on: string
}
export type PartnerType =
  | 'hotel'
  | 'residence'
  | 'car_rental'
  | 'parking'
  | 'wellness'
  | 'restaurant'
  | 'leisure'
  | 'event_space'
  | 'other'
/** V3: Vitrine = videos and contacts only; Réservable = listings paid online too. */
export type PartnerProfile = 'showcase' | 'bookable'
/** V3, lot F6: may the partner create and change its own listings? */
export type ListingsAccess = 'none' | 'review' | 'direct'
export type PayoutMethod = 'wave' | 'orange_money' | 'mtn_money' | 'moov_money' | 'bank_transfer'

export interface PricingTier {
  days_before: number
  /** null = bookings closed from this tier on */
  markup_bp: number | null
}

export interface EventPricing {
  days_remaining: number
  markup_bp: number | null
  closed: boolean
  next_change_at: string | null
  next_markup_bp: number | null
  next_closes: boolean
}

export interface EventItem {
  id: number
  slug: string
  name: string
  artist: string | null
  description: string | null
  city: string
  venue: string
  address: string | null
  latitude: number | null
  longitude: number | null
  starts_at: string
  ends_at: string | null
  booking_closes_at: string | null
  status: EventStatus
  is_bookable: boolean
  cover_url: string | null
  pricing: EventPricing
  // Back-office only (null = global setting)
  pricing_tiers?: PricingTier[] | null
  effective_pricing_tiers?: PricingTier[]
  cancellation_window_hours?: number | null
  cancellation_cutoff_hours?: number | null
  cancellation_penalty_bp?: number | null
  created_at?: string
  updated_at?: string
}

/** Detail of a price paid online (transparency): partner share + date markup + service fee. */
export interface PriceBreakdown {
  partner_base_amount: number
  /** Dynamic markup of an event package (basis points), 0 otherwise. */
  markup_bp: number
  markup_amount: number
  partner_amount: number
  /** KiffUp service fee (payment fees included). */
  service_fee: number
  customer_price: number
}

/** Price of one tariff: one night, one day, or the whole event package. */
export interface TariffPrice {
  customer_price: number
  /** Full rental cost at the partner's. */
  service_price: number | null
  balance_due_on_site: number | null
  is_deductible: boolean
  breakdown: PriceBreakdown
}

export interface ListingTariffs {
  night: TariffPrice | null
  day: TariffPrice | null
  /** One session: the deposit paid online (V3, lot F4). */
  session: TariffPrice | null
}

/**
 * A partner's listing (V2): bookable all year per night and/or per day,
 * and proposed to events with an optional event package (EventListing).
 */
export interface Listing {
  id: number
  type: ListingType
  title: string
  description: string | null
  city: string | null
  address: string | null
  capacity: number | null
  units: number
  status: ListingStatus
  /** Visible, with units, partner active (availability per date: see the quote / calendar). */
  is_bookable: boolean
  max_quantity_per_order: number | null
  is_deductible: boolean
  tariffs: ListingTariffs
  /** Bookable dates per tariff, null when the tariff is not offered. */
  stay: { night: StayRules | null; day: StayRules | null }
  /** Session: length, bookable days and opening hours; null when not offered or no opening hours yet. */
  session: SessionRules | null
  session_minutes: number | null
  partner: { id: number; name: string; city: string } | null
  photos: { id: number; url: string }[]
  // Partner area & back-office: what the partner receives per night / per day
  night_amount?: number | null
  day_amount?: number | null
  session_amount?: number | null
  night_service_price?: number | null
  day_service_price?: number | null
  session_service_price?: number | null
  min_duration?: number | null
  max_duration?: number | null
  max_quantity_per_order_override?: number | null
  proposals?: EventListing[]
  /** Reason of the admin's refusal (V3, lot F6). */
  review_note?: string | null
  /** Last change made by the partner itself. */
  partner_updated_at?: string | null
  // Back-office only
  partner_id?: number
  commission_rate_bp?: number | null
  effective_commission_rate_bp?: number
  commission?: { night: number | null; day: number | null; session: number | null }
  sort_order?: number
  created_at?: string
}

/** Event package of a proposal: a single price for the nights [starts_on, ends_on). */
export interface EventPackage extends TariffPrice {
  markup_bp: number
  starts_on: string
  ends_on: string
  nights: number
  /** Units free for the whole package. */
  available: number
  is_bookable: boolean
  // Partner area & back-office
  partner_amount?: number
  partner_amount_now?: number
  // Back-office only
  commission?: number
}

/** A listing proposed to an event. */
export interface EventListing {
  id: number
  event_id: number
  event: { id: number; slug: string; name: string; starts_at: string } | null
  package: EventPackage | null
  /** Night / day dates pre-selected on the event day. */
  stay: { night: StayRules | null; day: StayRules | null }
  distance_km: number | null
  is_active: boolean
  sort_order: number
  /** Absent when the proposal is listed inside its listing. */
  listing?: Listing
  // Back-office only
  service_price?: number | null
}

export interface PartnerAccount {
  id: number
  name: string
  /** Login number (E.164) */
  phone: string | null
  email: string | null
  is_active: boolean
  last_login_at: string | null
}

export interface Partner {
  id: number
  name: string
  type: PartnerType
  profile: PartnerProfile
  listings_access: ListingsAccess
  description: string | null
  contact_name: string | null
  phone: string
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string
  latitude: number | null
  longitude: number | null
  payout_method: PayoutMethod | null
  payout_account: string | null
  commission_rate_bp: number | null
  is_active: boolean
  /** Sessions are requested inside these hours (V3, lot F4). */
  opening_hours: OpeningRange[]
  closed_dates: string[]
  accounts: PartnerAccount[]
  created_at: string | null
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  closed: 'Réservations closes',
  archived: 'Archivé',
}

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  residence: 'Résidence',
  hotel_room: "Chambre d'hôtel",
  car: 'Voiture',
  parking: 'Parking',
  package: 'Pack',
  service: 'Massage, soin ou activité',
}

/** "Réserver" page: listing types grouped by what the customer wants to do. */
export type ListingCategory = 'dormir' | 'se-deplacer' | 'se-detendre' | 'packs'
export const LISTING_CATEGORIES: {
  key: ListingCategory
  label: string
  hint: string
  types: ListingType[]
}[] = [
  {
    key: 'dormir',
    label: 'Dormir',
    hint: 'Chambres d’hôtel et résidences',
    types: ['hotel_room', 'residence'],
  },
  {
    key: 'se-deplacer',
    label: 'Se déplacer',
    hint: 'Voitures et parkings',
    types: ['car', 'parking'],
  },
  { key: 'se-detendre', label: 'Se détendre', hint: 'Massages, spas et soins', types: ['service'] },
  {
    key: 'packs',
    label: 'Packs',
    hint: 'Plusieurs services en une réservation',
    types: ['package'],
  },
]

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: 'En vente',
  hidden: 'Masquée',
  pending_review: 'À valider',
  rejected: 'Refusée',
}

export const LISTING_STATUS_BADGES: Record<ListingStatus, string> = {
  active: 'badge-success',
  hidden: 'badge-neutral',
  pending_review: 'badge-warning',
  rejected: 'badge-danger',
}

export const LISTINGS_ACCESS_LABELS: Record<ListingsAccess, string> = {
  none: 'Non : l’équipe KiffUp gère ses offres',
  review: 'Oui, avec validation par l’équipe',
  direct: 'Oui, publication directe (partenaire de confiance)',
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  hotel: 'Hôtel',
  residence: 'Résidence',
  car_rental: 'Loueur de voitures',
  parking: 'Parking',
  wellness: 'Bien-être (massage, spa)',
  restaurant: 'Restaurant',
  leisure: 'Loisirs et plages',
  event_space: 'Espace d’événements',
  other: 'Autre',
}

export const PARTNER_PROFILE_LABELS: Record<PartnerProfile, string> = {
  showcase: 'Vitrine (vidéos et contacts)',
  bookable: 'Réservable (offres payées en ligne)',
}

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN Mobile Money',
  moov_money: 'Moov Money',
  bank_transfer: 'Virement bancaire',
}

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  stay: 'Forfait événement',
  night: 'À la nuit',
  day: 'Au jour',
  session: 'Séance',
}

/** "/ nuit", "/ jour" or '' — shown after a unit price. */
export function perUnitSuffix(unit: PricingUnit): string {
  return unit === 'night'
    ? '/ nuit'
    : unit === 'day'
      ? '/ jour'
      : unit === 'session'
        ? '/ séance'
        : ''
}

/** "1 nuit", "3 jours" */
export function durationLabel(unit: PricingUnit, duration: number): string {
  const word = unit === 'day' ? 'jour' : 'nuit'
  return `${duration} ${word}${duration > 1 ? 's' : ''}`
}

/** Lowest price shown on a card: the package, otherwise the price of one night / one day. */
export function cheapestTariff(
  listing: Listing,
  pkg?: EventPackage | null,
): { unit: PricingUnit; price: TariffPrice } | null {
  if (pkg) return { unit: 'stay', price: pkg }
  if (listing.tariffs.night) return { unit: 'night', price: listing.tariffs.night }
  if (listing.tariffs.day) return { unit: 'day', price: listing.tariffs.day }
  if (listing.tariffs.session) return { unit: 'session', price: listing.tariffs.session }
  return null
}

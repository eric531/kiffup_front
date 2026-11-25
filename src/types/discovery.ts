import type { PartnerType } from '@/types/catalog'

export type VideoStatus =
  'processing' | 'pending_review' | 'published' | 'rejected' | 'hidden' | 'failed'

/** "chat": write on KiffUp (lot F9, replaced the WhatsApp button). */
export type ContactButton = 'chat' | 'call' | 'directions'

interface VideoMedia {
  id: number
  caption: string | null
  city: string
  category: PartnerType
  video_url: string | null
  cover_url: string | null
  duration_ms: number | null
  width: number | null
  height: number | null
  published_at: string | null
}

/** A video of the "Découvrir" feed. */
export interface FeedVideo extends VideoMedia {
  partner: {
    id: number
    name: string
    type: PartnerType
    city: string
    /** Only the buttons chosen by the partner, with their target. */
    contact: { chat?: boolean; call?: string; directions?: string }
  } | null
  /** "Voir l'offre / Réserver": a listing open for sale. */
  offer: { id: number; title: string; price: number | null; unit: 'night' | 'day' | null } | null
  likes: number
  shares: number
  /** Paid placement ("À la une" or boost), labelled as such (RG41, RG49). */
  sponsored: boolean
  /** "À la une" (lot F5), boost, or neither. */
  placement: 'spotlight' | 'boost' | null
  /** Rank of the day in "À la une" (1 = the first, also on its reminders). */
  spotlight_rank: number | null
  liked: boolean
  favorited: boolean
  /** Vitrine partner's video (RG53): only in "Vitrine", for logged-in customers. */
  vitrine: boolean
  /** File held back until the customer opens it (free video of the day or Pass Vitrine). */
  locked: boolean
}

/** "Vitrine" for the logged-in customer (V3, lot F8). */
export interface VitrineStatus {
  has_pass: boolean
  pass_ends_at: string | null
  free_per_day: number
  watched_today: number
  free_left: number
  plans: { plan: string; days: number; price: number }[]
}

export interface VideoStats {
  views: number
  complete_views: number
  likes: number
  shares: number
  contacts: number
  offer_clicks: number
  reports: number
  /** Paid bookings made after "Voir l'offre" on this video, and the partner's share (RG43). */
  bookings: number
  booking_amount: number
}

/** Partner area and back-office. */
export interface ManagedVideo extends VideoMedia {
  status: VideoStatus
  failure_reason: string | null
  rejection_reason: string | null
  listing_id: number | null
  contact_buttons: ContactButton[]
  stats: VideoStats
  /** End of the running boost, null when not boosted. */
  boosted_until: string | null
  partner: { id: number; name: string; profile: string } | null
  report_reasons?: Record<string, number>
  reviewed_at: string | null
  created_at: string | null
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  processing: 'En traitement',
  pending_review: 'En attente de validation',
  published: 'En ligne',
  rejected: 'Refusée',
  hidden: 'Masquée (signalements)',
  failed: 'Échec',
}

export const CONTACT_BUTTON_LABELS: Record<ContactButton, string> = {
  chat: 'Écrire',
  call: 'Appeler',
  directions: 'Itinéraire',
}

export const REPORT_REASONS: Record<string, string> = {
  sexual: 'Contenu sexuel ou suggestif',
  shocking: 'Contenu choquant ou violent',
  misleading: 'Trompeur (lieu, prix, prestations)',
  spam: 'Publicité abusive, autre service',
  other: 'Autre',
}

// ─── Monetisation (V3, lot F3)

export interface BoostPlan {
  plan: '1d' | '3d' | '7d' | '30d'
  days: number
  price: number
}

/** Vitrine subscription of the partner (RG42). "required" is false when there is nothing to pay. */
export interface SubscriptionStatus {
  required: boolean
  covered: boolean
  covered_until: string | null
  /** Still in the free period. */
  trial: boolean
  price: number
  days: number
}

export type PurchaseStatus = 'pending' | 'paid' | 'failed'

export interface Purchase {
  id: number
  reference: string
  kind: 'boost' | 'subscription' | 'spotlight'
  video_id: number | null
  plan: BoostPlan['plan'] | null
  days: number
  amount: number
  status: PurchaseStatus
  starts_at: string | null
  ends_at: string | null
  created_at: string | null
}

export interface Promotions {
  boost_plans: BoostPlan[]
  subscription: SubscriptionStatus
  purchases: Purchase[]
}

export const BOOST_PLAN_LABELS: Record<BoostPlan['plan'], string> = {
  '1d': '24 heures',
  '3d': '3 jours',
  '7d': '7 jours',
  '30d': '30 jours',
}

/** "À la une" of the day (V3, lot F5, RG49): amounts and ranks, the other partners stay anonymous. */
export interface SpotlightState {
  /** False when KiffUp does not offer it (minimum set to 0). */
  enabled: boolean
  /** False for a Vitrine partner whose subscription is over. */
  available: boolean
  day: string
  /** Midnight: the ranking starts again. */
  ends_at: string
  min_bid: number
  /** Minimum gap to pass another bid. */
  increment: number
  ranking: { rank: number; amount: number; mine: boolean }[]
  mine: { rank: number; amount: number; video_id: number | null } | null
  /** Total needed to be first; null when already first. */
  to_lead: number | null
}

/** Last "Voir l'offre" click in Découvrir: the booking made within 7 days is credited to the video. */
export const DISCOVERY_ORIGIN_KEY = 'kiffup.discovery-origin'
export const DISCOVERY_ORIGIN_DAYS = 7

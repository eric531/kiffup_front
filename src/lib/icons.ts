import {
  BedDouble,
  Building2,
  Car,
  CircleParking,
  Flower2,
  Package,
  type LucideIcon,
} from 'lucide-vue-next'
import type { ListingCategory, ListingType } from '@/types/catalog'

export const LISTING_TYPE_ICONS: Record<ListingType, LucideIcon> = {
  residence: Building2,
  hotel_room: BedDouble,
  car: Car,
  parking: CircleParking,
  package: Package,
  service: Flower2,
}

export const LISTING_CATEGORY_ICONS: Record<ListingCategory, LucideIcon> = {
  dormir: BedDouble,
  'se-deplacer': Car,
  'se-detendre': Flower2,
  packs: Package,
}

/** Placeholder backgrounds for offers without photos: one mood per type. */
export const LISTING_TYPE_GRADIENTS: Record<ListingType, string> = {
  residence: 'from-dusk-600 via-night-800 to-night-900',
  hotel_room: 'from-flare-500 via-dusk-600 to-night-900',
  car: 'from-brand-500 via-flare-500 to-night-900',
  parking: 'from-sky-600 via-night-700 to-night-900',
  package: 'from-gold-400 via-brand-500 to-night-900',
  service: 'from-emerald-500 via-dusk-600 to-night-900',
}

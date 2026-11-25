<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatStayRange, formatXof } from '@/lib/format'
import BookingForm from '@/components/BookingForm.vue'
import PriceDetail from '@/components/PriceDetail.vue'
import {
  PRICING_UNIT_LABELS,
  durationLabel,
  perUnitSuffix,
  type EventPackage,
  type Listing,
  type PricingUnit,
  type StayRules,
  type TariffPrice,
} from '@/types/catalog'

/**
 * Booking card of a listing: the customer picks one of the available tariffs (event package,
 * per night, per day, session), sees its price and what is left to pay on site, then books.
 */
const props = defineProps<{
  listing: Listing
  /** Event package of the event page, if any. */
  pkg?: EventPackage | null
  eventId?: number | null
  eventName?: string | null
  /** Bookable dates per tariff (pre-selected on the event day on an event page). */
  stay: { night: StayRules | null; day: StayRules | null }
  /** The event no longer accepts bookings (package only). */
  eventClosed?: boolean
}>()

// Dates shared with the page (availability calendar); local when the page does not bind them.
const startsOn = defineModel<string>('startsOn', { default: '' })
const endsOn = defineModel<string>('endsOn', { default: '' })
/** Tariff currently selected, for the page (calendar per night or per day). */
const emit = defineEmits<{ tariff: [unit: PricingUnit | null] }>()

interface TariffOption {
  unit: PricingUnit
  label: string
  price: TariffPrice
}

const options = computed<TariffOption[]>(() => {
  const list: TariffOption[] = []
  if (props.pkg) list.push({ unit: 'stay', label: PRICING_UNIT_LABELS.stay, price: props.pkg })
  if (props.listing.tariffs.night && props.stay.night)
    list.push({
      unit: 'night',
      label: PRICING_UNIT_LABELS.night,
      price: props.listing.tariffs.night,
    })
  if (props.listing.tariffs.day && props.stay.day)
    list.push({ unit: 'day', label: PRICING_UNIT_LABELS.day, price: props.listing.tariffs.day })
  if (props.listing.tariffs.session && props.listing.session)
    list.push({
      unit: 'session',
      label: PRICING_UNIT_LABELS.session,
      price: props.listing.tariffs.session,
    })
  return list
})

// Package first when it is bookable, otherwise the first tariff offered.
const selected = ref<PricingUnit | null>(null)
watch(
  options,
  (list) => {
    if (selected.value && list.some((o) => o.unit === selected.value)) return
    selected.value =
      list.find((o) => o.unit === 'stay' && props.pkg?.is_bookable)?.unit ??
      list.find((o) => o.unit !== 'stay')?.unit ??
      list[0]?.unit ??
      null
  },
  { immediate: true },
)
const current = computed(() => options.value.find((o) => o.unit === selected.value) ?? null)
watch(selected, (unit) => emit('tariff', unit), { immediate: true })

const perLabel = computed(() => {
  switch (current.value?.unit) {
    case 'night':
      return 'par nuit et par logement'
    case 'day':
      return 'par jour et par unité'
    case 'session':
      return `acompte par personne · séance de ${props.listing.session?.minutes ?? props.listing.session_minutes} min`
    default:
      return props.pkg
        ? `forfait ${durationLabel('night', props.pkg.nights)} · ${formatStayRange(props.pkg.starts_on, props.pkg.ends_on)}`
        : ''
  }
})
const suffix = computed(() => (current.value ? perUnitSuffix(current.value.unit) : ''))
const blockedReason = computed(() => {
  if (!props.listing.is_bookable) return 'Momentanément indisponible'
  if (current.value?.unit === 'stay' && props.pkg && !props.pkg.is_bookable)
    return props.eventClosed
      ? 'Réservations closes pour le forfait'
      : props.pkg.available === 0
        ? 'Forfait complet'
        : 'Forfait momentanément indisponible'
  return null
})
</script>

<template>
  <div class="card overflow-hidden p-0 shadow-lift">
    <div v-if="!current" class="p-6 text-sm text-muted">Aucun tarif disponible pour le moment.</div>
    <template v-else>
      <div
        class="bg-night-900 bg-[radial-gradient(circle_at_top_right,rgb(236_72_153_/_0.35),transparent_60%)] px-6 py-5 text-white"
      >
        <div
          v-if="options.length > 1"
          class="mb-4 inline-flex gap-1 rounded-full bg-white/10 p-1"
          role="radiogroup"
          aria-label="Tarif"
        >
          <button
            v-for="option in options"
            :key="option.unit"
            type="button"
            role="radio"
            class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
            :class="
              selected === option.unit
                ? 'bg-white text-night-900 shadow'
                : 'text-white/75 hover:text-white'
            "
            :aria-checked="selected === option.unit"
            @click="selected = option.unit"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="text-sm text-white/70">
          {{
            current.unit === 'session'
              ? 'Acompte à payer maintenant'
              : 'À payer maintenant pour réserver'
          }}
        </p>
        <p class="font-display text-4xl font-extrabold">
          {{ formatXof(current.price.customer_price) }}
        </p>
        <p class="mt-1 text-sm text-white/70">{{ perLabel }}</p>
        <p v-if="current.unit === 'stay' && eventName" class="mt-1 text-xs text-white/60">
          {{ eventName }}
        </p>
      </div>

      <div class="space-y-4 p-6">
        <!-- Transparency: what the price is made of, and what the rental costs -->
        <PriceDetail
          :partner-base="current.price.breakdown.partner_base_amount"
          :markup-bp="current.price.breakdown.markup_bp"
          :markup-amount="current.price.breakdown.markup_amount"
          :service-fee="current.price.breakdown.service_fee"
          :total="current.price.customer_price"
          :rental-cost="current.price.service_price"
          :balance="current.price.balance_due_on_site"
          :deductible="current.price.is_deductible"
          :suffix="suffix"
          :session="current.unit === 'session'"
        />

        <p v-if="current.unit === 'stay' && pkg" class="flex items-center justify-between text-sm">
          <span class="text-muted">Disponibilité du forfait</span>
          <span v-if="pkg.available === 0" class="chip bg-night-900 text-white">Complet</span>
          <span v-else class="chip bg-brand-50 text-brand-700">
            {{ pkg.available }} disponible{{ pkg.available > 1 ? 's' : '' }}
          </span>
        </p>
        <p v-else-if="current.unit === 'session'" class="flex items-center justify-between text-sm">
          <span class="text-muted">Heure</span>
          <span class="chip bg-brand-50 text-brand-700">confirmée par l'établissement</span>
        </p>
        <p v-else class="flex items-center justify-between text-sm">
          <span class="text-muted">Disponibilité</span>
          <span class="chip bg-brand-50 text-brand-700">vérifiée selon tes dates</span>
        </p>

        <BookingForm
          v-if="!blockedReason"
          :key="current.unit"
          :listing="listing"
          :pricing-unit="current.unit"
          :event-id="current.unit === 'stay' ? eventId : null"
          :pkg="current.unit === 'stay' ? pkg : null"
          v-model:starts-on="startsOn"
          v-model:ends-on="endsOn"
          :rules="current.unit === 'night' ? stay.night : current.unit === 'day' ? stay.day : null"
          :session-rules="current.unit === 'session' ? listing.session : null"
          class="border-t border-stone-200 pt-5"
        />
        <button v-else class="btn-primary w-full" disabled>{{ blockedReason }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { MapPin, Users, ArrowRight } from 'lucide-vue-next'
import { formatXof } from '@/lib/format'
import FavoriteButton from '@/components/FavoriteButton.vue'
import { LISTING_TYPE_GRADIENTS, LISTING_TYPE_ICONS } from '@/lib/icons'
import {
  LISTING_TYPE_LABELS,
  cheapestTariff,
  perUnitSuffix,
  type EventPackage,
  type Listing,
} from '@/types/catalog'

/**
 * A listing in a grid: the event package price on an event page, otherwise the price of one night / day.
 */
const props = defineProps<{
  listing: Listing
  to: RouteLocationRaw
  pkg?: EventPackage | null
  distanceKm?: number | null
  /** Free units on the dates searched in the catalogue. */
  available?: number | null
}>()

const shown = computed(() => cheapestTariff(props.listing, props.pkg))
const otherTariffs = computed(
  () => !!props.pkg && (props.listing.tariffs.night !== null || props.listing.tariffs.day !== null),
)
const packageFull = computed(() => !!props.pkg && props.pkg.available === 0)
const lowStock = computed(() => !!props.pkg && props.pkg.available > 0 && props.pkg.available <= 3)
const unavailable = computed(
  () => !props.listing.is_bookable || (packageFull.value && !otherTariffs.value),
)
const TypeIcon = computed(() => LISTING_TYPE_ICONS[props.listing.type])
</script>

<template>
  <RouterLink
    :to="to"
    class="group card card-hover flex flex-col overflow-hidden p-0"
    :class="{ 'opacity-80 grayscale-[35%]': unavailable }"
  >
    <div
      class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-night-800 to-night-700"
    >
      <img
        v-if="listing.photos[0]"
        :src="listing.photos[0].url"
        :alt="listing.title"
        class="size-full object-cover transition duration-700 ease-out group-hover:scale-110"
        loading="lazy"
      />
      <div
        v-else
        class="relative grid size-full place-items-center overflow-hidden bg-gradient-to-br"
        :class="LISTING_TYPE_GRADIENTS[listing.type]"
      >
        <component
          :is="TypeIcon"
          class="absolute -right-6 -bottom-6 size-40 rotate-[-12deg] text-white/10 transition duration-700 group-hover:scale-110 group-hover:rotate-0"
        />
        <span class="grid size-16 place-items-center rounded-2xl glass text-white shadow-lg">
          <component :is="TypeIcon" class="size-7" />
        </span>
      </div>
      <div
        class="absolute inset-0 bg-gradient-to-t from-night-950/70 via-transparent to-transparent"
      />

      <span class="chip absolute top-3 left-3 bg-white/90 text-ink shadow-sm backdrop-blur">
        <component :is="TypeIcon" class="size-3.5 text-brand-600" />
        {{ LISTING_TYPE_LABELS[listing.type] }}
      </span>
      <span v-if="packageFull" class="chip absolute top-3 right-3 bg-night-950 text-white">
        {{ otherTariffs ? 'Forfait complet' : 'Complet' }}
      </span>
      <span v-else-if="lowStock" class="chip absolute top-3 right-3 bg-brand-600 text-white">
        <span class="relative flex size-2">
          <span class="absolute inline-flex size-full rounded-full bg-white animate-pulse-ring" />
          <span class="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        Plus que {{ pkg?.available }}
      </span>
      <span
        v-else-if="available != null"
        class="chip absolute top-3 right-3 bg-emerald-600 text-white shadow-sm"
      >
        {{ available }} libre{{ available > 1 ? 's' : '' }} à tes dates
      </span>

      <FavoriteButton :listing-id="listing.id" class="absolute right-3 bottom-3" />

      <p
        v-if="shown"
        class="absolute bottom-3 left-4 font-display text-2xl font-bold text-white drop-shadow"
      >
        <span v-if="shown.unit !== 'stay'" class="text-sm font-semibold text-white/80">dès </span>
        {{ formatXof(shown.price.customer_price) }}
        <span v-if="shown.unit !== 'stay'" class="text-sm font-semibold text-white/80">{{
          perUnitSuffix(shown.unit)
        }}</span>
        <span v-else class="block text-xs font-semibold text-white/80">
          forfait {{ pkg?.nights }} nuit{{ (pkg?.nights ?? 1) > 1 ? 's' : '' }}
        </span>
      </p>
    </div>

    <div class="flex flex-1 flex-col gap-3 p-5">
      <div>
        <h3
          class="font-display text-lg leading-snug font-semibold transition group-hover:text-brand-700"
        >
          {{ listing.title }}
        </h3>
        <p class="mt-0.5 text-sm text-muted">{{ listing.partner?.name }}</p>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span v-if="distanceKm != null" class="inline-flex items-center gap-1">
          <MapPin class="size-3.5" /> à {{ distanceKm }} km
        </span>
        <span v-else-if="listing.city" class="inline-flex items-center gap-1">
          <MapPin class="size-3.5" /> {{ listing.city }}
        </span>
        <span v-if="listing.capacity" class="inline-flex items-center gap-1">
          <Users class="size-3.5" /> {{ listing.capacity }} pers.
        </span>
        <span v-if="otherTariffs" class="inline-flex items-center gap-1 font-medium text-brand-700">
          Aussi à la {{ listing.tariffs.night ? 'nuit' : 'journée' }}
        </span>
      </div>
      <div class="mt-auto flex items-center justify-between border-t border-stone-100 pt-3">
        <span
          class="chip"
          :class="
            listing.is_deductible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
          "
        >
          {{ listing.is_deductible ? 'Déductible sur place' : 'Non déductible' }}
        </span>
        <ArrowRight
          class="size-4 text-stone-400 transition group-hover:translate-x-1 group-hover:text-brand-600"
        />
      </div>
    </div>
  </RouterLink>
</template>

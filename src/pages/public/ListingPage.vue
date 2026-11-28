<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  Handshake,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'
import { api, ApiError } from '@/lib/api'
import { formatEventDate, formatStayRange } from '@/lib/format'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import StageBackdrop from '@/components/StageBackdrop.vue'
import ListingGallery from '@/components/ListingGallery.vue'
import TariffBookingCard from '@/components/TariffBookingCard.vue'
import StickyBookingBar from '@/components/StickyBookingBar.vue'
import {
  LISTING_TYPE_LABELS,
  cheapestTariff,
  durationLabel,
  perUnitSuffix,
  type EventItem,
  type EventListing,
} from '@/types/catalog'

const props = defineProps<{ slug: string; listingId: string }>()

const event = ref<EventItem | null>(null)
// The listing as proposed to the event: package, night / day tariffs pre-selected on the event day.
const proposal = ref<EventListing | null>(null)
const listing = computed(() => proposal.value?.listing ?? null)
/** Minimum stay of the night (or day) tariff, when more than 1. */
const minStay = computed(() => {
  const unit: 'night' | 'day' = proposal.value?.stay.night ? 'night' : 'day'
  const duration = proposal.value?.stay[unit]?.min_duration ?? 1
  return duration > 1 ? { unit, duration } : null
})
const loading = ref(true)
const notFound = ref(false)
const failed = ref(false)

useHead({ title: computed(() => listing.value?.title) })
// Phones: price and "Réserver" pinned at the bottom of the screen.
const cheapest = computed(() =>
  listing.value && proposal.value ? cheapestTariff(listing.value, proposal.value.package) : null,
)

const TypeIcon = computed(() => (listing.value ? LISTING_TYPE_ICONS[listing.value.type] : null))

async function load() {
  loading.value = true
  notFound.value = failed.value = false
  try {
    const [eventResponse, listingResponse] = await Promise.all([
      api.get<{ data: EventItem }>(`/api/v1/public/events/${props.slug}`),
      api.get<{ data: EventListing }>(
        `/api/v1/public/events/${props.slug}/listings/${props.listingId}`,
      ),
    ])
    event.value = eventResponse.data
    proposal.value = listingResponse.data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => [props.slug, props.listingId], load, { immediate: true })
</script>

<template>
  <div>
    <!-- Dark band under the header -->
    <section class="relative isolate overflow-hidden pt-24 pb-8 text-white sm:pt-28">
      <StageBackdrop :image="event?.cover_url" :spotlights="false" intensity="soft" />
      <div class="container-page relative">
        <RouterLink
          :to="{ name: 'event', params: { slug } }"
          class="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
        >
          <ArrowLeft class="size-4" /> {{ event?.name ?? "Retour à l'événement" }}
        </RouterLink>
        <div v-if="listing" class="mt-4 animate-fade-up">
          <p class="chip glass">
            <component :is="TypeIcon" v-if="TypeIcon" class="size-3.5 text-brand-300" />
            {{ LISTING_TYPE_LABELS[listing.type] }}
          </p>
          <h1 class="mt-3 text-3xl font-extrabold sm:text-5xl">{{ listing.title }}</h1>
          <p class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-white/75">
            <span class="inline-flex items-center gap-1.5"
              ><Handshake class="size-4" /> {{ listing.partner?.name }}</span
            >
            <span v-if="proposal?.distance_km != null" class="inline-flex items-center gap-1.5">
              <MapPin class="size-4" /> à {{ proposal.distance_km }} km du lieu
            </span>
            <span v-else-if="listing.city" class="inline-flex items-center gap-1.5">
              <MapPin class="size-4" /> {{ listing.city }}
            </span>
            <span v-if="listing.capacity" class="inline-flex items-center gap-1.5">
              <Users class="size-4" /> jusqu'à {{ listing.capacity }} personnes
            </span>
          </p>
        </div>
        <div v-else-if="loading" class="mt-4 space-y-3">
          <div class="h-6 w-28 rounded-full bg-white/10" />
          <div class="h-12 w-2/3 rounded-2xl bg-white/10" />
        </div>
      </div>
    </section>

    <div
      v-if="loading"
      class="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <div class="skeleton aspect-[16/10] rounded-4xl" />
      <div class="skeleton h-96 rounded-4xl" />
    </div>

    <div v-else-if="notFound" class="container-page py-20 text-center">
      <h2 class="text-2xl font-bold">Cette offre n'est plus disponible.</h2>
      <RouterLink :to="{ name: 'event', params: { slug } }" class="btn-primary mt-6"
        >Voir les autres offres</RouterLink
      >
    </div>

    <p v-else-if="failed" class="container-page py-10">
      <span class="alert-error block">Impossible de charger l'offre pour le moment.</span>
    </p>

    <div
      v-else-if="listing && event"
      class="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_25rem]"
    >
      <div class="space-y-8">
        <ListingGallery :listing="listing" />

        <!-- Highlights -->
        <div class="grid gap-3 sm:grid-cols-3">
          <div v-reveal class="card flex items-start gap-3 p-4">
            <BadgePercent class="size-5 shrink-0 text-brand-600" />
            <div class="text-sm">
              <p class="font-semibold">
                {{ listing.is_deductible ? 'Déductible' : 'Non déductible' }}
              </p>
              <p class="text-muted">
                {{
                  listing.is_deductible ? 'Déduit du prix sur place' : 'Prestation payée sur place'
                }}
              </p>
            </div>
          </div>
          <div v-reveal="80" class="card flex items-start gap-3 p-4">
            <ShieldCheck class="size-5 shrink-0 text-brand-600" />
            <div class="text-sm">
              <p class="font-semibold">Partenaire vérifié</p>
              <p class="text-muted">{{ listing.partner?.name }}</p>
            </div>
          </div>
          <div v-reveal="160" class="card flex items-start gap-3 p-4">
            <CalendarDays class="size-5 shrink-0 text-brand-600" />
            <div class="text-sm">
              <p class="font-semibold">{{ event.name }}</p>
              <p class="text-muted first-letter:uppercase">
                {{ formatEventDate(event.starts_at) }}
              </p>
              <p v-if="proposal?.package" class="mt-1 text-xs text-muted">
                Forfait
                {{ formatStayRange(proposal.package.starts_on, proposal.package.ends_on) }}
              </p>
              <p v-if="minStay" class="mt-1 text-xs text-muted">
                {{ durationLabel(minStay.unit, minStay.duration) }} minimum
              </p>
            </div>
          </div>
        </div>

        <div v-if="listing.description" v-reveal class="card">
          <h2 class="font-display text-xl font-bold">À propos de cette offre</h2>
          <p class="mt-3 leading-relaxed whitespace-pre-line text-stone-600">
            {{ listing.description }}
          </p>
        </div>
      </div>

      <!-- Booking card: event package, per night, per day -->
      <aside id="reserver" class="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
        <TariffBookingCard
          v-if="proposal"
          :listing="listing"
          :pkg="proposal.package"
          :event-id="event.id"
          :event-name="event.name"
          :stay="proposal.stay"
          :event-closed="!event.is_bookable"
        />
      </aside>
    </div>

    <StickyBookingBar
      v-if="cheapest && event?.is_bookable"
      :price="cheapest.price.customer_price"
      :unit="perUnitSuffix(cheapest.unit)"
      target="reserver"
    />
  </div>
</template>

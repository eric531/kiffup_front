<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import {
  ArrowDown,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  TrendingUp,
  Ticket,
} from 'lucide-vue-next'
import { api, ApiError } from '@/lib/api'
import { formatEventDate, formatShortDate, formatXof } from '@/lib/format'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import StageBackdrop from '@/components/StageBackdrop.vue'
import EventCountdown from '@/components/EventCountdown.vue'
import ListingCard from '@/components/ListingCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import {
  LISTING_TYPE_LABELS,
  cheapestTariff,
  type EventItem,
  type EventListing,
  type ListingType,
} from '@/types/catalog'

const props = defineProps<{ slug: string }>()

const event = ref<EventItem | null>(null)
// Listings proposed to the event (package and / or night, day tariffs).
const listings = ref<EventListing[]>([])
const loading = ref(true)
const notFound = ref(false)
const failed = ref(false)
const typeFilter = ref<ListingType | 'all'>('all')

useHead({ title: computed(() => event.value?.name) })

const availableTypes = computed(() => [...new Set(listings.value.map((p) => p.listing!.type))])
const filteredListings = computed(() =>
  typeFilter.value === 'all'
    ? listings.value
    : listings.value.filter((p) => p.listing!.type === typeFilter.value),
)
const bookableCount = computed(() => listings.value.filter((p) => p.listing!.is_bookable).length)
const minPrice = computed(() => {
  const prices = listings.value
    .filter((p) => p.listing!.is_bookable)
    .map((p) => cheapestTariff(p.listing!, p.package)?.price.customer_price)
    .filter((price): price is number => price !== undefined)
  return prices.length ? Math.min(...prices) : null
})
const mapsUrl = computed(() =>
  event.value
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.value.venue} ${event.value.address ?? ''} ${event.value.city}`)}`
    : '#',
)

async function load(slug: string) {
  loading.value = true
  notFound.value = failed.value = false
  try {
    const [eventResponse, listingsResponse] = await Promise.all([
      api.get<{ data: EventItem }>(`/api/v1/public/events/${slug}`),
      api.get<{ data: EventListing[] }>(`/api/v1/public/events/${slug}/listings`),
    ])
    event.value = eventResponse.data
    listings.value = listingsResponse.data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.slug, load, { immediate: true })
</script>

<template>
  <div>
    <!-- ───────────── HERO ───────────── -->
    <section class="relative isolate overflow-hidden pt-28 pb-16 text-white sm:pt-32 sm:pb-20">
      <StageBackdrop :image="event?.cover_url" />

      <div class="container-page relative">
        <div v-if="loading" class="space-y-5 py-6">
          <div class="h-6 w-32 rounded-full bg-white/10" />
          <div class="h-14 w-3/4 rounded-2xl bg-white/10" />
          <div class="h-6 w-1/2 rounded-full bg-white/10" />
          <div class="h-20 w-80 max-w-full rounded-2xl bg-white/10" />
        </div>

        <div v-else-if="notFound" class="py-16 text-center">
          <h1 class="text-3xl font-extrabold">
            Cet événement n'existe pas ou n'est plus en ligne.
          </h1>
          <RouterLink :to="{ name: 'home' }" class="btn-primary mt-8"
            >Voir les événements</RouterLink
          >
        </div>

        <p v-else-if="failed" class="alert-error">
          Impossible de charger l'événement pour le moment.
        </p>

        <div v-else-if="event" class="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div class="space-y-6">
            <p v-if="event.artist" class="chip glass animate-fade-up tracking-widest uppercase">
              <Ticket class="size-3.5 text-gold-400" /> {{ event.artist }}
            </p>
            <h1
              class="animate-fade-up text-4xl leading-[1.05] font-extrabold [animation-delay:80ms] sm:text-6xl"
            >
              {{ event.name }}
            </h1>
            <div class="flex animate-fade-up flex-wrap gap-2.5 [animation-delay:160ms]">
              <span class="chip glass px-4 py-2 text-sm first-letter:uppercase">
                <CalendarDays class="size-4 text-brand-400" />
                {{ formatEventDate(event.starts_at) }}
              </span>
              <span class="chip glass px-4 py-2 text-sm">
                <MapPin class="size-4 text-flare-400" /> {{ event.venue }}, {{ event.city }}
              </span>
            </div>

            <div class="animate-fade-up space-y-4 [animation-delay:240ms]">
              <EventCountdown v-if="event.is_bookable" :starts-at="event.starts_at" />
              <p v-else class="chip bg-white/15 px-4 py-2 text-sm">
                Les réservations sont closes pour cet événement.
              </p>

              <div
                v-if="event.is_bookable && event.pricing.next_change_at"
                class="flex w-fit items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-night-900 shadow-glow"
              >
                <span class="relative flex size-2.5 shrink-0">
                  <span
                    class="absolute inline-flex size-full rounded-full bg-brand-500 animate-pulse-ring"
                  />
                  <span class="relative inline-flex size-2.5 rounded-full bg-brand-600" />
                </span>
                <TrendingUp class="size-4 shrink-0 text-brand-600" />
                <span>
                  {{
                    event.pricing.next_closes
                      ? `Les réservations ferment le ${formatShortDate(event.pricing.next_change_at)}.`
                      : `Profite des prix actuels : ils augmentent le ${formatShortDate(event.pricing.next_change_at)}.`
                  }}
                </span>
              </div>
            </div>

            <a
              v-if="bookableCount"
              href="#offres"
              class="btn-primary w-fit animate-fade-up px-7 py-3.5 text-base [animation-delay:320ms]"
            >
              Voir les {{ bookableCount }} offres disponibles <ArrowDown class="size-4" />
            </a>
          </div>

          <!-- Poster -->
          <div v-if="event.cover_url" class="relative mx-auto hidden w-full max-w-sm lg:block">
            <div class="absolute -inset-4 rounded-[2.4rem] bg-sunset opacity-40 blur-2xl" />
            <img
              :src="event.cover_url"
              :alt="event.name"
              class="relative aspect-[4/5] w-full rotate-2 rounded-4xl object-cover shadow-2xl ring-1 ring-white/20 transition duration-700 hover:rotate-0"
            />
          </div>

          <!-- No poster: at-a-glance panel -->
          <div v-else class="relative mx-auto hidden w-full max-w-sm animate-float lg:block">
            <div class="absolute -inset-4 rounded-[2.4rem] bg-sunset opacity-30 blur-2xl" />
            <div class="glass relative space-y-5 rounded-4xl p-7">
              <p class="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">
                En un coup d'œil
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-white/10 p-4">
                  <p class="font-display text-3xl font-extrabold">{{ bookableCount }}</p>
                  <p class="text-xs text-white/70">offres disponibles</p>
                </div>
                <div class="rounded-2xl bg-white/10 p-4">
                  <p class="font-display text-xl leading-9 font-extrabold">
                    {{ minPrice !== null ? formatXof(minPrice) : '—' }}
                  </p>
                  <p class="text-xs text-white/70">dès, pour réserver</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="type in availableTypes"
                  :key="type"
                  class="chip bg-white/10 text-white"
                >
                  <component :is="LISTING_TYPE_ICONS[type]" class="size-3.5" />
                  {{ LISTING_TYPE_LABELS[type] }}
                </span>
              </div>
              <p class="text-sm text-white/70">
                Confirmation immédiate sur WhatsApp et par email, QR code à présenter à ton arrivée.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <template v-if="event && !loading">
      <!-- ───────────── FILTERS (sticky) ───────────── -->
      <div
        id="offres"
        class="sticky top-16 z-30 scroll-mt-16 border-b border-stone-200/70 bg-surface/85 backdrop-blur-lg"
      >
        <div class="container-page flex items-center gap-2.5 overflow-x-auto py-3">
          <button
            v-for="type in ['all', ...availableTypes] as const"
            :key="type"
            class="chip shrink-0 border px-4 py-2 text-sm transition"
            :class="
              typeFilter === type
                ? 'border-transparent bg-night-900 text-white shadow-md'
                : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
            "
            @click="typeFilter = type"
          >
            <component :is="LISTING_TYPE_ICONS[type]" v-if="type !== 'all'" class="size-4" />
            {{ type === 'all' ? 'Toutes les offres' : LISTING_TYPE_LABELS[type] }}
          </button>
          <span class="ml-auto hidden shrink-0 text-sm text-muted sm:block">
            {{ filteredListings.length }} offre{{ filteredListings.length > 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- ───────────── LISTINGS + INFO ───────────── -->
      <section
        class="container-page grid grid-cols-1 gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div>
          <div v-if="listings.length === 0" class="card py-14 text-center">
            <p class="font-display text-xl font-semibold">Les offres arrivent bientôt</p>
            <p class="mt-2 text-muted">
              Nuits, voitures et packs sont en cours d'ajout pour cet événement.
            </p>
          </div>
          <div v-else class="grid gap-6 sm:grid-cols-2">
            <div
              v-for="(proposal, i) in filteredListings"
              :key="`${typeFilter}-${proposal.id}`"
              v-reveal="(i % 2) * 90"
            >
              <ListingCard
                :listing="proposal.listing!"
                :pkg="proposal.package"
                :distance-km="proposal.distance_km"
                :to="{
                  name: 'listing',
                  params: { slug: event.slug, listingId: proposal.listing!.id },
                }"
              />
            </div>
          </div>
        </div>

        <aside class="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <div v-reveal class="card space-y-4">
            <h2 class="font-display text-lg font-bold">Infos pratiques</h2>
            <p class="flex gap-3 text-sm">
              <CalendarDays class="mt-0.5 size-4 shrink-0 text-brand-600" />
              <span class="first-letter:uppercase">{{ formatEventDate(event.starts_at) }}</span>
            </p>
            <p class="flex gap-3 text-sm">
              <MapPin class="mt-0.5 size-4 shrink-0 text-brand-600" />
              <span
                >{{ event.venue }}<template v-if="event.address">, {{ event.address }}</template
                >, {{ event.city }}</span
              >
            </p>
            <p v-if="event.booking_closes_at" class="flex gap-3 text-sm">
              <Clock class="mt-0.5 size-4 shrink-0 text-brand-600" />
              <span>Réservations jusqu'au {{ formatEventDate(event.booking_closes_at) }}</span>
            </p>
            <a :href="mapsUrl" target="_blank" rel="noopener" class="btn-secondary w-full">
              Voir sur la carte <ExternalLink class="size-4" />
            </a>
          </div>
          <div v-if="event.description" v-reveal="100" class="card">
            <h2 class="font-display text-lg font-bold">L'événement</h2>
            <p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-stone-600">
              {{ event.description }}
            </p>
          </div>
        </aside>
      </section>
    </template>

    <section
      v-else-if="loading"
      class="container-page grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3"
    >
      <SkeletonCard v-for="n in 3" :key="n" />
    </section>
  </div>
</template>

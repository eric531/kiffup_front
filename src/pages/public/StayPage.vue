<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  CalendarHeart,
  Handshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { formatStayDate, formatStayRange, formatXof } from '@/lib/format'
import { openingLines } from '@/lib/sessions'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import StageBackdrop from '@/components/StageBackdrop.vue'
import ListingGallery from '@/components/ListingGallery.vue'
import FavoriteButton from '@/components/FavoriteButton.vue'
import AvailabilityCalendar from '@/components/AvailabilityCalendar.vue'
import TariffBookingCard from '@/components/TariffBookingCard.vue'
import StickyBookingBar from '@/components/StickyBookingBar.vue'
import {
  LISTING_TYPE_LABELS,
  cheapestTariff,
  durationLabel,
  perUnitSuffix,
  type EventListing,
  type Listing,
  type PricingUnit,
} from '@/types/catalog'

/**
 * A listing booked outside events (per night / per day / per session): availability calendar shared with the
 * booking card, and the events it is also proposed to with a package.
 */
const props = defineProps<{ listingId: string }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// "Écrire au lieu" (lot F9): a question before booking, answered on KiffUp.
const chatError = ref<string | null>(null)
const canChat = computed(() => !auth.isAuthenticated || auth.isCustomer)
async function writeToPartner() {
  const current = listing.value
  if (!current?.partner) return
  if (!auth.isCustomer) {
    await router.push({ name: 'customer-login', query: { redirect: route.fullPath } })
    return
  }
  chatError.value = null
  try {
    const conversation = (
      await api.post<{ data: { id: number } }>('/api/v1/customer/conversations', {
        partner_id: current.partner.id,
      })
    ).data
    await router.push({
      name: 'customer.conversation',
      params: { conversationId: conversation.id },
      query: { offre: current.id, sujet: current.title },
    })
  } catch (e) {
    chatError.value = e instanceof ApiError ? (e.detail ?? e.message) : 'Ouverture impossible.'
  }
}

const listing = ref<(Listing & { packages: EventListing[] }) | null>(null)
const loading = ref(true)
const notFound = ref(false)
const failed = ref(false)

// Dates shared by the calendar and the booking form (pre-filled from a catalogue search).
const startsOn = ref('')
const endsOn = ref('')
const unit = ref<PricingUnit | null>(null)
const rules = computed(() =>
  listing.value && (unit.value === 'night' || unit.value === 'day')
    ? listing.value.stay[unit.value]
    : null,
)
/** "À la nuit ou à la journée", "À la séance (60 min)"… */
const tariffsLabel = computed(() => {
  const t = listing.value?.tariffs
  if (!t) return ''
  const parts: string[] = []
  if (t.night) parts.push('à la nuit')
  if (t.day) parts.push('à la journée')
  if (t.session) parts.push(`à la séance (${listing.value?.session_minutes} min)`)
  const text = parts.join(' ou ')
  return text.charAt(0).toUpperCase() + text.slice(1)
})

const minStay = computed(() =>
  rules.value && unit.value && rules.value.min_duration > 1
    ? durationLabel(unit.value, rules.value.min_duration)
    : null,
)

useHead({ title: computed(() => listing.value?.title) })
// Phones: price and "Réserver" pinned at the bottom of the screen.
const cheapest = computed(() => (listing.value ? cheapestTariff(listing.value) : null))
const TypeIcon = computed(() => (listing.value ? LISTING_TYPE_ICONS[listing.value.type] : null))

/**
 * Dates of the selected tariff, set before the booking form shows: the dates of the catalogue search
 * for the first tariff, otherwise its default dates (a stay per night ends the morning after, per day
 * on the last day).
 */
function onTariff(next: PricingUnit | null) {
  const previous = unit.value
  unit.value = next
  if (previous === next || !rules.value) return
  if (previous === null && startsOn.value && endsOn.value) return
  startsOn.value = rules.value.default_starts_on
  endsOn.value = rules.value.default_ends_on
}

async function load() {
  loading.value = true
  notFound.value = failed.value = false
  unit.value = null
  const arrival = route.query.arrivee
  const departure = route.query.depart
  startsOn.value = typeof arrival === 'string' ? arrival : ''
  endsOn.value = typeof departure === 'string' ? departure : ''
  try {
    listing.value = (
      await api.get<{ data: Listing & { packages: EventListing[] } }>(
        `/api/v1/public/listings/${props.listingId}`,
      )
    ).data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.listingId, load, { immediate: true })
</script>

<template>
  <div>
    <!-- Dark band under the header -->
    <section class="relative isolate overflow-hidden pt-20 pb-6 text-white sm:pt-28 sm:pb-8">
      <StageBackdrop :image="listing?.photos[0]?.url" :spotlights="false" intensity="soft" />
      <div class="container-page relative">
        <RouterLink
          :to="{ name: 'stays' }"
          class="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
        >
          <ArrowLeft class="size-4" /> Toutes les offres
        </RouterLink>
        <div v-if="listing" class="mt-4 animate-fade-up">
          <p class="chip glass">
            <component :is="TypeIcon" v-if="TypeIcon" class="size-3.5 text-brand-300" />
            {{ LISTING_TYPE_LABELS[listing.type] }}
          </p>
          <div class="mt-3 flex items-start justify-between gap-4">
            <h1 class="text-3xl font-extrabold sm:text-5xl">{{ listing.title }}</h1>
            <FavoriteButton :key="listing.id" :listing-id="listing.id" dark class="mt-1 shrink-0" />
          </div>
          <p class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-white/75">
            <span class="inline-flex items-center gap-1.5"
              ><Handshake class="size-4" /> {{ listing.partner?.name }}</span
            >
            <span v-if="listing.city" class="inline-flex items-center gap-1.5">
              <MapPin class="size-4" /> {{ listing.address ? `${listing.address}, ` : ''
              }}{{ listing.city }}
            </span>
            <span v-if="listing.capacity" class="inline-flex items-center gap-1.5">
              <Users class="size-4" />
              {{ listing.capacity > 1 ? `jusqu'à ${listing.capacity} personnes` : '1 personne' }}
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
      <RouterLink :to="{ name: 'stays' }" class="btn-primary mt-6"
        >Voir les autres offres</RouterLink
      >
    </div>

    <p v-else-if="failed" class="container-page py-10">
      <span class="alert-error block">Impossible de charger l'offre pour le moment.</span>
    </p>

    <div
      v-else-if="listing"
      class="container-page grid grid-cols-1 gap-6 pb-10 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_25rem]"
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
              <button
                v-if="canChat && listing.partner"
                type="button"
                class="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
                @click="writeToPartner"
              >
                <MessageCircle class="size-4" /> Écrire au lieu
              </button>
              <p v-if="chatError" class="input-error mt-1">{{ chatError }}</p>
            </div>
          </div>
          <div v-reveal="160" class="card flex items-start gap-3 p-4">
            <CalendarDays class="size-5 shrink-0 text-brand-600" />
            <div class="text-sm">
              <p class="font-semibold">Réservable toute l'année</p>
              <p class="text-muted">{{ tariffsLabel }}</p>
              <p v-if="minStay" class="mt-1 text-xs text-muted">{{ minStay }} minimum</p>
            </div>
          </div>
        </div>

        <!-- Availability calendar, synchronised with the booking card -->
        <div v-if="rules && (unit === 'night' || unit === 'day')" v-reveal class="card">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 class="font-display text-xl font-bold">Disponibilités</h2>
              <p class="text-sm text-muted">
                {{ unit === 'night' ? 'Choisis tes nuits' : 'Choisis tes jours' }} : les dates se
                reportent dans la réservation.
              </p>
            </div>
            <p v-if="startsOn && endsOn" class="chip bg-brand-50 text-brand-700">
              {{
                unit === 'night'
                  ? formatStayRange(startsOn, endsOn)
                  : startsOn === endsOn
                    ? formatStayDate(startsOn)
                    : `${formatStayDate(startsOn)} → ${formatStayDate(endsOn)}`
              }}
            </p>
          </div>
          <AvailabilityCalendar
            :key="unit"
            v-model:starts-on="startsOn"
            v-model:ends-on="endsOn"
            :listing-id="listing.id"
            :rules="rules"
            :unit="unit"
          />
        </div>

        <!-- Session: opening hours of the establishment -->
        <div v-if="listing.session && unit === 'session'" v-reveal class="card">
          <h2 class="font-display text-xl font-bold">Horaires d'ouverture</h2>
          <p class="text-sm text-muted">
            Choisis ton jour et ton heure : l'établissement confirme la séance.
          </p>
          <ul class="mt-4 grid gap-1 text-sm sm:grid-cols-2">
            <li
              v-for="line in openingLines(listing.session.opening_hours)"
              :key="line.label"
              class="flex justify-between rounded-xl bg-stone-50 px-3 py-2"
            >
              <span class="font-medium">{{ line.label }}</span>
              <span class="text-muted">{{ line.range }}</span>
            </li>
          </ul>
          <p v-if="listing.session.closed_dates.length" class="mt-3 text-xs text-muted">
            Fermé exceptionnellement :
            {{ listing.session.closed_dates.map(formatStayDate).join(', ') }}.
          </p>
        </div>

        <div v-if="listing.description" v-reveal class="card">
          <h2 class="font-display text-xl font-bold">À propos de cette offre</h2>
          <p class="mt-3 leading-relaxed whitespace-pre-line text-stone-600">
            {{ listing.description }}
          </p>
        </div>

        <!-- Event packages of the same listing -->
        <div v-if="listing.packages.length" v-reveal class="card">
          <h2 class="flex items-center gap-2 font-display text-xl font-bold">
            <CalendarHeart class="size-5 text-brand-600" /> Aussi proposée pour
          </h2>
          <ul class="mt-4 divide-y divide-stone-100">
            <li v-for="proposal in listing.packages" :key="proposal.id">
              <RouterLink
                v-if="proposal.event && proposal.package"
                :to="{
                  name: 'listing',
                  params: { slug: proposal.event.slug, listingId: listing.id },
                }"
                class="group flex items-center justify-between gap-4 py-3"
              >
                <span>
                  <span class="block font-semibold transition group-hover:text-brand-700">
                    {{ proposal.event.name }}
                  </span>
                  <span class="text-sm text-muted">
                    Forfait {{ durationLabel('night', proposal.package.nights) }} ·
                    {{ formatStayRange(proposal.package.starts_on, proposal.package.ends_on) }}
                  </span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block font-display font-bold">
                    {{ formatXof(proposal.package.customer_price) }}
                  </span>
                  <span v-if="proposal.package.available === 0" class="text-xs text-muted"
                    >Complet</span
                  >
                </span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Booking card: per night, per day (no event package here) -->
      <aside id="reserver" class="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
        <TariffBookingCard
          v-model:starts-on="startsOn"
          v-model:ends-on="endsOn"
          :listing="listing"
          :stay="listing.stay"
          @tariff="onTariff"
        />
      </aside>
    </div>

    <StickyBookingBar
      v-if="cheapest"
      :price="cheapest.price.customer_price"
      :unit="perUnitSuffix(cheapest.unit)"
      target="reserver"
    />
  </div>
</template>

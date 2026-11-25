<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarCheck,
  ChevronRight,
  Heart,
  LogOut,
  MessagesSquare,
  Ticket,
  UserRound,
} from 'lucide-vue-next'
import StageBackdrop from '@/components/StageBackdrop.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import ListingCard from '@/components/ListingCard.vue'
import FormField from '@/components/FormField.vue'
import { api } from '@/lib/api'
import { formatEventDate, formatShortDate, formatXof } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import { useMessagingStore } from '@/stores/messaging'
import { useFavorites } from '@/composables/useFavorites'
import type { FeedVideo } from '@/types/discovery'
import { BOOKING_STATUS_LABELS, type Booking, type BookingStatus } from '@/types/booking'
import { formatSessionDate } from '@/lib/sessions'
import { durationLabel, type Listing } from '@/types/catalog'
import type { Paginated, Resource, User } from '@/types/identity'

/** Customer account (V3): bookings (also those made before signing up), favorites, profile. */
const messaging = useMessagingStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

type Tab = 'reservations' | 'favoris' | 'profil'
const TABS: { key: Tab; label: string; icon: typeof Ticket }[] = [
  { key: 'reservations', label: 'Réservations', icon: Ticket },
  { key: 'favoris', label: 'Favoris', icon: Heart },
  { key: 'profil', label: 'Profil', icon: UserRound },
]
const needsName = computed(() => !auth.user?.name)
const tab = computed<Tab>(() => {
  const asked = route.query.onglet
  if (asked === 'reservations' || asked === 'favoris' || asked === 'profil') return asked
  return 'reservations'
})
const selectTab = (key: Tab) => router.replace({ query: { ...route.query, onglet: key } })

// ─── Bookings
const bookings = ref<Booking[]>([])
const bookingsPage = ref(1)
const bookingsLastPage = ref(1)
const bookingsLoading = ref(false)
const bookingsError = ref<string | null>(null)

async function loadBookings(page = 1) {
  bookingsLoading.value = true
  bookingsError.value = null
  try {
    const response = await api.get<Paginated<Booking>>('/api/v1/customer/bookings', { page })
    bookings.value = page === 1 ? response.data : [...bookings.value, ...response.data]
    bookingsPage.value = response.meta.current_page
    bookingsLastPage.value = response.meta.last_page
  } catch {
    bookingsError.value = 'Impossible de charger tes réservations.'
  } finally {
    bookingsLoading.value = false
  }
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-800',
  requested: 'bg-sky-50 text-sky-800',
  cancelled: 'bg-stone-100 text-stone-600',
  conflict: 'bg-red-50 text-red-700',
  expired: 'bg-stone-100 text-stone-600',
  failed: 'bg-stone-100 text-stone-600',
}

function bookingWhen(booking: Booking): string {
  const item = booking.items[0]
  if (booking.event) return formatEventDate(booking.event.starts_at)
  if (booking.session)
    return `${formatSessionDate(booking.session.starts_at)} · ${booking.session.minutes} min`
  if (!item?.stay_starts_on) return ''
  const range = `${formatShortDate(item.stay_starts_on)}${
    item.stay_ends_on && item.stay_ends_on !== item.stay_starts_on
      ? ` → ${formatShortDate(item.stay_ends_on)}`
      : ''
  }`
  return item.duration ? `${range} · ${durationLabel(item.pricing_unit, item.duration)}` : range
}

const trackingLink = (booking: Booking) => ({
  name: 'booking',
  params: { code: booking.code },
  query: booking.tracking_token ? { t: booking.tracking_token } : {},
})

// ─── Favorites
const favoriteHearts = useFavorites()
const favorites = ref<Listing[]>([])
const favoritesLoading = ref(false)
const favoritesLoaded = ref(false)
// Videos saved from "Découvrir" (V3).
const savedVideos = ref<FeedVideo[]>([])

async function loadFavorites() {
  favoritesLoading.value = true
  try {
    const [listings, videos] = await Promise.all([
      api.get<{ data: Listing[] }>('/api/v1/customer/favorites/listings'),
      api.get<{ data: FeedVideo[] }>('/api/v1/customer/favorites/videos'),
    ])
    favorites.value = listings.data
    savedVideos.value = videos.data
    favoriteHearts.seed(favorites.value)
    favoritesLoaded.value = true
  } catch {
    favorites.value = []
    savedVideos.value = []
  } finally {
    favoritesLoading.value = false
  }
}

// ─── Profile
const profile = reactive({ name: auth.user?.name ?? '', email: auth.user?.email ?? '' })
const profileForm = useForm()
const profileSaved = ref(false)

async function saveProfile() {
  profileSaved.value = false
  const response = await profileForm.submit(() =>
    api.put<Resource<User>>('/api/v1/customer/profile', { ...profile }),
  )
  if (!response) return
  auth.user = response.data
  profileSaved.value = true
}

async function logout() {
  await auth.logout()
  await router.replace({ name: 'home' })
}

const greeting = computed(() =>
  auth.user?.name ? `Bonjour ${auth.user.name.split(' ')[0]}` : 'Bienvenue',
)

onMounted(() => {
  // First visit: the name is asked first. The tab is kept in the address, so saving it stays here.
  if (needsName.value && !route.query.onglet) selectTab('profil')
  loadBookings()
})
watch(
  tab,
  (current) => {
    if (current === 'favoris' && !favoritesLoaded.value) loadFavorites()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden pt-28 pb-10 text-white sm:pt-32">
      <StageBackdrop :spotlights="false" intensity="soft" />
      <div class="container-page relative">
        <p class="chip glass tracking-widest uppercase">Mon compte</p>
        <h1 class="mt-4 text-4xl font-extrabold sm:text-5xl">{{ greeting }}</h1>
        <p class="mt-2 text-white/70">{{ auth.user?.phone }}</p>
        <RouterLink :to="{ name: 'customer.messages' }" class="btn-glass mt-4 py-2">
          <MessagesSquare class="size-4" /> Mes messages
          <span
            v-if="messaging.unread"
            class="grid min-w-5 place-items-center rounded-full bg-flare-500 px-1 text-[11px] font-bold"
          >
            {{ messaging.unread }}
          </span>
        </RouterLink>
      </div>
    </section>

    <section class="container-page pt-6 pb-20">
      <div class="tabs mb-6 max-w-full overflow-x-auto" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          role="tab"
          class="tab inline-flex items-center gap-1.5"
          :class="{ 'tab-active': tab === t.key }"
          :aria-selected="tab === t.key"
          @click="selectTab(t.key)"
        >
          <component :is="t.icon" class="size-4" /> {{ t.label }}
        </button>
      </div>

      <!-- Bookings -->
      <div v-if="tab === 'reservations'" class="space-y-3">
        <div v-if="bookingsError" class="alert-error">{{ bookingsError }}</div>
        <ListSkeleton v-if="bookingsLoading && bookings.length === 0" :rows="3" />
        <EmptyState
          v-else-if="bookings.length === 0 && !bookingsError"
          :icon="CalendarCheck"
          title="Aucune réservation pour le moment"
          text="Tes réservations apparaissent ici, y compris celles faites avec le même numéro avant la création de ton compte."
        >
          <RouterLink :to="{ name: 'stays' }" class="btn-primary">Réserver</RouterLink>
        </EmptyState>
        <RouterLink
          v-for="booking in bookings"
          :key="booking.code"
          :to="trackingLink(booking)"
          class="card card-hover flex items-center gap-4 p-4 sm:p-5"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="chip" :class="STATUS_STYLES[booking.status]">
                {{ BOOKING_STATUS_LABELS[booking.status] }}
              </span>
              <span class="font-mono text-xs text-muted">{{ booking.code }}</span>
            </div>
            <p class="truncate font-display font-semibold">
              {{ booking.items[0]?.title }}
              <span v-if="(booking.items[0]?.quantity ?? 1) > 1" class="text-muted">
                × {{ booking.items[0]?.quantity }}
              </span>
            </p>
            <p class="text-sm text-muted">
              <template v-if="booking.event">{{ booking.event.name }} · </template
              >{{ bookingWhen(booking) }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="font-display font-bold">{{ formatXof(booking.amount_total) }}</p>
            <ChevronRight class="ml-auto size-5 text-stone-400" />
          </div>
        </RouterLink>
        <button
          v-if="bookingsPage < bookingsLastPage"
          type="button"
          class="btn-secondary w-full"
          :disabled="bookingsLoading"
          @click="loadBookings(bookingsPage + 1)"
        >
          {{ bookingsLoading ? 'Chargement…' : 'Voir plus' }}
        </button>
      </div>

      <!-- Favorites -->
      <div v-else-if="tab === 'favoris'" class="space-y-6">
        <ListSkeleton v-if="favoritesLoading" :rows="2" />
        <EmptyState
          v-else-if="favorites.length === 0 && savedVideos.length === 0"
          :icon="Heart"
          title="Aucun favori"
          text="Touche le cœur d'une offre ou « Garder » sur une vidéo de Découvrir pour la retrouver ici."
        >
          <RouterLink :to="{ name: 'discover' }" class="btn-primary">Découvrir</RouterLink>
        </EmptyState>
        <div v-if="savedVideos.length" class="space-y-3">
          <h2 class="section-title">Vidéos gardées</h2>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <RouterLink
              v-for="video in savedVideos"
              :key="video.id"
              :to="{ name: 'discover-video', params: { videoId: video.id } }"
              class="relative aspect-[9/16] w-32 shrink-0 overflow-hidden rounded-2xl bg-night-900"
            >
              <img
                v-if="video.cover_url"
                :src="video.cover_url"
                alt=""
                class="size-full object-cover"
                loading="lazy"
              />
              <video
                v-else-if="video.video_url"
                :src="`${video.video_url}#t=1`"
                class="size-full object-cover"
                preload="metadata"
                muted
                playsinline
              />
              <span
                class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs font-semibold text-white"
              >
                {{ video.partner?.name }}
              </span>
            </RouterLink>
          </div>
        </div>
        <div v-if="favorites.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ListingCard
            v-for="listing in favorites"
            :key="listing.id"
            :listing="listing"
            :to="{ name: 'stay', params: { listingId: listing.id } }"
          />
        </div>
      </div>

      <!-- Profile -->
      <div v-else class="max-w-lg space-y-5">
        <div v-if="needsName" class="alert-info">
          Bienvenue sur KiffUp ! Indique ton nom : il remplira tes prochaines réservations.
        </div>
        <form class="card space-y-4 p-5 sm:p-6" @submit.prevent="saveProfile">
          <div v-if="profileSaved" class="alert-success">Profil enregistré.</div>
          <div v-if="profileForm.error.value" class="alert-error">
            {{ profileForm.error.value }}
          </div>
          <FormField label="Nom complet" for="name" :error="profileForm.fieldError('name')">
            <input id="name" v-model="profile.name" class="input" autocomplete="name" required />
          </FormField>
          <FormField
            label="Email (facultatif)"
            for="email"
            :error="profileForm.fieldError('email')"
          >
            <input
              id="email"
              v-model="profile.email"
              class="input"
              type="email"
              autocomplete="email"
            />
          </FormField>
          <div>
            <p class="label">Téléphone</p>
            <p class="text-sm">
              {{ auth.user?.phone }}
              <span class="text-muted">· ton identifiant de connexion</span>
            </p>
          </div>
          <button class="btn-primary w-full" type="submit" :disabled="profileForm.processing.value">
            {{ profileForm.processing.value ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </form>
        <button type="button" class="btn-ghost w-full" @click="logout">
          <LogOut class="size-4" /> Se déconnecter
        </button>
      </div>
    </section>
  </div>
</template>

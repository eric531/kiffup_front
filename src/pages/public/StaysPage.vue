<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { ChevronLeft, ChevronRight, MapPin, Search, SearchX, Users } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { addDays, formatStayRange } from '@/lib/format'
import { LISTING_CATEGORY_ICONS } from '@/lib/icons'
import StageBackdrop from '@/components/StageBackdrop.vue'
import ListingCard from '@/components/ListingCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { LISTING_CATEGORIES, type Listing, type ListingCategory } from '@/types/catalog'

/**
 * "Réserver": listings bookable all year (per night, per day or per session), outside events.
 * The filters live in the URL so a search can be shared or reloaded.
 */
type CatalogListing = Listing & { available: number | null }
interface CatalogPage {
  data: CatalogListing[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

const route = useRoute()
const router = useRouter()
useHead({ title: 'Réserver' })
const tomorrow = addDays(new Date().toLocaleDateString('sv-SE'), 1)

const cities = ref<{ city: string; listings: number }[]>([])
const result = ref<CatalogPage | null>(null)
const loading = ref(true)
const failed = ref(false)

const str = (value: unknown) => (typeof value === 'string' ? value : '')
const query = computed(() => ({
  city: str(route.query.ville),
  category: (LISTING_CATEGORIES.some((c) => c.key === route.query.categorie)
    ? route.query.categorie
    : '') as ListingCategory | '',
  arrival: str(route.query.arrivee),
  departure: str(route.query.depart),
  quantity: Math.max(1, Number(str(route.query.unites)) || 1),
  page: Math.max(1, Number(str(route.query.page)) || 1),
}))
const hasDates = computed(() => !!query.value.arrival && !!query.value.departure)

// Search form, applied on submit (category chips and pages apply at once).
const form = reactive({ city: '', arrival: '', departure: '', quantity: 1 })
watch(
  query,
  (q) =>
    Object.assign(form, {
      city: q.city,
      arrival: q.arrival,
      departure: q.departure,
      quantity: q.quantity,
    }),
  { immediate: true },
)
watch(
  () => form.arrival,
  (arrival) => {
    if (arrival && (!form.departure || form.departure <= arrival))
      form.departure = addDays(arrival, 1)
  },
)

function navigate(changes: Partial<typeof query.value>) {
  const next = { ...query.value, page: 1, ...changes }
  router.replace({
    query: {
      ville: next.city || undefined,
      categorie: next.category || undefined,
      arrivee: next.arrival || undefined,
      depart: next.arrival ? next.departure || undefined : undefined,
      unites: next.quantity > 1 ? String(next.quantity) : undefined,
      page: next.page > 1 ? String(next.page) : undefined,
    },
  })
}
const search = () =>
  navigate({
    city: form.city,
    arrival: form.arrival,
    departure: form.departure,
    quantity: form.quantity,
  })
const resetDates = () => navigate({ arrival: '', departure: '', quantity: 1 })

async function load() {
  loading.value = true
  failed.value = false
  const q = query.value
  try {
    result.value = await api.get<CatalogPage>('/api/v1/public/listings', {
      city: q.city || undefined,
      type: LISTING_CATEGORIES.find((c) => c.key === q.category)?.types.join(','),
      arrival: hasDates.value ? q.arrival : undefined,
      departure: hasDates.value ? q.departure : undefined,
      quantity: hasDates.value && q.quantity > 1 ? q.quantity : undefined,
      page: q.page,
      per_page: 12,
    })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
watch(query, load, { immediate: true })
api
  .get<{ data: { city: string; listings: number }[] }>('/api/v1/public/listings/cities')
  .then((r) => (cities.value = r.data))
  .catch(() => {})

const total = computed(() => result.value?.meta.total ?? 0)
</script>

<template>
  <div>
    <!-- ───────────── HERO + SEARCH ───────────── -->
    <section class="relative isolate overflow-hidden pt-22 pb-8 text-white sm:pt-32 sm:pb-14">
      <StageBackdrop :spotlights="false" intensity="soft" />
      <div class="container-page relative">
        <p class="chip glass animate-fade-up tracking-widest uppercase">Toute l'année</p>
        <h1 class="mt-4 max-w-3xl text-3xl font-extrabold animate-fade-up sm:text-6xl">
          Réserve ce que tu kiffes, <span class="text-gradient">avec ou sans événement</span>
        </h1>
        <!-- Phones: straight to the search, as in an app. -->
        <p class="mt-4 hidden max-w-2xl text-lg text-white/75 animate-fade-up sm:block">
          Une chambre pour la nuit, une voiture pour la journée, un massage à l'heure qui t'arrange
          : chez nos partenaires vérifiés. Tu paies en ligne, tu reçois ton QR code.
        </p>

        <form
          class="mt-6 grid grid-cols-2 gap-2 rounded-4xl glass p-2.5 shadow-lift animate-fade-up sm:mt-8 sm:gap-3 sm:p-3 lg:grid-cols-[1.3fr_1fr_1fr_0.7fr_auto]"
          role="search"
          @submit.prevent="search"
        >
          <label class="col-span-2 rounded-3xl bg-white px-4 py-2.5 text-ink lg:col-span-1">
            <span class="block text-[11px] font-semibold tracking-wide text-muted uppercase"
              >Ville</span
            >
            <select
              v-model="form.city"
              class="w-full bg-transparent text-sm font-medium outline-none"
            >
              <option value="">Toutes les villes</option>
              <option v-for="c in cities" :key="c.city" :value="c.city">
                {{ c.city }} ({{ c.listings }})
              </option>
            </select>
          </label>
          <label class="rounded-3xl bg-white px-4 py-2.5 text-ink">
            <span class="block text-[11px] font-semibold tracking-wide text-muted uppercase"
              >Du</span
            >
            <input
              v-model="form.arrival"
              type="date"
              :min="tomorrow"
              class="w-full bg-transparent text-sm font-medium outline-none"
            />
          </label>
          <label class="rounded-3xl bg-white px-4 py-2.5 text-ink">
            <span class="block text-[11px] font-semibold tracking-wide text-muted uppercase"
              >Au</span
            >
            <input
              v-model="form.departure"
              type="date"
              :min="form.arrival ? addDays(form.arrival, 1) : tomorrow"
              :disabled="!form.arrival"
              class="w-full bg-transparent text-sm font-medium outline-none disabled:text-stone-400"
            />
          </label>
          <label class="rounded-3xl bg-white px-4 py-2.5 text-ink">
            <span class="block text-[11px] font-semibold tracking-wide text-muted uppercase"
              >Quantité</span
            >
            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              max="20"
              class="w-full bg-transparent text-sm font-medium outline-none"
            />
          </label>
          <button type="submit" class="btn-primary rounded-3xl px-4 sm:px-6">
            <Search class="size-4" /> Rechercher
          </button>
        </form>
      </div>
    </section>

    <!-- ───────────── CATEGORY FILTERS (sticky) ───────────── -->
    <div class="sticky top-16 z-30 border-b border-stone-200/70 bg-surface/85 backdrop-blur-lg">
      <div class="container-page flex items-center gap-2.5 overflow-x-auto py-3">
        <button
          v-for="category in [null, ...LISTING_CATEGORIES]"
          :key="category?.key ?? 'all'"
          class="chip shrink-0 border px-4 py-2 text-sm transition"
          :class="
            query.category === (category?.key ?? '')
              ? 'border-transparent bg-night-900 text-white shadow-md'
              : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
          "
          :title="category?.hint"
          @click="navigate({ category: category?.key ?? '' })"
        >
          <component :is="LISTING_CATEGORY_ICONS[category.key]" v-if="category" class="size-4" />
          {{ category?.label ?? 'Tout' }}
        </button>
        <span class="ml-auto hidden shrink-0 text-sm text-muted sm:block">
          {{ total }} offre{{ total > 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- ───────────── RESULTS ───────────── -->
    <section class="container-page py-10">
      <div
        v-if="hasDates || query.city"
        class="mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-600"
      >
        <span v-if="query.city" class="chip bg-white shadow-sm">
          <MapPin class="size-3.5 text-brand-600" /> {{ query.city }}
        </span>
        <span v-if="hasDates" class="chip bg-white shadow-sm">
          {{ formatStayRange(query.arrival, query.departure) }}
        </span>
        <span v-if="hasDates && query.quantity > 1" class="chip bg-white shadow-sm">
          <Users class="size-3.5 text-brand-600" /> × {{ query.quantity }}
        </span>
        <button v-if="hasDates" type="button" class="btn-ghost py-1 text-xs" @click="resetDates">
          Effacer les dates
        </button>
      </div>

      <p v-if="failed" class="alert-error">Impossible de charger les offres pour le moment.</p>

      <div v-else-if="loading && !result" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="result && result.data.length === 0" class="card py-14 text-center">
        <SearchX class="mx-auto size-10 text-stone-300" />
        <p class="mt-3 font-display text-xl font-semibold">Aucune offre ne correspond</p>
        <p class="mt-2 text-muted">
          {{
            hasDates
              ? 'Tout est réservé à ces dates : essaie d’autres dates ou une autre ville.'
              : 'Essaie une autre ville ou une autre catégorie.'
          }}
        </p>
      </div>

      <template v-else-if="result">
        <div
          class="grid gap-6 transition sm:grid-cols-2 lg:grid-cols-3"
          :class="{ 'opacity-60': loading }"
        >
          <div v-for="(listing, i) in result.data" :key="listing.id" v-reveal="(i % 3) * 80">
            <ListingCard
              :listing="listing"
              :available="listing.available"
              :to="{
                name: 'stay',
                params: { listingId: listing.id },
                query: hasDates ? { arrivee: query.arrival, depart: query.departure } : undefined,
              }"
            />
          </div>
        </div>

        <nav
          v-if="result.meta.last_page > 1"
          class="mt-10 flex items-center justify-center gap-3"
          aria-label="Pagination"
        >
          <button
            type="button"
            class="btn-secondary"
            :disabled="query.page <= 1"
            @click="navigate({ page: query.page - 1 })"
          >
            <ChevronLeft class="size-4" /> Précédent
          </button>
          <span class="text-sm text-muted">
            Page {{ result.meta.current_page }} / {{ result.meta.last_page }}
          </span>
          <button
            type="button"
            class="btn-secondary"
            :disabled="query.page >= result.meta.last_page"
            @click="navigate({ page: query.page + 1 })"
          >
            Suivant <ChevronRight class="size-4" />
          </button>
        </nav>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { CalendarDays, ChevronRight, MapPin, Package, Plus } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatShortDate, formatXof } from '@/lib/format'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import PageHeader from '@/components/PageHeader.vue'
import SearchField from '@/components/SearchField.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import {
  LISTING_STATUS_BADGES,
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
  type Listing,
  type ListingStatus,
  type ListingType,
  type Partner,
} from '@/types/catalog'
import type { Paginated } from '@/types/identity'

/** Back-office: every listing of the partners, bookable all year and proposed to events. */
const listings = ref<Listing[]>([])
const partners = ref<Partner[]>([])
const loading = ref(true)
const search = ref('')
const partnerId = ref<number | ''>('')
const type = ref<ListingType | ''>('')
const status = ref<ListingStatus | ''>('')
// Listings created or changed by the partners, waiting for a decision (V3, lot F6).
const pendingReview = ref(0)

async function load() {
  loading.value = true
  try {
    const response = await api.get<Paginated<Listing> & { pending_review: number }>(
      '/api/v1/admin/listings',
      {
        search: search.value || undefined,
        partner_id: partnerId.value || undefined,
        type: type.value || undefined,
        status: status.value || undefined,
        per_page: 200,
      },
    )
    listings.value = response.data
    pendingReview.value = response.pending_review
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
})
watch([partnerId, type, status], load)
onMounted(async () => {
  partners.value = (
    await api.get<Paginated<Partner>>('/api/v1/admin/partners', { per_page: 100 })
  ).data
  await load()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Offres"
      subtitle="Réservables toute l'année à la nuit ou au jour, et proposées aux événements."
      :icon="Package"
    >
      <template #actions>
        <RouterLink
          :to="{ name: 'admin.listings.create', query: partnerId ? { partner_id: partnerId } : {} }"
          class="btn-primary"
        >
          <Plus class="size-4" /> Nouvelle offre
        </RouterLink>
      </template>
    </PageHeader>

    <button
      v-if="pendingReview && status !== 'pending_review'"
      class="alert-info flex w-full items-center justify-between gap-3 text-left"
      @click="status = 'pending_review'"
    >
      <span>
        <strong>{{ pendingReview }}</strong> offre{{ pendingReview > 1 ? 's' : '' }} de partenaires
        à valider.
      </span>
      <ChevronRight class="size-4 shrink-0" />
    </button>

    <div class="flex flex-col gap-3 sm:flex-row">
      <SearchField v-model="search" placeholder="Titre ou ville" />
      <select v-model="partnerId" class="input sm:max-w-60" aria-label="Partenaire">
        <option value="">Tous les partenaires</option>
        <option v-for="partner in partners" :key="partner.id" :value="partner.id">
          {{ partner.name }}
        </option>
      </select>
      <select v-model="status" class="input sm:max-w-44" aria-label="État">
        <option value="">Tous les états</option>
        <option v-for="(label, value) in LISTING_STATUS_LABELS" :key="value" :value="value">
          {{ label }}{{ value === 'pending_review' && pendingReview ? ` (${pendingReview})` : '' }}
        </option>
      </select>
      <select v-model="type" class="input sm:max-w-52" aria-label="Type">
        <option value="">Tous les types</option>
        <option v-for="(label, value) in LISTING_TYPE_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <ListSkeleton v-if="loading" />
    <EmptyState v-else-if="listings.length === 0" :icon="Package" title="Aucune offre">
      <RouterLink :to="{ name: 'admin.listings.create' }" class="btn-primary">
        <Plus class="size-4" /> Créer une offre
      </RouterLink>
    </EmptyState>

    <ul v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <li v-for="(listing, i) in listings" :key="listing.id" v-reveal="(i % 2) * 70">
        <RouterLink
          :to="{ name: 'admin.listings.edit', params: { id: listing.id } }"
          class="group card card-hover flex items-start gap-4 p-4"
          :class="{ 'opacity-70': listing.status === 'hidden' || listing.status === 'rejected' }"
        >
          <span
            class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-brand-600"
          >
            <img
              v-if="listing.photos[0]"
              :src="listing.photos[0].url"
              alt=""
              class="size-full object-cover"
            />
            <component :is="LISTING_TYPE_ICONS[listing.type]" v-else class="size-6" />
          </span>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate font-semibold">{{ listing.title }}</p>
              <span :class="LISTING_STATUS_BADGES[listing.status]">
                {{ LISTING_STATUS_LABELS[listing.status] }}
              </span>
            </div>
            <p class="flex flex-wrap items-center gap-x-3 text-sm text-muted">
              <span>{{ listing.partner?.name }}</span>
              <span class="inline-flex items-center gap-1"
                ><MapPin class="size-3.5" /> {{ listing.city }}</span
              >
              <span>{{ listing.units }} unité{{ listing.units > 1 ? 's' : '' }}</span>
              <span v-if="listing.partner_updated_at" class="text-xs">
                Modifiée par le partenaire le {{ formatShortDate(listing.partner_updated_at) }}
              </span>
            </p>
            <p class="flex flex-wrap gap-1.5 pt-1 text-xs">
              <span v-if="listing.tariffs.night" class="chip bg-surface text-ink">
                {{ formatXof(listing.tariffs.night.customer_price) }} / nuit
              </span>
              <span v-if="listing.tariffs.day" class="chip bg-surface text-ink">
                {{ formatXof(listing.tariffs.day.customer_price) }} / jour
              </span>
              <span v-if="listing.proposals?.length" class="chip bg-brand-50 text-brand-700">
                <CalendarDays class="size-3" /> {{ listing.proposals.length }} événement{{
                  listing.proposals.length > 1 ? 's' : ''
                }}
              </span>
              <span
                v-if="!listing.tariffs.night && !listing.tariffs.day && !listing.proposals?.length"
                class="chip bg-amber-50 text-amber-800"
                >Aucun tarif</span
              >
            </p>
          </div>
          <ChevronRight
            class="mt-1 size-5 shrink-0 text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-500"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import { EVENT_STATUS_LABELS, type EventItem, type EventStatus } from '@/types/catalog'
import type { Paginated } from '@/types/identity'
import { CalendarDays, ChevronRight, MapPin, Plus } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import SearchField from '@/components/SearchField.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const events = ref<EventItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const status = ref<EventStatus | ''>('')
const search = ref('')

const statusClasses: Record<EventStatus, string> = {
  draft: 'badge-neutral',
  published: 'badge-success',
  closed: 'badge-warning',
  archived: 'badge-neutral',
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get<Paginated<EventItem>>('/api/v1/admin/events', {
      status: status.value || undefined,
      search: search.value || undefined,
      per_page: 100,
    })
    events.value = response.data
  } catch {
    error.value = 'Impossible de charger les événements.'
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
})
watch(status, load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Événements"
      subtitle="Concerts et spectacles en vente sur la plateforme."
      :icon="CalendarDays"
    >
      <template #actions>
        <RouterLink :to="{ name: 'admin.events.create' }" class="btn-primary">
          <Plus class="size-4" /> Nouvel événement
        </RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-3 sm:flex-row">
      <SearchField v-model="search" placeholder="Rechercher (nom, artiste)" />
      <select v-model="status" class="input sm:max-w-52" aria-label="Statut">
        <option value="">Tous les statuts</option>
        <option v-for="(label, value) in EVENT_STATUS_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <ListSkeleton v-else-if="loading" />
    <EmptyState v-else-if="events.length === 0" :icon="CalendarDays" title="Aucun événement">
      <RouterLink :to="{ name: 'admin.events.create' }" class="btn-primary">
        <Plus class="size-4" /> Créer un événement
      </RouterLink>
    </EmptyState>

    <ul v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <li v-for="(event, i) in events" :key="event.id" v-reveal="(i % 2) * 70">
        <RouterLink
          :to="{ name: 'admin.events.edit', params: { id: event.id } }"
          class="group card card-hover flex items-center gap-4 p-4"
        >
          <div
            class="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-dusk-600 via-flare-500 to-brand-500"
          >
            <img
              v-if="event.cover_url"
              :src="event.cover_url"
              alt=""
              class="size-full object-cover transition duration-500 group-hover:scale-110"
            />
            <CalendarDays v-else class="absolute inset-0 m-auto size-8 text-white/80" />
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate font-semibold">{{ event.name }}</p>
              <span :class="statusClasses[event.status]">{{
                EVENT_STATUS_LABELS[event.status]
              }}</span>
            </div>
            <p class="flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays class="size-3.5" /> {{ formatShortDate(event.starts_at) }}
            </p>
            <p class="flex items-center gap-1.5 truncate text-sm text-muted">
              <MapPin class="size-3.5" /> {{ event.city }} ·
              <span class="font-mono text-xs">/{{ event.slug }}</span>
            </p>
          </div>
          <ChevronRight
            class="size-5 shrink-0 text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-500"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

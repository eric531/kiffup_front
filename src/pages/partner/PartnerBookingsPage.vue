<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/lib/api'
import BookingLineCard from '@/components/BookingLineCard.vue'
import SessionRequestActions from '@/components/SessionRequestActions.vue'
import type { PartnerBookingLine } from '@/types/partnerArea'
import { ReceiptText, ScanLine } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import SearchField from '@/components/SearchField.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const lines = ref<PartnerBookingLine[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
// Session requests to answer (V3, lot F4) come first when there are any.
const arrival = ref<'' | 'requests' | 'expected' | 'arrived'>('expected')
const search = ref('')
const requests = ref(0)
const notice = ref<string | null>(null)

async function countRequests() {
  try {
    requests.value = (
      await api.get<{ data: PartnerBookingLine[] }>('/api/v1/partner/bookings', {
        status: 'requested',
      })
    ).data.length
  } catch {
    requests.value = 0
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    lines.value = (
      await api.get<{ data: PartnerBookingLine[] }>('/api/v1/partner/bookings', {
        arrival:
          arrival.value === 'expected' || arrival.value === 'arrived' ? arrival.value : undefined,
        status: arrival.value === 'requests' ? 'requested' : arrival.value ? 'paid' : undefined,
        search: search.value || undefined,
      })
    ).data
  } catch {
    error.value = 'Impossible de charger vos réservations.'
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
})
watch(arrival, load)
onMounted(async () => {
  await countRequests()
  if (requests.value > 0) arrival.value = 'requests'
  else await load()
})

async function onAnswered(message: string) {
  notice.value = message
  await Promise.all([countRequests(), load()])
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Mes réservations"
      subtitle="Vos clients, leurs demandes de séance et leurs arrivées."
      :icon="ReceiptText"
    >
      <template #actions>
        <RouterLink :to="{ name: 'partner.check-in' }" class="btn-primary">
          <ScanLine class="size-4" /> Enregistrer une arrivée
        </RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="tabs" role="group" aria-label="Filtrer">
        <button
          v-for="option in [
            { value: 'requests', label: requests ? `Demandes (${requests})` : 'Demandes' },
            { value: 'expected', label: 'Attendus' },
            { value: 'arrived', label: 'Arrivés' },
            { value: '', label: 'Toutes' },
          ] as const"
          :key="option.value"
          class="tab"
          :class="{ 'tab-active': arrival === option.value }"
          :aria-pressed="arrival === option.value"
          @click="arrival = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <SearchField v-model="search" placeholder="Code, nom ou téléphone" />
    </div>

    <div v-if="notice" class="alert-success">{{ notice }}</div>
    <div v-if="error" class="alert-error">{{ error }}</div>
    <ListSkeleton v-else-if="loading" />
    <EmptyState
      v-else-if="lines.length === 0"
      :icon="ReceiptText"
      :title="arrival === 'requests' ? 'Aucune demande en attente' : 'Aucune réservation'"
      :text="
        arrival === 'requests'
          ? 'Les demandes de séance de vos clients apparaîtront ici.'
          : 'Les réservations payées de vos clients apparaîtront ici.'
      "
    />
    <ul v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <li
        v-for="(line, i) in lines"
        :key="`${line.code}-${line.title}`"
        v-reveal="(i % 2) * 70"
        class="card card-hover"
      >
        <BookingLineCard :line="line" />
        <SessionRequestActions
          v-if="line.status === 'requested'"
          :line="line"
          class="mt-4"
          @answered="onAnswered"
        />
      </li>
    </ul>
  </div>
</template>

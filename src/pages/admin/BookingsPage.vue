<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/lib/api'
import { formatShortDate, formatStayRange, formatXof } from '@/lib/format'
import { BOOKING_STATUS_LABELS, type Booking, type BookingStatus } from '@/types/booking'
import type { Paginated } from '@/types/identity'
import { useForm } from '@/composables/useForm'
import { Ban, CalendarDays, Download, ReceiptText } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import SearchField from '@/components/SearchField.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import { durationLabel } from '@/types/catalog'

const apiBase = import.meta.env.VITE_API_URL ?? ''
const bookings = ref<Booking[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const status = ref<BookingStatus | ''>('')
const search = ref('')

const statusClasses: Record<BookingStatus, string> = {
  pending: 'badge-warning',
  requested: 'badge-info',
  paid: 'badge-success',
  expired: 'badge-neutral',
  failed: 'badge-neutral',
  conflict: 'badge-danger',
  cancelled: 'badge-neutral',
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get<Paginated<Booking>>('/api/v1/admin/bookings', {
      status: status.value || undefined,
      search: search.value || undefined,
      per_page: 100,
    })
    bookings.value = response.data
  } catch {
    error.value = 'Impossible de charger les réservations.'
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
// Admin cancellation (dispute or order paid without stock)
const cancelling = ref<string | null>(null)
const cancelInput = reactive({ reason: '', waive_penalty: false })
const cancelForm = useForm()

async function cancelBooking(booking: Booking) {
  const result = await cancelForm.submit(() =>
    api.post<{ data: Booking }>(`/api/v1/admin/bookings/${booking.code}/cancel`, {
      ...cancelInput,
    }),
  )
  if (result) {
    bookings.value = bookings.value.map((b) => (b.code === booking.code ? result.data : b))
    cancelling.value = null
    Object.assign(cancelInput, { reason: '', waive_penalty: false })
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Réservations"
      subtitle="Toutes les commandes de la plateforme."
      :icon="ReceiptText"
    >
      <template #actions>
        <!-- Same origin (session cookie): the browser downloads the CSV directly. -->
        <a
          :href="`${apiBase}/api/v1/admin/bookings-export${status ? `?status=${status}` : ''}`"
          class="btn-secondary"
          download
        >
          <Download class="size-4" /> Exporter en CSV (Excel)
        </a>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-3 sm:flex-row">
      <SearchField v-model="search" placeholder="Code, nom, téléphone, email" />
      <select v-model="status" class="input sm:max-w-52" aria-label="Statut">
        <option value="">Tous les statuts</option>
        <option v-for="(label, value) in BOOKING_STATUS_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <ListSkeleton v-else-if="loading" />
    <EmptyState
      v-else-if="bookings.length === 0"
      :icon="ReceiptText"
      title="Aucune réservation"
      text="Modifiez la recherche ou le filtre de statut."
    />

    <ul v-else class="space-y-4">
      <li
        v-for="(booking, i) in bookings"
        :key="booking.code"
        v-reveal="Math.min(i, 4) * 50"
        class="card space-y-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono text-lg font-bold tracking-wide">{{ booking.code }}</p>
            <p class="text-sm">
              <strong>{{ booking.customer.name }}</strong> · {{ booking.customer.phone }}
              <span class="text-muted">· {{ booking.customer.email }}</span>
            </p>
          </div>
          <span :class="statusClasses[booking.status]">
            {{ BOOKING_STATUS_LABELS[booking.status] }}
          </span>
        </div>
        <p class="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <CalendarDays class="size-4" />
          <template v-for="item in booking.items" :key="item.listing_id"
            >{{ item.title }} × {{ item.quantity }}
            <span v-if="item.stay_starts_on && item.stay_ends_on" class="badge-info">
              {{ formatStayRange(item.stay_starts_on, item.stay_ends_on) }} ·
              {{ durationLabel(item.pricing_unit, item.duration) }}
            </span></template
          >
          · {{ booking.event?.name ?? 'Hors événement' }}
        </p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-2xl bg-surface px-3 py-2">
            <p class="text-xs text-muted">Payé</p>
            <p class="font-semibold tabular-nums">{{ formatXof(booking.amount_total) }}</p>
          </div>
          <div class="rounded-2xl bg-surface px-3 py-2">
            <p class="text-xs text-muted">Partenaire</p>
            <p class="font-semibold tabular-nums">{{ formatXof(booking.total_partner_amount) }}</p>
          </div>
          <div class="rounded-2xl bg-emerald-50 px-3 py-2">
            <p class="text-xs text-emerald-700">Commission</p>
            <p class="font-semibold text-emerald-900 tabular-nums">
              {{ formatXof(booking.total_commission) }}
            </p>
          </div>
          <div class="rounded-2xl bg-surface px-3 py-2">
            <p class="text-xs text-muted">Frais paiement</p>
            <p class="font-semibold tabular-nums">
              {{ booking.payment_fee == null ? '—' : formatXof(booking.payment_fee) }}
            </p>
          </div>
        </div>
        <p class="text-xs text-muted">
          Créée le {{ booking.created_at ? formatShortDate(booking.created_at) : '—' }}
          <template v-if="booking.paid_at">
            · payée le {{ formatShortDate(booking.paid_at) }}</template
          >
        </p>
        <p
          v-if="booking.status === 'cancelled'"
          class="rounded-2xl bg-stone-50 px-4 py-2.5 text-sm"
        >
          Annulée ({{ booking.cancelled_by === 'admin' ? 'par l’admin' : 'par le client' }}) ·
          remboursé {{ formatXof(booking.refund_amount) }} · pénalité
          {{ formatXof(booking.penalty_amount) }}
          <span v-if="booking.cancellation_reason" class="text-muted"
            >· {{ booking.cancellation_reason }}</span
          >
        </p>

        <template v-if="booking.status === 'paid' || booking.status === 'conflict'">
          <button
            v-if="cancelling !== booking.code"
            class="btn-ghost -ml-3 text-sm text-red-700 hover:bg-red-50 hover:text-red-800"
            @click="cancelling = booking.code"
          >
            <Ban class="size-4" />
            {{ booking.status === 'conflict' ? 'Rembourser intégralement' : 'Annuler (litige)' }}
          </button>
          <form v-else class="panel" @submit.prevent="cancelBooking(booking)">
            <div
              v-if="cancelForm.error.value || cancelForm.fieldError('booking')"
              class="alert-error"
            >
              {{ cancelForm.fieldError('booking') ?? cancelForm.error.value }}
            </div>
            <input
              v-model="cancelInput.reason"
              class="input"
              placeholder="Motif (obligatoire)"
              required
            />
            <p v-if="cancelForm.fieldError('reason')" class="input-error">
              {{ cancelForm.fieldError('reason') }}
            </p>
            <label v-if="booking.status === 'paid'" class="flex items-center gap-2 text-sm">
              <input
                v-model="cancelInput.waive_penalty"
                type="checkbox"
                class="size-4 accent-brand-600"
              />
              Rembourser sans pénalité (faute du partenaire)
            </label>
            <p class="text-xs text-muted">
              La part du partenaire lui est retirée ; si elle était déjà débloquée, son solde peut
              devenir négatif.
            </p>
            <div class="flex gap-2">
              <button class="btn-danger" type="submit" :disabled="cancelForm.processing.value">
                Confirmer
              </button>
              <button type="button" class="btn-ghost" @click="cancelling = null">Fermer</button>
            </div>
          </form>
        </template>
      </li>
    </ul>
  </div>
</template>

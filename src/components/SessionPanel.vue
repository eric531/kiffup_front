<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock, CircleCheckBig, Hourglass, UserX } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatEventDate } from '@/lib/format'
import { formatSessionDate } from '@/lib/sessions'
import { useForm } from '@/composables/useForm'
import type { Booking } from '@/types/booking'

/**
 * Session (V3, lot F4) on the tracking page: waiting for the partner, other time proposed
 * (accept / refuse), then the answer to the reminders (coming / no longer coming).
 */
const props = defineProps<{ booking: Booking; token: string }>()
const emit = defineEmits<{ updated: [booking: Booking] }>()

const session = computed(() => props.booking.session!)
const upcoming = computed(
  () =>
    props.booking.status === 'paid' &&
    new Date(session.value.starts_at).getTime() > Date.now() &&
    !props.booking.items.some((item) => item.checked_in_at),
)
const action = useForm()

async function post(path: string, body?: Record<string, unknown>) {
  const result = await action.submit(() =>
    api.post<{ data: Booking }>(
      `/api/v1/public/bookings/${props.booking.code}/${path}?t=${encodeURIComponent(props.token)}`,
      body,
    ),
  )
  if (result) emit('updated', result.data)
}
</script>

<template>
  <section v-if="booking.status === 'requested' || upcoming" class="card space-y-4 text-sm">
    <div
      v-if="action.error.value || action.fieldError('attendance') || action.fieldError('booking')"
      class="alert-error"
    >
      {{ action.fieldError('attendance') ?? action.fieldError('booking') ?? action.error.value }}
    </div>

    <!-- Other time proposed by the establishment -->
    <template v-if="booking.status === 'requested' && session.proposed_starts_at">
      <h2 class="flex items-center gap-2 font-display text-lg font-bold">
        <CalendarClock class="size-5 text-brand-600" /> Autre heure proposée
      </h2>
      <p>
        L'établissement ne peut pas te recevoir le {{ formatSessionDate(session.starts_at) }}. Il te
        propose :
      </p>
      <p
        class="rounded-2xl bg-brand-50 px-4 py-3 font-display text-lg font-bold text-brand-800 first-letter:uppercase"
      >
        {{ formatSessionDate(session.proposed_starts_at) }}
      </p>
      <p v-if="session.proposal_due_at" class="text-muted">
        Réponds avant le {{ formatEventDate(session.proposal_due_at) }}. Si tu refuses ou ne réponds
        pas, on te rembourse en entier.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          class="btn-primary"
          :disabled="action.processing.value"
          @click="post('proposal/accept')"
        >
          Accepter cette heure
        </button>
        <button
          class="btn-secondary"
          :disabled="action.processing.value"
          @click="post('proposal/refuse')"
        >
          Refuser et être remboursé
        </button>
      </div>
    </template>

    <!-- Waiting for the establishment -->
    <template v-else-if="booking.status === 'requested'">
      <h2 class="flex items-center gap-2 font-display text-lg font-bold">
        <Hourglass class="size-5 text-brand-600" /> En attente de l'établissement
      </h2>
      <p>
        Tu as demandé une séance le
        <strong class="first-letter:uppercase">{{ formatSessionDate(session.starts_at) }}</strong
        >. L'établissement confirme l'heure ou t'en propose une autre : on te prévient sur WhatsApp.
      </p>
      <p v-if="session.response_due_at" class="text-muted">
        Réponse au plus tard le {{ formatEventDate(session.response_due_at) }}. Sans accord, on te
        rembourse en entier.
      </p>
    </template>

    <!-- Confirmed and upcoming: answer to the reminders -->
    <template v-else>
      <h2 class="font-display text-lg font-bold">Ta venue</h2>
      <p v-if="session.attendance === 'confirmed'" class="flex items-center gap-2 text-emerald-700">
        <CircleCheckBig class="size-4" /> Tu as confirmé ta venue. À bientôt !
      </p>
      <p
        v-else-if="session.attendance === 'declined'"
        class="flex items-center gap-2 text-stone-700"
      >
        <UserX class="size-4" /> Tu as prévenu que tu ne pourras pas venir. L'acompte n'est pas
        remboursé.
      </p>
      <p v-else class="text-muted">
        Confirme ta venue : l'établissement saura qu'il peut compter sur toi.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="session.attendance !== 'confirmed'"
          class="btn-primary"
          :disabled="action.processing.value"
          @click="post('attendance', { coming: true })"
        >
          Je confirme ma venue
        </button>
        <button
          v-if="session.attendance !== 'declined' && !booking.is_cancellable"
          class="btn-secondary"
          :disabled="action.processing.value"
          @click="post('attendance', { coming: false })"
        >
          Je ne peux plus venir
        </button>
      </div>
      <p v-if="booking.is_cancellable" class="text-xs text-muted">
        Tu ne peux plus venir ? Annule ci-dessous : on te rembourse, moins la pénalité.
      </p>
      <p v-else-if="session.attendance !== 'declined'" class="text-xs text-muted">
        Le délai d'annulation est dépassé : l'acompte ne sera pas remboursé, mais prévenir libère le
        créneau pour d'autres clients.
      </p>
    </template>
  </section>
</template>

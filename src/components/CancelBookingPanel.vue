<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/lib/api'
import { formatEventDate, formatXof } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import type { Booking } from '@/types/booking'

/** Customer cancellation: a one-time code confirms the request (RG05). */
const props = defineProps<{ booking: Booking; token: string }>()
const emit = defineEmits<{ cancelled: [booking: Booking] }>()

const step = ref<'idle' | 'code'>('idle')
const sentTo = ref<string | null>(null)
const devCode = ref<string | null>(null)
const code = ref('')
const request = useForm()
const confirm = useForm()

async function requestCode() {
  const result = await request.submit(() =>
    api.post<{ data: { sent_to?: string; dev_code?: string } }>(
      `/api/v1/public/bookings/${props.booking.code}/cancellation-code?t=${encodeURIComponent(props.token)}`,
    ),
  )
  if (!result) return
  sentTo.value = result.data.sent_to ?? null
  devCode.value = result.data.dev_code ?? null
  step.value = 'code'
}

async function cancel() {
  const result = await confirm.submit(() =>
    api.post<{ data: Booking }>(
      `/api/v1/public/bookings/${props.booking.code}/cancel?t=${encodeURIComponent(props.token)}`,
      { code: code.value.trim() },
    ),
  )
  if (result) emit('cancelled', result.data)
}
</script>

<template>
  <section v-if="booking.cancellation_preview" class="card space-y-3 text-sm">
    <h2 class="font-display text-lg font-bold">
      {{ booking.status === 'requested' ? 'Retirer ma demande' : 'Annuler la réservation' }}
    </h2>
    <p v-if="booking.status === 'requested'" class="text-muted">
      Tant que l'établissement n'a pas confirmé, tu peux retirer ta demande : on te rembourse en
      entier (<strong class="text-ink">{{ formatXof(booking.cancellation_preview.refund) }}</strong
      >).
    </p>
    <p v-else class="text-muted">
      Possible jusqu'au {{ formatEventDate(booking.cancellable_until!) }}. Une pénalité de
      {{ formatXof(booking.cancellation_preview.penalty) }} est retenue : on te rembourse
      <strong class="text-ink">{{ formatXof(booking.cancellation_preview.refund) }}</strong
      >.
    </p>

    <div v-if="request.error.value" class="alert-error">{{ request.error.value }}</div>
    <button
      v-if="step === 'idle'"
      class="btn-secondary"
      :disabled="request.processing.value"
      @click="requestCode"
    >
      Recevoir un code d'annulation
    </button>

    <form v-else class="space-y-3" @submit.prevent="cancel">
      <p>
        Un code à 6 chiffres a été envoyé{{ sentTo ? ` à ${sentTo}` : '' }}. Il est valable 10
        minutes.
      </p>
      <p v-if="devCode" class="alert-info">
        Environnement de test : ton code est <strong>{{ devCode }}</strong
        >.
      </p>
      <div
        v-if="confirm.error.value || confirm.fieldError('code') || confirm.fieldError('booking')"
        class="alert-error"
      >
        {{ confirm.fieldError('code') ?? confirm.fieldError('booking') ?? confirm.error.value }}
      </div>
      <div class="flex gap-2">
        <input
          v-model="code"
          class="input w-40 tracking-widest"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          required
        />
        <button
          class="btn bg-red-600 text-white shadow-sm hover:bg-red-700"
          type="submit"
          :disabled="confirm.processing.value"
        >
          Confirmer l'annulation
        </button>
      </div>
      <button type="button" class="text-xs text-brand-700" @click="requestCode">
        Renvoyer un code
      </button>
    </form>
  </section>
</template>

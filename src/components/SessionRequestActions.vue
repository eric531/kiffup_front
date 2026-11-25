<script setup lang="ts">
import { ref } from 'vue'
import { Check, Clock3, X } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatEventDate } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import FormField from '@/components/FormField.vue'
import type { PartnerBookingLine } from '@/types/partnerArea'

/**
 * Partner answer to a session request (V3, lot F4): confirm, propose another time (once), refuse.
 * Without an answer before the deadline, the customer is refunded in full.
 */
const props = defineProps<{ line: PartnerBookingLine }>()
const emit = defineEmits<{ answered: [message: string] }>()

const mode = ref<'idle' | 'propose' | 'refuse'>('idle')
const startsAt = ref('')
const reason = ref('')
const form = useForm()

async function send(action: 'accept' | 'propose' | 'refuse', body?: Record<string, unknown>) {
  const result = await form.submit(() =>
    api.post<{ message: string }>(`/api/v1/partner/bookings/${props.line.code}/${action}`, body),
  )
  if (result) emit('answered', result.message)
}
</script>

<template>
  <div v-if="line.session" class="space-y-3 border-t border-stone-200 pt-4">
    <div v-if="form.error.value || form.fieldError('booking')" class="alert-error text-sm">
      {{ form.fieldError('booking') ?? form.error.value }}
    </div>

    <p v-if="line.session.proposed_starts_at" class="text-sm text-muted">
      Vous avez proposé le
      <strong class="text-ink">{{ formatEventDate(line.session.proposed_starts_at) }}</strong
      >. Le client répond
      <template v-if="line.session.proposal_due_at">
        avant le {{ formatEventDate(line.session.proposal_due_at) }}</template
      >.
    </p>

    <template v-else>
      <p v-if="line.session.response_due_at" class="text-sm font-medium text-amber-800">
        Répondez avant le {{ formatEventDate(line.session.response_due_at) }} : sans réponse, le
        client est remboursé.
      </p>

      <div v-if="mode === 'idle'" class="flex flex-wrap gap-2">
        <button class="btn-primary" :disabled="form.processing.value" @click="send('accept')">
          <Check class="size-4" /> Confirmer
        </button>
        <button class="btn-secondary" @click="mode = 'propose'">
          <Clock3 class="size-4" /> Proposer une autre heure
        </button>
        <button class="btn-ghost text-red-700" @click="mode = 'refuse'">
          <X class="size-4" /> Refuser
        </button>
      </div>

      <form
        v-else-if="mode === 'propose'"
        class="space-y-3"
        @submit.prevent="send('propose', { starts_at: startsAt })"
      >
        <FormField
          label="Jour et heure proposés"
          for="propose_at"
          :error="form.fieldError('starts_at')"
        >
          <input
            id="propose_at"
            v-model="startsAt"
            class="input"
            type="datetime-local"
            step="1800"
            required
          />
        </FormField>
        <p class="text-xs text-muted">
          Une seule proposition par demande. Le client l'accepte ou la refuse sur WhatsApp ; s'il
          refuse, il est remboursé.
        </p>
        <div class="flex gap-2">
          <button class="btn-primary" type="submit" :disabled="form.processing.value">
            Envoyer la proposition
          </button>
          <button type="button" class="btn-ghost" @click="mode = 'idle'">Retour</button>
        </div>
      </form>

      <form
        v-else
        class="space-y-3"
        @submit.prevent="send('refuse', { reason: reason || undefined })"
      >
        <FormField
          label="Motif (facultatif, envoyé au client)"
          for="refuse_reason"
          :error="form.fieldError('reason')"
        >
          <input
            id="refuse_reason"
            v-model="reason"
            class="input"
            maxlength="300"
            placeholder="Ex. : complet ce jour-là"
          />
        </FormField>
        <p class="text-xs text-muted">Le client est remboursé intégralement.</p>
        <div class="flex gap-2">
          <button
            class="btn bg-red-600 text-white shadow-sm hover:bg-red-700"
            type="submit"
            :disabled="form.processing.value"
          >
            Refuser la demande
          </button>
          <button type="button" class="btn-ghost" @click="mode = 'idle'">Retour</button>
        </div>
      </form>
    </template>
  </div>
</template>

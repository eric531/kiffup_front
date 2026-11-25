<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { api } from '@/lib/api'
import { formatXof } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import BookingLineCard from '@/components/BookingLineCard.vue'
import type { PartnerBookingLine } from '@/types/partnerArea'
import {
  Camera,
  CameraOff,
  CircleCheckBig,
  Keyboard,
  ScanLine,
  UserRoundPlus,
  Wallet,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'

// The camera scanner (~100 kB) is only downloaded when the partner opens it.
const QrcodeStream = defineAsyncComponent(() =>
  import('vue-qrcode-reader').then((m) => m.QrcodeStream),
)

const scanning = ref(false)
const cameraError = ref<string | null>(null)
const manualCode = ref('')
// What was read or typed: the QR code holds the customer's key, the typed code does not.
const input = ref('')
const line = ref<PartnerBookingLine | null>(null)
const done = ref(false)
const lookup = useForm()
const confirm = useForm()

async function find(code: string) {
  done.value = false
  line.value = null
  input.value = code
  const result = await lookup.submit(() =>
    api.get<{ data: PartnerBookingLine }>('/api/v1/partner/check-in', { code }),
  )
  if (result) line.value = result.data
}

function onDetect(codes: { rawValue: string }[]) {
  const value = codes[0]?.rawValue
  if (!value) return
  scanning.value = false
  find(value)
}

function onCameraError(err: Error) {
  scanning.value = false
  cameraError.value =
    err.name === 'NotAllowedError'
      ? "Autorisez l'accès à la caméra dans votre navigateur, ou saisissez le code."
      : 'Caméra indisponible sur cet appareil : saisissez le code de la réservation.'
}

async function checkIn() {
  if (!line.value) return
  const result = await confirm.submit(() =>
    api.post<{ data: PartnerBookingLine }>('/api/v1/partner/check-in', { code: input.value }),
  )
  if (result) {
    line.value = result.data
    done.value = true
    manualCode.value = ''
  }
}

function reset() {
  line.value = null
  done.value = false
  lookup.error.value = null
  lookup.fieldErrors.value = {}
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6">
    <PageHeader
      title="Enregistrer une arrivée"
      subtitle="Scannez le QR code du client ou saisissez son code."
      :icon="ScanLine"
    />

    <section v-if="!line" class="card space-y-5 p-6">
      <div v-if="scanning" class="relative overflow-hidden rounded-3xl bg-night-950 shadow-lift">
        <QrcodeStream @detect="onDetect" @error="onCameraError" />
        <!-- Viewfinder -->
        <div class="pointer-events-none absolute inset-0 grid place-items-center">
          <div class="relative size-56 rounded-3xl">
            <span
              class="absolute -top-0.5 -left-0.5 size-8 rounded-tl-3xl border-t-4 border-l-4 border-brand-400"
            />
            <span
              class="absolute -top-0.5 -right-0.5 size-8 rounded-tr-3xl border-t-4 border-r-4 border-brand-400"
            />
            <span
              class="absolute -bottom-0.5 -left-0.5 size-8 rounded-bl-3xl border-b-4 border-l-4 border-brand-400"
            />
            <span
              class="absolute -right-0.5 -bottom-0.5 size-8 rounded-br-3xl border-r-4 border-b-4 border-brand-400"
            />
            <span
              class="scan-line absolute inset-x-4 h-0.5 rounded-full bg-flare-400 shadow-[0_0_14px_2px_rgb(244_114_182_/_0.8)]"
            />
          </div>
        </div>
      </div>
      <button
        v-else
        class="group flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 transition hover:border-brand-400 hover:bg-brand-50"
        @click="((cameraError = null), (scanning = true))"
      >
        <span
          class="grid size-16 place-items-center rounded-2xl bg-sunset text-white shadow-glow transition group-hover:scale-110"
        >
          <Camera class="size-7" />
        </span>
        <span class="font-display text-lg font-bold">Scanner le QR code du client</span>
        <span class="text-sm text-muted">La caméra de votre téléphone s'ouvre.</span>
      </button>
      <button v-if="scanning" class="btn-ghost w-full" @click="scanning = false">
        <CameraOff class="size-4" /> Arrêter la caméra
      </button>
      <p v-if="cameraError" class="alert-info">{{ cameraError }}</p>

      <form class="space-y-2 border-t border-stone-200 pt-5" @submit.prevent="find(manualCode)">
        <label class="label flex items-center gap-2" for="code">
          <Keyboard class="size-4 text-muted" /> Ou saisissez le code
        </label>
        <div class="flex gap-2">
          <input
            id="code"
            v-model="manualCode"
            class="input font-mono tracking-widest uppercase"
            placeholder="KU-XXXX-XXXX"
            autocomplete="off"
            required
          />
          <button class="btn-secondary" type="submit" :disabled="lookup.processing.value">
            Vérifier
          </button>
        </div>
      </form>
      <p v-if="lookup.fieldError('code') || lookup.error.value" class="alert-error">
        {{ lookup.fieldError('code') ?? lookup.error.value }}
      </p>
    </section>

    <section v-else class="card space-y-5 p-6">
      <div v-if="done" class="flex flex-col items-center gap-3 py-2 text-center">
        <span
          class="relative grid size-16 animate-pop place-items-center rounded-full bg-emerald-500 text-white"
        >
          <span class="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />
          <CircleCheckBig class="relative size-8" />
        </span>
        <p class="font-display text-xl font-bold text-emerald-800">Arrivée enregistrée</p>
      </div>
      <template v-if="done && line.session">
        <p v-if="line.checked_in_via === 'qr'" class="alert-success">
          L'acompte de cette séance est disponible au retrait.
        </p>
        <p v-else class="alert-info">
          Code saisi à la main : l'acompte suit le délai de blocage habituel. Scannez le QR code du
          client pour qu'il soit disponible tout de suite.
        </p>
      </template>
      <BookingLineCard :line="line" />

      <template v-if="!done && line.status === 'paid' && !line.checked_in_at">
        <p
          v-if="line.balance_due_on_site"
          class="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <Wallet class="mt-0.5 size-4 shrink-0" />
          <span>
            Encaissez <strong>{{ formatXof(line.balance_due_on_site) }}</strong> auprès du client
            avant de valider.
          </span>
        </p>
        <div v-if="confirm.fieldError('code') || confirm.error.value" class="alert-error">
          {{ confirm.fieldError('code') ?? confirm.error.value }}
        </div>
        <button
          class="btn-primary w-full py-3.5 text-base"
          :disabled="confirm.processing.value"
          @click="checkIn"
        >
          <CircleCheckBig class="size-5" /> Confirmer l'arrivée du client
        </button>
      </template>
      <p v-else-if="!done" class="alert-error">
        {{
          line.status === 'cancelled'
            ? 'Cette réservation est annulée.'
            : 'Ce client est déjà enregistré.'
        }}
      </p>

      <button class="btn-secondary w-full" @click="reset">
        <UserRoundPlus class="size-4" /> Client suivant
      </button>
    </section>
  </div>
</template>

<style scoped>
.scan-line {
  animation: scan 2.2s ease-in-out infinite alternate;
}
@keyframes scan {
  from {
    top: 1rem;
  }
  to {
    top: calc(100% - 1rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .scan-line {
    animation: none;
    top: 50%;
  }
}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CreditCard, FlaskConical, ShieldCheck, Smartphone } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatXof } from '@/lib/format'
import AuthScene from '@/components/AuthScene.vue'

/** Simulated provider page (development only): replaced by the real provider's page in production. */
const props = defineProps<{ reference: string }>()

const payment = ref<{
  reference: string
  amount: number
  status: string
  return_url: string
} | null>(null)
const error = ref<string | null>(null)
const processing = ref<'success' | 'failure' | null>(null)

onMounted(async () => {
  try {
    payment.value = (
      await api.get<{ data: NonNullable<typeof payment.value> }>(
        `/api/v1/public/payments/fake/${props.reference}`,
      )
    ).data
  } catch {
    error.value = 'Paiement introuvable (le prestataire simulé est désactivé en production).'
  }
})

async function pay(outcome: 'success' | 'failure') {
  processing.value = outcome
  try {
    const result = await api.post<{ data: { return_url: string } }>(
      `/api/v1/public/payments/fake/${props.reference}`,
      { outcome },
    )
    window.location.assign(result.data.return_url)
  } catch {
    error.value = 'Le paiement simulé a échoué.'
    processing.value = null
  }
}
</script>

<template>
  <AuthScene
    title="Paiement sécurisé"
    subtitle="Dernière étape avant la confirmation."
    :icon="ShieldCheck"
  >
    <div class="space-y-6 text-center">
      <p class="chip mx-auto bg-amber-100 text-amber-900">
        <FlaskConical class="size-3.5" /> Prestataire simulé — environnement de test
      </p>
      <div v-if="error" class="alert-error">{{ error }}</div>
      <template v-else-if="payment">
        <div>
          <p class="text-sm text-muted">Montant à payer</p>
          <p class="font-display text-5xl font-extrabold text-gradient">
            {{ formatXof(payment.amount) }}
          </p>
          <p class="mt-1 font-mono text-xs text-muted">{{ payment.reference }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div
            class="flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-500 bg-brand-50 px-3 py-3 font-semibold text-brand-800"
          >
            <Smartphone class="size-4" /> Mobile money
          </div>
          <div
            class="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 px-3 py-3 text-stone-600"
          >
            <CreditCard class="size-4" /> Carte bancaire
          </div>
        </div>
        <div class="space-y-2">
          <button
            class="btn-primary w-full py-3.5 text-base"
            :disabled="!!processing"
            @click="pay('success')"
          >
            <span
              v-if="processing === 'success'"
              class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            Simuler un paiement réussi
          </button>
          <button class="btn-secondary w-full" :disabled="!!processing" @click="pay('failure')">
            Simuler un paiement refusé
          </button>
        </div>
      </template>
      <div v-else class="skeleton mx-auto h-32 rounded-3xl" />
    </div>
    <template #after>Aucune donnée bancaire n'est demandée sur cette page de test.</template>
  </AuthScene>
</template>

<script lang="ts">
import { api } from '@/lib/api'

interface PaymentMethods {
  data: { code: string; label: string }[]
  required: boolean
}

// Same list for every booking form: loaded once per visit.
let pending: Promise<PaymentMethods> | null = null
function loadMethods(): Promise<PaymentMethods> {
  pending ??= api.get<PaymentMethods>('/api/v1/public/payments/methods').catch((e) => {
    pending = null
    throw e
  })
  return pending
}
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Smartphone } from 'lucide-vue-next'
import PaymentLogo from '@/components/PaymentLogo.vue'

/**
 * Wallet the customer pays with (Wave, Orange Money…). With Jèko the choice is required before
 * paying: the customer is sent straight to the chosen wallet.
 */
const model = defineModel<string>({ default: '' })
const required = defineModel<boolean>('required', { default: false })
defineProps<{ error?: string | null }>()

const methods = ref<PaymentMethods['data']>([])

onMounted(async () => {
  try {
    const result = await loadMethods()
    methods.value = result.data
    required.value = result.required
  } catch {
    // Without the list the form still works: the API says if a wallet is missing.
  }
})
</script>

<template>
  <fieldset v-if="methods.length" class="space-y-2">
    <legend class="label flex items-center gap-2">
      <Smartphone class="size-4 text-brand-600" /> Payer avec
    </legend>
    <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moyen de paiement">
      <button
        v-for="method in methods"
        :key="method.code"
        type="button"
        role="radio"
        class="flex items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2 text-left text-sm font-semibold transition"
        :class="
          model === method.code
            ? 'border-brand-600 bg-brand-50 text-stone-900 shadow-md'
            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
        "
        :aria-checked="model === method.code"
        @click="model = method.code"
      >
        <PaymentLogo :code="method.code" />
        <span class="min-w-0 flex-1 leading-tight">{{ method.label }}</span>
      </button>
    </div>
    <p v-if="error" class="input-error">{{ error }}</p>
  </fieldset>
</template>

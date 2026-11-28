<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessageCircle, Smartphone } from 'lucide-vue-next'
import AuthScene from '@/components/AuthScene.vue'
import { useForm } from '@/composables/useForm'
import { useAuthStore, type CustomerCodeSent } from '@/stores/auth'
import { PHONE_COUNTRIES } from '@/types/booking'

/**
 * Customer login without password: phone number, then the 6-digit code received on WhatsApp.
 * The account is created on the first login.
 */
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { processing, error, fieldError, submit } = useForm()

const step = ref<'phone' | 'code'>('phone')
const country = ref('CI')
const phone = ref('')
const code = ref('')
const sent = ref<CustomerCodeSent | null>(null)

const dial = computed(() => PHONE_COUNTRIES.find((c) => c.code === country.value)?.dial ?? '')

// A new code can be asked again after a short wait (3 per hour and per number on the server).
const RESEND_SECONDS = 60
const resendIn = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
function startResendTimer() {
  resendIn.value = RESEND_SECONDS
  clearInterval(timer)
  timer = setInterval(() => {
    resendIn.value--
    if (resendIn.value <= 0) clearInterval(timer)
  }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

async function sendCode() {
  const result = await submit(() => auth.requestCustomerCode(phone.value, country.value))
  if (!result) return
  sent.value = result
  code.value = ''
  step.value = 'code'
  startResendTimer()
}

async function verify() {
  const user = await submit(() =>
    auth.verifyCustomerCode(phone.value, country.value, code.value.trim()),
  )
  if (!user) return
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  await router.replace(redirect?.startsWith('/') ? redirect : { name: 'account' })
}

function changeNumber() {
  step.value = 'phone'
  sent.value = null
  code.value = ''
}
</script>

<template>
  <AuthScene
    title="Se connecter"
    :subtitle="
      step === 'phone'
        ? 'Avec ton numéro, sans mot de passe.'
        : `Code envoyé sur WhatsApp au ${sent?.phone}`
    "
    :icon="step === 'phone' ? Smartphone : MessageCircle"
  >
    <form v-if="step === 'phone'" class="space-y-4" @submit.prevent="sendCode">
      <div v-if="error" class="alert-error">{{ error }}</div>
      <div>
        <label class="label" for="phone">Numéro WhatsApp</label>
        <div class="flex gap-2">
          <select v-model="country" class="input w-32 shrink-0 px-3" aria-label="Pays">
            <option v-for="c in PHONE_COUNTRIES" :key="c.code" :value="c.code">
              {{ c.dial }} · {{ c.label }}
            </option>
          </select>
          <input
            id="phone"
            v-model="phone"
            class="input min-w-0 flex-1"
            type="tel"
            inputmode="tel"
            autocomplete="tel-national"
            :placeholder="country === 'CI' ? '07 07 07 07 07' : `Numéro sans ${dial}`"
            required
          />
        </div>
        <p v-if="fieldError('phone')" class="input-error">{{ fieldError('phone') }}</p>
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="processing">
        {{ processing ? 'Envoi…' : 'Recevoir mon code sur WhatsApp' }}
      </button>
      <p class="text-center text-xs text-muted">
        Pas encore de compte ? Il est créé à ta première connexion. Il garde tes réservations et tes
        favoris.
      </p>
    </form>

    <form v-else class="space-y-4" @submit.prevent="verify">
      <div v-if="error" class="alert-error">{{ error }}</div>
      <div v-if="sent?.dev_code" class="alert-success">
        Mode développement : aucun message envoyé. Code : <strong>{{ sent.dev_code }}</strong>
      </div>
      <div>
        <label class="label" for="code">Code à 6 chiffres</label>
        <input
          id="code"
          v-model="code"
          class="input text-center text-2xl font-bold tracking-[0.5em]"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          pattern="[0-9]{6}"
          required
          autofocus
        />
        <p v-if="fieldError('code')" class="input-error">{{ fieldError('code') }}</p>
        <p class="mt-1 text-xs text-muted">Valable {{ sent?.expires_in_minutes }} minutes.</p>
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="processing">
        {{ processing ? 'Vérification…' : 'Se connecter' }}
      </button>
      <div class="flex items-center justify-between text-sm">
        <button type="button" class="font-semibold text-brand-700" @click="changeNumber">
          Changer de numéro
        </button>
        <button
          type="button"
          class="font-semibold text-brand-700 disabled:text-stone-400"
          :disabled="resendIn > 0 || processing"
          @click="sendCode"
        >
          {{ resendIn > 0 ? `Renvoyer (${resendIn} s)` : 'Renvoyer le code' }}
        </button>
      </div>
    </form>

    <template #after>
      Vous êtes partenaire ou administrateur ?
      <RouterLink :to="{ name: 'login' }" class="font-semibold text-white hover:underline">
        Espace partenaire
      </RouterLink>
      <br />
      Vous avez un établissement ?
      <RouterLink :to="{ name: 'become-partner' }" class="font-semibold text-white hover:underline">
        Devenir partenaire
      </RouterLink>
    </template>
  </AuthScene>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useForm } from '@/composables/useForm'
import { KeyRound, LogIn } from 'lucide-vue-next'
import AuthScene from '@/components/AuthScene.vue'
import { PHONE_COUNTRIES } from '@/types/booking'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { processing, error, fieldError, submit } = useForm()

const step = ref<'credentials' | 'two-factor'>('credentials')
// Login = phone number; older accounts without a number can still use their email.
const withEmail = ref(false)
const country = ref('CI')
const identifier = ref('')
const password = ref('')
const code = ref('')
const useRecoveryCode = ref(false)
const dial = computed(() => PHONE_COUNTRIES.find((c) => c.code === country.value)?.dial ?? '')

function toggleEmail() {
  withEmail.value = !withEmail.value
  identifier.value = ''
}

async function redirectAfterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  await router.replace(redirect?.startsWith('/') ? redirect : auth.homeRoute)
}

async function login() {
  const result = await submit(() =>
    auth.login(identifier.value.trim(), password.value, country.value),
  )
  if (result === 'two-factor') step.value = 'two-factor'
  else if (result === 'authenticated') await redirectAfterLogin()
}

async function confirmCode() {
  const payload = useRecoveryCode.value
    ? { recovery_code: code.value.trim() }
    : { code: code.value.trim() }
  const done = await submit(async () => {
    await auth.confirmTwoFactor(payload)
    return true
  })
  if (done) await redirectAfterLogin()
}
</script>

<template>
  <AuthScene
    title="Connexion"
    :subtitle="
      step === 'credentials' ? 'Espace partenaire et back-office.' : 'Double authentification'
    "
    :icon="step === 'credentials' ? LogIn : KeyRound"
  >
    <form v-if="step === 'credentials'" class="space-y-4" @submit.prevent="login">
      <div v-if="route.query.reset && !error" class="alert-success">
        Mot de passe enregistré. Vous pouvez vous connecter.
      </div>
      <div v-if="error" class="alert-error">{{ error }}</div>
      <div v-if="withEmail">
        <label class="label" for="login">Adresse email</label>
        <input
          id="login"
          v-model="identifier"
          class="input"
          type="email"
          autocomplete="username"
          required
        />
        <p v-if="fieldError('login')" class="input-error">{{ fieldError('login') }}</p>
      </div>
      <div v-else>
        <label class="label" for="login">Numéro de téléphone</label>
        <div class="flex gap-2">
          <select v-model="country" class="input w-32 shrink-0 px-3" aria-label="Pays">
            <option v-for="c in PHONE_COUNTRIES" :key="c.code" :value="c.code">
              {{ c.dial }} · {{ c.label }}
            </option>
          </select>
          <input
            id="login"
            v-model="identifier"
            class="input min-w-0 flex-1"
            type="tel"
            inputmode="tel"
            autocomplete="username"
            :placeholder="country === 'CI' ? '07 07 07 07 07' : `Numéro sans ${dial}`"
            required
          />
        </div>
        <p v-if="fieldError('login')" class="input-error">{{ fieldError('login') }}</p>
      </div>
      <div>
        <label class="label" for="password">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
        />
        <p v-if="fieldError('password')" class="input-error">{{ fieldError('password') }}</p>
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="processing">
        {{ processing ? 'Connexion…' : 'Se connecter' }}
      </button>
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <RouterLink :to="{ name: 'password.forgot' }" class="font-semibold text-brand-700">
          Mot de passe oublié ?
        </RouterLink>
        <button type="button" class="text-muted hover:underline" @click="toggleEmail">
          {{ withEmail ? 'Utiliser mon numéro' : 'Utiliser mon email' }}
        </button>
      </div>
    </form>

    <form v-else class="space-y-4" @submit.prevent="confirmCode">
      <div v-if="error" class="alert-error">{{ error }}</div>
      <p class="text-sm text-stone-700">
        {{
          useRecoveryCode
            ? 'Saisissez un de vos codes de récupération.'
            : "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."
        }}
      </p>
      <div>
        <label class="label" for="code">{{
          useRecoveryCode ? 'Code de récupération' : 'Code'
        }}</label>
        <input
          id="code"
          v-model="code"
          class="input tracking-widest"
          :inputmode="useRecoveryCode ? 'text' : 'numeric'"
          autocomplete="one-time-code"
          required
        />
        <p v-if="fieldError('code') || fieldError('recovery_code')" class="input-error">
          {{ fieldError('code') ?? fieldError('recovery_code') }}
        </p>
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="processing">Valider</button>
      <button type="button" class="btn-ghost w-full" @click="useRecoveryCode = !useRecoveryCode">
        {{
          useRecoveryCode ? 'Utiliser le code de l’application' : 'Utiliser un code de récupération'
        }}
      </button>
    </form>

    <template #after>
      Vous avez un établissement ?
      <RouterLink :to="{ name: 'become-partner' }" class="font-semibold text-white hover:underline">
        Devenir partenaire
      </RouterLink>
    </template>
  </AuthScene>
</template>

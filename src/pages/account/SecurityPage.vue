<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useForm } from '@/composables/useForm'
import StageBackdrop from '@/components/StageBackdrop.vue'

const auth = useAuthStore()
const route = useRoute()

// --- Two-factor authentication -------------------------------------------------------------
type TwoFactorStep = 'idle' | 'confirm-password' | 'scan' | 'recovery-codes'

const step = ref<TwoFactorStep>('idle')
const qrSvg = ref('')
const secretKey = ref('')
const code = ref('')
const confirmPasswordValue = ref('')
const recoveryCodes = ref<string[]>([])
const twoFactor = useForm()
let pendingAction: (() => Promise<void>) | null = null

/** Fortify asks to re-type the password (423) before sensitive 2FA operations. */
async function withPasswordConfirmation(action: () => Promise<void>) {
  try {
    await action()
  } catch (e) {
    if (e instanceof ApiError && e.status === 423) {
      pendingAction = action
      step.value = 'confirm-password'
      return
    }
    throw e
  }
}

async function confirmPassword() {
  await twoFactor.submit(async () => {
    await api.post('/auth/user/confirm-password', { password: confirmPasswordValue.value })
    confirmPasswordValue.value = ''
    step.value = 'idle'
    const action = pendingAction
    pendingAction = null
    if (action) await action()
  })
}

async function enableTwoFactor() {
  await twoFactor.submit(() =>
    withPasswordConfirmation(async () => {
      await api.post('/auth/user/two-factor-authentication')
      const [qr, secret] = await Promise.all([
        api.get<{ svg: string }>('/auth/user/two-factor-qr-code'),
        api.get<{ secretKey: string }>('/auth/user/two-factor-secret-key'),
      ])
      qrSvg.value = qr.svg
      secretKey.value = secret.secretKey
      step.value = 'scan'
    }),
  )
}

async function confirmTwoFactor() {
  await twoFactor.submit(async () => {
    await api.post('/auth/user/confirmed-two-factor-authentication', { code: code.value.trim() })
    recoveryCodes.value = await api.get<string[]>('/auth/user/two-factor-recovery-codes')
    code.value = ''
    step.value = 'recovery-codes'
    await auth.fetchUser()
  })
}

async function showRecoveryCodes() {
  await twoFactor.submit(() =>
    withPasswordConfirmation(async () => {
      recoveryCodes.value = await api.get<string[]>('/auth/user/two-factor-recovery-codes')
      step.value = 'recovery-codes'
    }),
  )
}

// --- Password change -----------------------------------------------------------------------
const passwordForm = useForm()
const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirmation = ref('')
const passwordUpdated = ref(false)

async function updatePassword() {
  passwordUpdated.value = false
  const done = await passwordForm.submit(async () => {
    await api.put('/auth/user/password', {
      current_password: currentPassword.value,
      password: newPassword.value,
      password_confirmation: newPasswordConfirmation.value,
    })
    return true
  })
  if (done) {
    passwordUpdated.value = true
    currentPassword.value = newPassword.value = newPasswordConfirmation.value = ''
  }
}
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden pt-28 pb-24 text-white">
      <StageBackdrop :spotlights="false" intensity="soft" />
      <div class="relative mx-auto max-w-xl px-4 text-center">
        <h1 class="animate-fade-up text-3xl font-extrabold sm:text-4xl">Sécurité du compte</h1>
        <p class="mt-2 animate-fade-up text-white/70 [animation-delay:80ms]">
          Mot de passe et double authentification.
        </p>
      </div>
    </section>
    <div class="relative mx-auto -mt-14 max-w-xl space-y-6 px-4 pb-16">
      <div v-if="route.query.required && auth.user?.two_factor_required" class="alert-info">
        Pour accéder au back-office, activez d'abord la double authentification.
      </div>

      <!-- 2FA -->
      <section class="card space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-semibold">Double authentification</h2>
            <p class="mt-1 text-sm text-muted">
              Un code temporaire, généré par une application comme Google Authenticator, est demandé
              à chaque connexion.
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="
              auth.user?.two_factor_enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-stone-100 text-stone-600'
            "
          >
            {{ auth.user?.two_factor_enabled ? 'Activée' : 'Désactivée' }}
          </span>
        </div>

        <div v-if="twoFactor.error.value" class="alert-error">{{ twoFactor.error.value }}</div>

        <form
          v-if="step === 'confirm-password'"
          class="space-y-3"
          @submit.prevent="confirmPassword"
        >
          <label class="label" for="confirm-password"
            >Confirmez votre mot de passe pour continuer</label
          >
          <input
            id="confirm-password"
            v-model="confirmPasswordValue"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
          <p v-if="twoFactor.fieldError('password')" class="input-error">
            {{ twoFactor.fieldError('password') }}
          </p>
          <button class="btn-primary" type="submit" :disabled="twoFactor.processing.value">
            Confirmer
          </button>
        </form>

        <form v-else-if="step === 'scan'" class="space-y-4" @submit.prevent="confirmTwoFactor">
          <p class="text-sm">1. Scannez ce QR code avec votre application d'authentification.</p>
          <!-- SVG generated by our own API (Fortify) -->
          <div class="inline-block rounded-xl bg-white p-3 ring-1 ring-stone-200" v-html="qrSvg" />
          <p class="text-xs text-muted">
            Ou saisissez la clé : <code class="font-mono break-all">{{ secretKey }}</code>
          </p>
          <div>
            <label class="label" for="code">2. Saisissez le code affiché</label>
            <input
              id="code"
              v-model="code"
              class="input tracking-widest"
              inputmode="numeric"
              required
            />
            <p v-if="twoFactor.fieldError('code')" class="input-error">
              {{ twoFactor.fieldError('code') }}
            </p>
          </div>
          <button class="btn-primary" type="submit" :disabled="twoFactor.processing.value">
            Activer
          </button>
        </form>

        <div v-else-if="step === 'recovery-codes'" class="space-y-3">
          <p class="text-sm">
            Conservez ces codes de récupération en lieu sûr. Chacun permet de se connecter une fois
            si vous perdez votre téléphone.
          </p>
          <ul class="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-3 font-mono text-sm">
            <li v-for="recoveryCode in recoveryCodes" :key="recoveryCode">{{ recoveryCode }}</li>
          </ul>
          <button class="btn-secondary" @click="step = 'idle'">J'ai noté mes codes</button>
        </div>

        <div v-else>
          <button
            v-if="!auth.user?.two_factor_enabled"
            class="btn-primary"
            :disabled="twoFactor.processing.value"
            @click="enableTwoFactor"
          >
            Activer la double authentification
          </button>
          <button
            v-else
            class="btn-secondary"
            :disabled="twoFactor.processing.value"
            @click="showRecoveryCodes"
          >
            Afficher mes codes de récupération
          </button>
        </div>
      </section>

      <!-- Password -->
      <form class="card space-y-4" @submit.prevent="updatePassword">
        <h2 class="font-semibold">Changer de mot de passe</h2>
        <div v-if="passwordUpdated" class="alert-success">Mot de passe mis à jour.</div>
        <div v-if="passwordForm.error.value" class="alert-error">
          {{ passwordForm.error.value }}
        </div>
        <div>
          <label class="label" for="current_password">Mot de passe actuel</label>
          <input
            id="current_password"
            v-model="currentPassword"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
          <p v-if="passwordForm.fieldError('current_password')" class="input-error">
            {{ passwordForm.fieldError('current_password') }}
          </p>
        </div>
        <div>
          <label class="label" for="new_password">Nouveau mot de passe</label>
          <input
            id="new_password"
            v-model="newPassword"
            class="input"
            type="password"
            autocomplete="new-password"
            required
          />
          <p v-if="passwordForm.fieldError('password')" class="input-error">
            {{ passwordForm.fieldError('password') }}
          </p>
        </div>
        <div>
          <label class="label" for="new_password_confirmation">Confirmation</label>
          <input
            id="new_password_confirmation"
            v-model="newPasswordConfirmation"
            class="input"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <button class="btn-primary" type="submit" :disabled="passwordForm.processing.value">
          Enregistrer
        </button>
      </form>

      <RouterLink v-if="!auth.user?.two_factor_required" :to="auth.homeRoute" class="btn-ghost">
        ← Retour à mon espace
      </RouterLink>
    </div>
  </div>
</template>

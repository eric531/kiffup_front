<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { useForm } from '@/composables/useForm'
import { LockKeyhole } from 'lucide-vue-next'
import AuthScene from '@/components/AuthScene.vue'

const route = useRoute()
const router = useRouter()
const { processing, error, fieldError, submit } = useForm()

const token = String(route.query.token ?? '')
const email = ref(String(route.query.email ?? ''))
const password = ref('')
const passwordConfirmation = ref('')

async function resetPassword() {
  const done = await submit(async () => {
    await api.post('/auth/reset-password', {
      token,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    return true
  })
  if (done) await router.replace({ name: 'login', query: { reset: '1' } })
}
</script>

<template>
  <AuthScene title="Choisir un mot de passe" :icon="LockKeyhole">
    <div v-if="!token" class="alert-error">Ce lien est incomplet. Demandez un nouveau lien.</div>

    <form v-else class="space-y-4" @submit.prevent="resetPassword">
      <div v-if="error" class="alert-error">{{ error }}</div>
      <div>
        <label class="label" for="email">Adresse email</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          autocomplete="username"
          required
        />
        <p v-if="fieldError('email')" class="input-error">{{ fieldError('email') }}</p>
      </div>
      <div>
        <label class="label" for="password">Nouveau mot de passe</label>
        <input
          id="password"
          v-model="password"
          class="input"
          type="password"
          autocomplete="new-password"
          required
        />
        <p v-if="fieldError('password')" class="input-error">{{ fieldError('password') }}</p>
      </div>
      <div>
        <label class="label" for="password_confirmation">Confirmation</label>
        <input
          id="password_confirmation"
          v-model="passwordConfirmation"
          class="input"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="processing">Enregistrer</button>
    </form>
  </AuthScene>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { CircleCheckBig, Clapperboard, Handshake, ShieldCheck, Wallet } from 'lucide-vue-next'
import StageBackdrop from '@/components/StageBackdrop.vue'
import FormField from '@/components/FormField.vue'
import { api } from '@/lib/api'
import { useForm } from '@/composables/useForm'
import { PARTNER_TYPE_LABELS, type PartnerType } from '@/types/catalog'
import { PHONE_COUNTRIES } from '@/types/booking'

/**
 * "Devenir partenaire" (V3, P10), kept short: establishment, activity, name and phone. The KiffUp
 * team calls back and activates the account (no automatic sign-up, RG38); the partner then
 * completes its record and sends its documents from "Ma fiche".
 */
const fields = reactive({
  business_name: '',
  category: 'wellness' as PartnerType,
  contact_name: '',
  country: 'CI',
  phone: '',
})
const charter = ref(false)
const sent = ref(false)
const form = useForm()

async function send() {
  const result = await form.submit(() => api.post('/api/v1/public/partner-requests', fields))
  if (result !== undefined) sent.value = true
}

const PERKS = [
  {
    icon: Clapperboard,
    title: 'Vos vidéos dans Découvrir',
    text: 'Montrez votre lieu en 30 secondes à des milliers de visiteurs, gratuitement au lancement.',
  },
  {
    icon: Handshake,
    title: 'Des clients qui vous contactent',
    text: 'Messages des clients sur KiffUp, appel et itinéraire en un geste depuis chaque vidéo.',
  },
  {
    icon: Wallet,
    title: 'Des réservations payées d’avance',
    text: 'Chambres, véhicules, séances de massage ou de soin : vos offres payées en ligne, votre argent retiré quand vous voulez.',
  },
]
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden pt-28 pb-12 text-white sm:pt-32">
      <StageBackdrop :spotlights="false" intensity="soft" />
      <div class="container-page relative">
        <p class="chip glass tracking-widest uppercase">Partenaires</p>
        <h1 class="mt-4 max-w-3xl text-4xl font-extrabold sm:text-5xl">
          Faites découvrir <span class="text-gradient">votre établissement</span>
        </h1>
        <p class="mt-4 max-w-2xl text-lg text-white/75">
          Plages, spas, restaurants, espaces d’événements, hôtels et résidences : rejoignez KiffUp.
        </p>
      </div>
    </section>

    <section class="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div v-if="sent" class="card space-y-3 p-8 text-center">
        <CircleCheckBig class="mx-auto size-12 text-emerald-600" />
        <p class="font-display text-2xl font-bold">Demande envoyée</p>
        <p class="text-muted">
          L’équipe KiffUp vous appelle sous quelques jours. Une fois votre compte activé, vous
          recevrez un message WhatsApp pour choisir votre mot de passe, puis vous compléterez votre
          fiche (adresse, offres, vidéos) depuis votre espace.
        </p>
        <RouterLink :to="{ name: 'discover' }" class="btn-primary">Voir Découvrir</RouterLink>
      </div>

      <form v-else class="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" @submit.prevent="send">
        <div v-if="form.error.value" class="alert-error sm:col-span-2">{{ form.error.value }}</div>
        <FormField
          label="Nom de l’établissement"
          for="business_name"
          :error="form.fieldError('business_name')"
        >
          <input id="business_name" v-model="fields.business_name" class="input" required />
        </FormField>
        <FormField label="Activité" for="category" :error="form.fieldError('category')">
          <select id="category" v-model="fields.category" class="input">
            <option v-for="(label, value) in PARTNER_TYPE_LABELS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </FormField>
        <FormField
          label="Votre nom (gérant ou responsable)"
          for="contact_name"
          :error="form.fieldError('contact_name')"
        >
          <input
            id="contact_name"
            v-model="fields.contact_name"
            class="input"
            autocomplete="name"
            required
          />
        </FormField>
        <FormField label="Téléphone (WhatsApp)" for="phone" :error="form.fieldError('phone')">
          <div class="flex gap-2">
            <select v-model="fields.country" class="input w-28 shrink-0 px-3" aria-label="Pays">
              <option v-for="c in PHONE_COUNTRIES" :key="c.code" :value="c.code">
                {{ c.dial }}
              </option>
            </select>
            <input
              id="phone"
              v-model="fields.phone"
              class="input min-w-0 flex-1"
              type="tel"
              autocomplete="tel-national"
              :placeholder="fields.country === 'CI' ? '07 07 07 07 07' : ''"
              required
            />
          </div>
        </FormField>
        <label class="flex items-start gap-3 text-sm sm:col-span-2">
          <input
            v-model="charter"
            type="checkbox"
            class="mt-0.5 size-4 accent-brand-600"
            required
          />
          <span>
            Je représente un établissement ouvert au public et je m’engage à publier uniquement des
            contenus qui montrent le lieu et ses prestations, sans contenu suggestif. J’accepte les
            <RouterLink
              :to="{ name: 'legal.terms', hash: '#partenaires' }"
              target="_blank"
              class="font-medium text-brand-700 underline"
              >conditions partenaires</RouterLink
            >.
          </span>
        </label>
        <div class="sm:col-span-2">
          <button
            type="submit"
            class="btn-primary w-full sm:w-auto"
            :disabled="form.processing.value"
          >
            {{ form.processing.value ? 'Envoi…' : 'Envoyer ma demande' }}
          </button>
        </div>
      </form>

      <aside class="space-y-4">
        <div v-for="perk in PERKS" :key="perk.title" class="card flex gap-4 p-5">
          <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-sunset text-white">
            <component :is="perk.icon" class="size-5" />
          </span>
          <div>
            <p class="font-display font-semibold">{{ perk.title }}</p>
            <p class="text-sm text-muted">{{ perk.text }}</p>
          </div>
        </div>
        <div class="card flex gap-4 p-5">
          <ShieldCheck class="size-6 shrink-0 text-emerald-600" />
          <p class="text-sm text-muted">
            Seuls les établissements vérifiés sont acceptés. Chaque vidéo est contrôlée avant
            publication.
          </p>
        </div>
      </aside>
    </section>
  </div>
</template>

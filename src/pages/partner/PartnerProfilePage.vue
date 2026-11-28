<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BadgeCheck, FileText, LocateFixed, Store, Trash2, Upload, Wallet } from 'lucide-vue-next'
import { api, ApiError } from '@/lib/api'
import { useForm } from '@/composables/useForm'
import { usePartnerProfile } from '@/composables/usePartnerProfile'
import FormField from '@/components/FormField.vue'
import PageHeader from '@/components/PageHeader.vue'
import PartnerProfileChecklist from '@/components/PartnerProfileChecklist.vue'
import {
  PARTNER_TYPE_LABELS,
  PAYOUT_METHOD_LABELS,
  type Partner,
  type PayoutMethod,
} from '@/types/catalog'

/**
 * "Ma fiche": the partner completes its record once its account is active (short "Devenir
 * partenaire" request): city, address, presentation, position; for a bookable partner, the mobile
 * money number withdrawals are sent to (confirmed by a WhatsApp code) and the verification documents
 * checked by the team before the first withdrawal. Name, activity, phone and email stay with the team.
 */
const { partner, load } = usePartnerProfile()
const bookable = computed(() => partner.value?.profile === 'bookable')

// ─── Establishment
const fields = reactive({ city: '', address: '', description: '', contact_name: '' })
const position = ref<{ latitude: number; longitude: number } | null>(null)
const form = useForm()
const saved = ref(false)
const locating = ref(false)
const locateError = ref<string | null>(null)

watch(
  partner,
  (value) => {
    if (!value) return
    Object.assign(fields, {
      city: value.city ?? '',
      address: value.address ?? '',
      description: value.description ?? '',
      contact_name: value.contact_name ?? '',
    })
    position.value =
      value.latitude !== null && value.longitude !== null
        ? { latitude: value.latitude, longitude: value.longitude }
        : null
  },
  { immediate: true },
)
load()

/** On site, the phone's position puts the establishment on the map (itinerary from the videos). */
function locate() {
  locateError.value = null
  if (!navigator.geolocation) {
    locateError.value = 'Votre téléphone ne donne pas sa position.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (p) => {
      position.value = {
        latitude: Math.round(p.coords.latitude * 1e6) / 1e6,
        longitude: Math.round(p.coords.longitude * 1e6) / 1e6,
      }
      locating.value = false
    },
    () => {
      locateError.value = 'Position refusée ou introuvable. Autorisez la localisation et réessayez.'
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

async function save() {
  saved.value = false
  const result = await form.submit(() =>
    api.put<{ data: Partner }>('/api/v1/partner/profile', {
      city: fields.city,
      address: fields.address || null,
      description: fields.description || null,
      contact_name: fields.contact_name || null,
      latitude: position.value?.latitude ?? null,
      longitude: position.value?.longitude ?? null,
    }),
  )
  if (!result) return
  partner.value = result.data
  saved.value = true
}

// ─── Payout number (mobile money only; a bank account is set by the team)
const MOBILE_METHODS = (Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[]).filter(
  (m) => m !== 'bank_transfer',
)
const payout = reactive({ method: 'wave' as PayoutMethod, account: '', code: '' })
const payoutStep = ref<'idle' | 'code'>('idle')
const payoutSentTo = ref<string | null>(null)
const payoutForm = useForm()
const payoutSaved = ref(false)
const changingPayout = ref(false)

async function requestPayoutCode() {
  payoutSaved.value = false
  const result = await payoutForm.submit(() =>
    api.post<{ data: { sent_to?: string; dev_code?: string } }>('/api/v1/partner/payout/code', {
      payout_method: payout.method,
      payout_account: payout.account,
    }),
  )
  if (!result) return
  payoutSentTo.value = result.data.sent_to ?? null
  payout.code = result.data.dev_code ?? ''
  payoutStep.value = 'code'
}

async function confirmPayout() {
  const result = await payoutForm.submit(() =>
    api.put<{ data: Partner }>('/api/v1/partner/payout', {
      payout_method: payout.method,
      payout_account: payout.account,
      code: payout.code,
    }),
  )
  if (!result) return
  partner.value = result.data
  Object.assign(payout, { account: '', code: '' })
  payoutStep.value = 'idle'
  changingPayout.value = false
  payoutSaved.value = true
}

// ─── Verification documents
const MAX_DOCUMENTS = 4
const documentsError = ref<string | null>(null)
const uploading = ref(false)

function apiMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError
    ? (Object.values(e.errors)[0]?.[0] ?? e.detail ?? e.message)
    : fallback
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  documentsError.value = null
  if (!files.length || !partner.value) return
  if (files.length + partner.value.documents.length > MAX_DOCUMENTS) {
    documentsError.value = `Au plus ${MAX_DOCUMENTS} documents.`
    return
  }
  const tooBig = files.find((f) => f.size > 8 * 1024 * 1024)
  if (tooBig) {
    documentsError.value = `« ${tooBig.name} » dépasse 8 Mo.`
    return
  }
  const data = new FormData()
  files.forEach((file) => data.append('documents[]', file))
  uploading.value = true
  try {
    partner.value = (await api.post<{ data: Partner }>('/api/v1/partner/documents', data)).data
  } catch (e) {
    documentsError.value = apiMessage(e, 'Envoi impossible. Réessayez.')
  } finally {
    uploading.value = false
  }
}

async function removeDocument(index: number) {
  documentsError.value = null
  try {
    partner.value = (await api.delete<{ data: Partner }>(`/api/v1/partner/documents/${index}`)).data
  } catch (e) {
    documentsError.value = apiMessage(e, 'Suppression impossible.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Ma fiche"
      subtitle="Les informations que vos clients voient, et ce qu'il faut pour recevoir votre argent."
      :icon="Store"
    />

    <div v-if="!partner" class="skeleton h-64 rounded-3xl" />
    <template v-else>
      <PartnerProfileChecklist :partner="partner" />

      <!-- Establishment -->
      <form class="card grid max-w-3xl gap-5 p-6 sm:grid-cols-2" @submit.prevent="save">
        <div class="sm:col-span-2">
          <h2 class="section-title">{{ partner.name }}</h2>
          <p class="text-sm text-muted">
            {{ PARTNER_TYPE_LABELS[partner.type] }} · {{ partner.whatsapp ?? partner.phone }}
            <template v-if="partner.email"> · {{ partner.email }}</template>
          </p>
          <p class="mt-1 text-xs text-muted">
            Nom, activité, téléphone et email : pour les changer, contactez l’équipe KiffUp. Vos
            codes de confirmation sont envoyés sur ce numéro.
          </p>
        </div>
        <div v-if="saved" class="alert-success sm:col-span-2">Fiche enregistrée.</div>
        <div v-if="form.error.value" class="alert-error sm:col-span-2">{{ form.error.value }}</div>

        <FormField label="Ville" for="city" :error="form.fieldError('city')">
          <input id="city" v-model="fields.city" class="input" placeholder="Abidjan" required />
        </FormField>
        <FormField label="Adresse" for="address" :error="form.fieldError('address')">
          <input
            id="address"
            v-model="fields.address"
            class="input"
            placeholder="Quartier, rue, repère"
          />
        </FormField>
        <FormField
          label="Présentez votre établissement"
          for="description"
          :error="form.fieldError('description')"
          class="sm:col-span-2"
        >
          <textarea
            id="description"
            v-model="fields.description"
            class="input"
            rows="4"
            maxlength="5000"
          />
        </FormField>
        <FormField
          label="Votre nom (gérant ou responsable)"
          for="contact_name"
          :error="form.fieldError('contact_name')"
        >
          <input id="contact_name" v-model="fields.contact_name" class="input" />
        </FormField>
        <FormField
          label="Position sur la carte"
          for="locate"
          :error="locateError ?? form.fieldError('latitude')"
          hint="Depuis votre établissement : vos clients obtiennent l'itinéraire en un geste."
        >
          <button
            id="locate"
            type="button"
            class="btn-ghost w-full justify-center"
            :disabled="locating"
            @click="locate"
          >
            <LocateFixed class="size-4" />
            {{
              locating
                ? 'Recherche…'
                : position
                  ? 'Position enregistrée · mettre à jour'
                  : 'Utiliser ma position actuelle'
            }}
          </button>
        </FormField>

        <div class="sm:col-span-2">
          <button class="btn-primary" type="submit" :disabled="form.processing.value">
            Enregistrer ma fiche
          </button>
        </div>
      </form>

      <!-- Payout number -->
      <section v-if="bookable" class="card max-w-3xl space-y-4 p-6">
        <h2 class="section-title flex items-center gap-2">
          <Wallet class="size-5 text-brand-600" /> Numéro de retrait
        </h2>
        <div v-if="payoutSaved" class="alert-success">
          Numéro enregistré : vos prochains retraits seront envoyés sur ce compte.
        </div>
        <p class="text-sm">
          <template v-if="partner.payout_method && partner.payout_account">
            Vos retraits sont envoyés sur
            <strong
              >{{ PAYOUT_METHOD_LABELS[partner.payout_method] }}
              {{ partner.payout_account }}</strong
            >.
          </template>
          <template v-else>Aucun numéro de retrait pour l’instant.</template>
        </p>

        <button
          v-if="!changingPayout"
          type="button"
          class="btn-secondary"
          @click="changingPayout = true"
        >
          {{ partner.payout_account ? 'Changer de numéro' : 'Ajouter mon numéro' }}
        </button>

        <div v-else class="panel space-y-4">
          <div v-if="payoutForm.error.value" class="alert-error">{{ payoutForm.error.value }}</div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Moyen"
              for="payout_method"
              :error="payoutForm.fieldError('payout_method')"
            >
              <select
                id="payout_method"
                v-model="payout.method"
                class="input"
                :disabled="payoutStep === 'code'"
              >
                <option v-for="m in MOBILE_METHODS" :key="m" :value="m">
                  {{ PAYOUT_METHOD_LABELS[m] }}
                </option>
              </select>
            </FormField>
            <FormField
              label="Numéro"
              for="payout_account"
              :error="payoutForm.fieldError('payout_account')"
            >
              <input
                id="payout_account"
                v-model="payout.account"
                class="input"
                type="tel"
                placeholder="07 07 07 07 07"
                :disabled="payoutStep === 'code'"
                required
              />
            </FormField>
          </div>

          <template v-if="payoutStep === 'idle'">
            <p class="text-xs text-muted">
              Pour votre sécurité, un code de confirmation vous est envoyé sur WhatsApp.
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-primary"
                :disabled="payoutForm.processing.value || !payout.account"
                @click="requestPayoutCode"
              >
                Recevoir le code
              </button>
              <button type="button" class="btn-ghost" @click="changingPayout = false">
                Annuler
              </button>
            </div>
          </template>
          <template v-else>
            <p class="text-sm">
              Code envoyé{{ payoutSentTo ? ` sur ${payoutSentTo}` : '' }}. Il est valable 10
              minutes.
            </p>
            <FormField label="Code reçu" for="payout_code" :error="payoutForm.fieldError('code')">
              <input
                id="payout_code"
                v-model="payout.code"
                class="input max-w-40 tracking-widest"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                required
              />
            </FormField>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-primary"
                :disabled="payoutForm.processing.value || payout.code.length !== 6"
                @click="confirmPayout"
              >
                Confirmer
              </button>
              <button type="button" class="btn-ghost" @click="payoutStep = 'idle'">
                Modifier le numéro
              </button>
            </div>
          </template>
        </div>
      </section>

      <!-- Verification documents -->
      <section v-if="bookable" class="card max-w-3xl space-y-4 p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="section-title flex items-center gap-2">
            <BadgeCheck class="size-5 text-brand-600" /> Pièces justificatives
          </h2>
          <span
            :class="
              partner.verified_at
                ? 'badge-success'
                : partner.documents.length
                  ? 'badge-info'
                  : 'badge-warning'
            "
          >
            {{
              partner.verified_at
                ? 'Vérifiées'
                : partner.documents.length
                  ? 'En cours de vérification'
                  : 'À envoyer'
            }}
          </span>
        </div>
        <p class="text-sm text-muted">
          RCCM ou pièce d’identité du gérant, et une photo de la devanture (photo ou PDF, 8 Mo au
          plus chacun). L’équipe KiffUp les vérifie avant votre premier retrait.
        </p>
        <div v-if="documentsError" class="alert-error">{{ documentsError }}</div>

        <ul v-if="partner.documents.length" class="space-y-2">
          <li
            v-for="doc in partner.documents"
            :key="doc.index"
            class="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm"
          >
            <FileText class="size-4 shrink-0 text-brand-600" />
            <span class="min-w-0 flex-1 truncate">{{ doc.name }}</span>
            <button
              v-if="!partner.verified_at"
              type="button"
              class="btn-ghost px-2 py-1 text-red-700"
              :aria-label="`Supprimer ${doc.name}`"
              @click="removeDocument(doc.index)"
            >
              <Trash2 class="size-4" />
            </button>
          </li>
        </ul>

        <label
          v-if="!partner.verified_at && partner.documents.length < MAX_DOCUMENTS"
          class="btn-secondary cursor-pointer"
          :class="{ 'pointer-events-none opacity-60': uploading }"
        >
          <Upload class="size-4" />
          {{ uploading ? 'Envoi…' : 'Ajouter des pièces' }}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            class="sr-only"
            @change="upload"
          />
        </label>
      </section>
    </template>
  </div>
</template>

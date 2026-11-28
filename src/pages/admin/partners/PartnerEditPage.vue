<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { formatRate } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import FormField from '@/components/FormField.vue'
import {
  LISTINGS_ACCESS_LABELS,
  PARTNER_PROFILE_LABELS,
  PARTNER_TYPE_LABELS,
  PAYOUT_METHOD_LABELS,
  type ListingsAccess,
  type OpeningRange,
  type Partner,
  type PartnerAccount,
  type PartnerProfile,
  type PartnerType,
  type PayoutMethod,
} from '@/types/catalog'
import {
  BadgeCheck,
  Clock3,
  FileText,
  Handshake,
  KeyRound,
  Pencil,
  UserRound,
} from 'lucide-vue-next'
import OpeningHoursEditor from '@/components/OpeningHoursEditor.vue'
import PageHeader from '@/components/PageHeader.vue'

const props = defineProps<{ id?: string }>()
const router = useRouter()

const isNew = computed(() => !props.id)
const partner = ref<Partner | null>(null)
const saved = ref(false)
const accountCreated = ref(false)
const accountSaved = ref(false)
const form = useForm()
const accountForm = useForm()
const loginForm = useForm()

const fields = reactive({
  name: '',
  type: 'residence' as PartnerType,
  profile: 'bookable' as PartnerProfile,
  listings_access: 'none' as ListingsAccess,
  contact_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  city: 'Abidjan',
  address: '',
  description: '',
  payout_method: '' as PayoutMethod | '',
  payout_account: '',
  commission_percent: '' as string | number,
  is_active: true,
})
const account = reactive({ name: '', email: '', phone: '' })
/** Login being edited (number / email used to log in, separate from the contact details above). */
const editedLogin = reactive({ id: 0, phone: '', email: '' })

// Opening hours (V3, lot F4): sessions are requested inside them. Saved on their own.
const hours = ref<OpeningRange[]>([])
const closedDates = ref<string[]>([])
const hoursForm = useForm()
const hoursSaved = ref(false)

async function saveHours() {
  hoursSaved.value = false
  const result = await hoursForm.submit(() =>
    api.patch<{ data: Partner }>(`/api/v1/admin/partners/${props.id}`, {
      opening_hours: hours.value,
      closed_dates: closedDates.value,
    }),
  )
  if (!result) return
  fill(result.data)
  hoursSaved.value = true
}

function fill(data: Partner) {
  hours.value = data.opening_hours ?? []
  closedDates.value = data.closed_dates ?? []
  partner.value = data
  Object.assign(fields, {
    name: data.name,
    type: data.type,
    profile: data.profile,
    listings_access: data.listings_access,
    contact_name: data.contact_name ?? '',
    phone: data.phone,
    whatsapp: data.whatsapp ?? '',
    email: data.email ?? '',
    city: data.city ?? '',
    address: data.address ?? '',
    description: data.description ?? '',
    payout_method: data.payout_method ?? '',
    payout_account: data.payout_account ?? '',
    commission_percent: data.commission_rate_bp === null ? '' : data.commission_rate_bp / 100,
    is_active: data.is_active,
  })
  Object.assign(account, {
    name: data.contact_name ?? '',
    email: data.email ?? '',
    // The password message goes to this number on WhatsApp.
    phone: data.whatsapp || data.phone,
  })
}

async function load() {
  if (props.id) fill((await api.get<{ data: Partner }>(`/api/v1/admin/partners/${props.id}`)).data)
}

async function save() {
  saved.value = false
  const { commission_percent, ...rest } = fields
  const payload = {
    ...rest,
    contact_name: rest.contact_name || null,
    whatsapp: rest.whatsapp || null,
    email: rest.email || null,
    city: rest.city || null,
    address: rest.address || null,
    description: rest.description || null,
    payout_method: rest.payout_method || null,
    payout_account: rest.payout_account || null,
    commission_rate_bp:
      commission_percent === '' ? null : Math.round(Number(commission_percent) * 100),
  }
  const result = await form.submit(() =>
    isNew.value
      ? api.post<{ data: Partner }>('/api/v1/admin/partners', payload)
      : api.patch<{ data: Partner }>(`/api/v1/admin/partners/${props.id}`, payload),
  )
  if (!result) return
  if (isNew.value) {
    await router.replace({ name: 'admin.partners.edit', params: { id: result.data.id } })
  } else {
    fill(result.data)
    saved.value = true
  }
}

async function createAccount() {
  accountCreated.value = false
  const result = await accountForm.submit(() =>
    api.post<{ data: Partner }>(`/api/v1/admin/partners/${props.id}/account`, {
      ...account,
      email: account.email || null,
    }),
  )
  if (result) {
    partner.value = result.data
    accountCreated.value = true
  }
}

function editLogin(login: PartnerAccount) {
  accountSaved.value = false
  Object.assign(editedLogin, { id: login.id, phone: login.phone ?? '', email: login.email ?? '' })
}

async function saveLogin() {
  const result = await loginForm.submit(() =>
    api.put<{ data: Partner }>(`/api/v1/admin/partners/${props.id}/accounts/${editedLogin.id}`, {
      phone: editedLogin.phone,
      email: editedLogin.email || null,
    }),
  )
  if (result) {
    partner.value = result.data
    editedLogin.id = 0
    accountSaved.value = true
  }
}

// Documents sent by the partner from "Ma fiche" (RG38): checked before its first withdrawal.
const verificationForm = useForm()
const documentUrl = (index: number) =>
  `${import.meta.env.VITE_API_URL ?? ''}/api/v1/admin/partners/${props.id}/documents/${index}`

async function setVerified(verified: boolean) {
  const url = `/api/v1/admin/partners/${props.id}/verification`
  const result = await verificationForm.submit(() =>
    verified ? api.post<{ data: Partner }>(url) : api.delete<{ data: Partner }>(url),
  )
  if (result) partner.value = result.data
}

watch(() => props.id, load, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="isNew ? 'Nouveau partenaire' : fields.name"
      :icon="Handshake"
      :back="{ to: { name: 'admin.partners' }, label: 'Partenaires' }"
    />

    <form class="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" @submit.prevent="save">
      <div v-if="form.error.value" class="alert-error sm:col-span-2">{{ form.error.value }}</div>
      <div v-if="saved" class="alert-success sm:col-span-2">Modifications enregistrées.</div>

      <FormField label="Nom" for="name" :error="form.fieldError('name')">
        <input id="name" v-model="fields.name" class="input" required />
      </FormField>
      <FormField label="Type" for="type" :error="form.fieldError('type')">
        <select id="type" v-model="fields.type" class="input">
          <option v-for="(label, value) in PARTNER_TYPE_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </FormField>
      <FormField
        label="Profil"
        for="profile"
        :error="form.fieldError('profile')"
        hint="Vitrine : vidéos Découvrir et contacts directs. Réservable : en plus, offres payées en ligne et solde."
        class="sm:col-span-2"
      >
        <select id="profile" v-model="fields.profile" class="input">
          <option v-for="(label, value) in PARTNER_PROFILE_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </FormField>
      <FormField
        v-if="fields.profile === 'bookable'"
        label="Le partenaire enregistre lui-même ses offres"
        for="listings_access"
        :error="form.fieldError('listings_access')"
        hint="Il crée et modifie ses offres depuis son espace. La commission, l'ordre d'affichage et les événements restent gérés par l'équipe."
        class="sm:col-span-2"
      >
        <select id="listings_access" v-model="fields.listings_access" class="input">
          <option v-for="(label, value) in LISTINGS_ACCESS_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </FormField>
      <FormField label="Contact (nom)" for="contact_name" :error="form.fieldError('contact_name')">
        <input id="contact_name" v-model="fields.contact_name" class="input" />
      </FormField>
      <FormField label="Téléphone" for="phone" :error="form.fieldError('phone')">
        <input
          id="phone"
          v-model="fields.phone"
          class="input"
          type="tel"
          placeholder="+225 07 07 07 07 07"
          required
        />
      </FormField>
      <FormField label="WhatsApp" for="whatsapp" :error="form.fieldError('whatsapp')">
        <input id="whatsapp" v-model="fields.whatsapp" class="input" type="tel" />
      </FormField>
      <FormField label="Email" for="email" :error="form.fieldError('email')">
        <input id="email" v-model="fields.email" class="input" type="email" />
      </FormField>
      <FormField
        label="Ville"
        for="city"
        :error="form.fieldError('city')"
        :hint="
          !isNew && !fields.city
            ? 'Pas encore indiquée par le partenaire (« Ma fiche »).'
            : undefined
        "
      >
        <input id="city" v-model="fields.city" class="input" :required="isNew" />
      </FormField>
      <FormField label="Adresse" for="address" :error="form.fieldError('address')">
        <input id="address" v-model="fields.address" class="input" />
      </FormField>
      <FormField
        label="Moyen de retrait"
        for="payout_method"
        :error="form.fieldError('payout_method')"
      >
        <select id="payout_method" v-model="fields.payout_method" class="input">
          <option value="">Non renseigné</option>
          <option v-for="(label, value) in PAYOUT_METHOD_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </FormField>
      <FormField
        label="Numéro / compte de retrait"
        for="payout_account"
        :error="form.fieldError('payout_account')"
      >
        <input id="payout_account" v-model="fields.payout_account" class="input" />
      </FormField>
      <FormField
        label="Commission spécifique (%)"
        for="commission"
        :error="form.fieldError('commission_rate_bp')"
        hint="Vide = commission par défaut de la plateforme. Ajoutée au montant du partenaire."
      >
        <input
          id="commission"
          v-model="fields.commission_percent"
          class="input"
          type="number"
          min="0"
          max="50"
          step="0.5"
        />
      </FormField>
      <label class="flex items-center gap-2 self-end pb-3 text-sm">
        <input v-model="fields.is_active" type="checkbox" class="size-4 accent-brand-600" />
        Partenaire actif
      </label>
      <FormField
        label="Description"
        for="description"
        :error="form.fieldError('description')"
        class="sm:col-span-2"
      >
        <textarea id="description" v-model="fields.description" class="input" rows="3" />
      </FormField>

      <div class="flex flex-wrap gap-3 border-t border-stone-100 pt-5 sm:col-span-2">
        <button class="btn-primary" type="submit" :disabled="form.processing.value">
          {{ isNew ? 'Créer le partenaire' : 'Enregistrer' }}
        </button>
      </div>
    </form>

    <!-- Opening hours: sessions are requested inside them (V3, lot F4) -->
    <section v-if="partner && partner.profile === 'bookable'" class="card space-y-4 p-6">
      <h2 class="section-title flex items-center gap-2">
        <Clock3 class="size-5 text-brand-600" /> Horaires d'ouverture
      </h2>
      <p class="text-sm text-muted">
        Les clients demandent une séance uniquement pendant ces horaires. Le partenaire peut aussi
        les modifier depuis son espace (« Mes horaires »).
      </p>
      <div v-if="hoursSaved" class="alert-success">Horaires enregistrés.</div>
      <div v-if="hoursForm.error.value" class="alert-error">{{ hoursForm.error.value }}</div>
      <OpeningHoursEditor
        v-model:hours="hours"
        v-model:closed-dates="closedDates"
        :errors="hoursForm.fieldErrors.value"
      />
      <button class="btn-primary" :disabled="hoursForm.processing.value" @click="saveHours">
        Enregistrer les horaires
      </button>
    </section>

    <!-- Verification: documents sent from "Ma fiche", checked before the first withdrawal -->
    <section v-if="partner" class="card space-y-4 p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="section-title flex items-center gap-2">
          <BadgeCheck class="size-5 text-brand-600" /> Vérification
        </h2>
        <span :class="partner.verified_at ? 'badge-success' : 'badge-warning'">
          {{
            partner.verified_at
              ? 'Vérifié le ' + new Date(partner.verified_at).toLocaleDateString('fr-FR')
              : 'À vérifier'
          }}
        </span>
      </div>
      <p class="text-sm text-muted">
        Le partenaire envoie ses pièces depuis « Ma fiche » (RCCM ou pièce d’identité du gérant,
        photo de la devanture). Ses retraits sont possibles une fois le partenaire vérifié.
      </p>
      <div v-if="verificationForm.error.value" class="alert-error">
        {{ verificationForm.error.value }}
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          v-for="doc in partner.documents"
          :key="doc.index"
          :href="documentUrl(doc.index)"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm hover:border-stone-400"
        >
          <FileText class="size-4" /> {{ doc.name }}
        </a>
        <span v-if="partner.documents.length === 0" class="text-sm text-amber-700">
          Aucune pièce envoyée pour l’instant.
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="!partner.verified_at"
          type="button"
          class="btn-primary px-4 py-2 text-sm"
          :disabled="verificationForm.processing.value"
          @click="setVerified(true)"
        >
          Marquer comme vérifié
        </button>
        <button
          v-else
          type="button"
          class="btn-ghost px-4 py-2 text-sm text-red-700"
          :disabled="verificationForm.processing.value"
          @click="setVerified(false)"
        >
          Retirer la vérification
        </button>
      </div>
    </section>

    <!-- Login account -->
    <section v-if="partner" class="card space-y-4 p-6">
      <h2 class="section-title flex items-center gap-2">
        <KeyRound class="size-5 text-brand-600" /> Compte de connexion
      </h2>
      <div v-if="accountCreated" class="alert-success">
        Compte créé : le partenaire a reçu un message WhatsApp pour choisir son mot de passe.
      </div>
      <div v-if="accountSaved" class="alert-success">
        Identifiants enregistrés : le partenaire se connecte maintenant avec ce numéro.
      </div>

      <ul v-if="partner.accounts.length" class="space-y-2">
        <li
          v-for="login in partner.accounts"
          :key="login.id"
          class="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm"
        >
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-sunset text-white">
            <UserRound class="size-5" />
          </span>
          <span class="min-w-0 flex-1">
            <strong>{{ login.name }}</strong> ·
            {{ login.phone ?? 'aucun numéro' }}
            <span v-if="login.email" class="text-muted"> · {{ login.email }}</span>
          </span>
          <span :class="login.last_login_at ? 'badge-success' : 'badge-neutral'">
            {{
              login.last_login_at
                ? 'dernière connexion le ' +
                  new Date(login.last_login_at).toLocaleDateString('fr-FR')
                : 'jamais connecté'
            }}
          </span>
          <button
            type="button"
            class="btn-ghost px-3 py-1.5 text-sm"
            :aria-label="`Modifier les identifiants de ${login.name}`"
            @click="editLogin(login)"
          >
            <Pencil class="size-4" /> Modifier
          </button>
        </li>
      </ul>

      <form
        v-if="editedLogin.id"
        class="grid gap-4 rounded-2xl border border-stone-200 p-4 sm:grid-cols-2"
        @submit.prevent="saveLogin"
      >
        <div v-if="loginForm.error.value" class="alert-error sm:col-span-2">
          {{ loginForm.error.value }}
        </div>
        <FormField
          label="Numéro de connexion"
          for="login_phone"
          :error="loginForm.fieldError('phone')"
        >
          <input id="login_phone" v-model="editedLogin.phone" class="input" type="tel" required />
        </FormField>
        <FormField
          label="Email (facultatif)"
          for="login_email"
          :error="loginForm.fieldError('email')"
        >
          <input id="login_email" v-model="editedLogin.email" class="input" type="email" />
        </FormField>
        <div class="flex gap-2 sm:col-span-2">
          <button class="btn-primary" type="submit" :disabled="loginForm.processing.value">
            Enregistrer
          </button>
          <button type="button" class="btn-ghost" @click="editedLogin.id = 0">Annuler</button>
        </div>
      </form>

      <form
        v-if="!partner.accounts.length"
        class="grid gap-4 sm:grid-cols-3"
        @submit.prevent="createAccount"
      >
        <div v-if="accountForm.error.value" class="alert-error sm:col-span-3">
          {{ accountForm.error.value }}
        </div>
        <FormField label="Nom" for="account_name" :error="accountForm.fieldError('name')">
          <input id="account_name" v-model="account.name" class="input" required />
        </FormField>
        <FormField
          label="Numéro de connexion"
          for="account_phone"
          :error="accountForm.fieldError('phone')"
        >
          <input id="account_phone" v-model="account.phone" class="input" type="tel" required />
        </FormField>
        <FormField
          label="Email (facultatif)"
          for="account_email"
          :error="accountForm.fieldError('email')"
        >
          <input id="account_email" v-model="account.email" class="input" type="email" />
        </FormField>
        <div class="sm:col-span-3">
          <button class="btn-primary" type="submit" :disabled="accountForm.processing.value">
            Créer le compte
          </button>
        </div>
      </form>

      <p class="text-xs text-muted">
        Commission appliquée :
        {{
          partner.commission_rate_bp === null
            ? 'par défaut'
            : formatRate(partner.commission_rate_bp)
        }}
      </p>
    </section>
  </div>
</template>

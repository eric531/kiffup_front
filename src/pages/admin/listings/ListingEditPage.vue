<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import FormSkeleton from '@/components/FormSkeleton.vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ImagePlus,
  Moon,
  Package,
  Sun,
  Trash2,
  X,
} from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatRate, formatShortDate, formatXof } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import { usePartnerProfile } from '@/composables/usePartnerProfile'
import FormField from '@/components/FormField.vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  LISTING_STATUS_BADGES,
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
  type Listing,
  type ListingType,
  type Partner,
} from '@/types/catalog'
import type { Paginated } from '@/types/identity'

/**
 * A partner's listing, bookable all year per night, per day or per session.
 * Back-office: every field, the decision on the listings created by the partners (V3, lot F6).
 * Partner area: its own listing, when the admin lets it manage them; commission, display order and
 * event packages stay with the admin.
 */
const props = withDefaults(defineProps<{ id?: string; area?: 'admin' | 'partner' }>(), {
  id: undefined,
  area: 'admin',
})
const route = useRoute()
const router = useRouter()
const { partner: myPartner, load: loadMyPartner } = usePartnerProfile()

const isAdmin = computed(() => props.area === 'admin')
const base = computed(() => (isAdmin.value ? '/api/v1/admin/listings' : '/api/v1/partner/listings'))
// Partner area: read-only while the team keeps the listings up to date.
const readOnly = computed(
  () => !isAdmin.value && (myPartner.value?.listings_access ?? 'none') === 'none',
)
const isNew = computed(() => !props.id)
const listing = ref<Listing | null>(null)
const partners = ref<Partner[]>([])
const saved = ref(false)
const form = useForm()
const photos = useForm()
const review = useForm()
const rejecting = ref(false)
const reason = ref('')

const fields = reactive({
  partner_id: Number(route.query.partner_id) || 0,
  type: 'hotel_room' as ListingType,
  title: '',
  description: '',
  city: '',
  address: '',
  capacity: '' as string | number,
  units: 1 as string | number,
  is_deductible: true,
  night: true,
  night_amount: '' as string | number,
  night_service_price: '' as string | number,
  day: false,
  day_amount: '' as string | number,
  day_service_price: '' as string | number,
  session: false,
  session_amount: '' as string | number,
  session_service_price: '' as string | number,
  session_minutes: 60 as string | number,
  min_duration: '' as string | number,
  max_duration: '' as string | number,
  commission_percent: '' as string | number,
  max_quantity_per_order: '' as string | number,
  is_visible: true,
})

// Waiting for review or refused: the admin's decision puts it on sale, not the checkbox.
const decided = computed(
  () => !listing.value || listing.value.status === 'active' || listing.value.status === 'hidden',
)

// New listing: rooms and apartments by the night, cars and parking by the day, care by the session.
const tariffTouched = ref(false)
watch(
  () => fields.type,
  (type) => {
    if (!isNew.value || tariffTouched.value) return
    const daily = type === 'car' || type === 'parking'
    const service = type === 'service'
    fields.night = !daily && !service
    fields.day = daily
    fields.session = service
  },
)

const optionalNumber = (value: string | number) => (value === '' ? null : Number(value))

function fill(data: Listing) {
  listing.value = data
  Object.assign(fields, {
    partner_id: data.partner_id ?? data.partner?.id ?? 0,
    type: data.type,
    title: data.title,
    description: data.description ?? '',
    city: data.city ?? '',
    address: data.address ?? '',
    capacity: data.capacity ?? '',
    units: data.units,
    is_deductible: data.is_deductible,
    night: data.night_amount != null,
    night_amount: data.night_amount ?? '',
    night_service_price: data.night_service_price ?? '',
    day: data.day_amount != null,
    day_amount: data.day_amount ?? '',
    day_service_price: data.day_service_price ?? '',
    session: data.session_amount != null,
    session_amount: data.session_amount ?? '',
    session_service_price: data.session_service_price ?? '',
    session_minutes: data.session_minutes ?? 60,
    min_duration: data.min_duration ?? '',
    max_duration: data.max_duration ?? '',
    commission_percent: data.commission_rate_bp == null ? '' : data.commission_rate_bp / 100,
    max_quantity_per_order: data.max_quantity_per_order_override ?? '',
    is_visible: data.status !== 'hidden',
  })
  tariffTouched.value = true
}

onMounted(async () => {
  if (!isAdmin.value) {
    await loadMyPartner()
    return
  }
  partners.value = (
    await api.get<Paginated<Partner>>('/api/v1/admin/partners', { active: 1, per_page: 100 })
  ).data
})

// The record of an existing listing loads before its form shows (no empty form meanwhile).
const loadingRecord = ref(!!props.id)
watch(
  () => props.id,
  async (id) => {
    if (!id) return
    loadingRecord.value = true
    try {
      fill((await api.get<{ data: Listing }>(`${base.value}/${id}`)).data)
    } finally {
      loadingRecord.value = false
    }
  },
  { immediate: true },
)

async function save() {
  saved.value = false
  const payload: Record<string, unknown> = {
    type: fields.type,
    title: fields.title,
    description: fields.description || null,
    city: fields.city || null,
    address: fields.address || null,
    capacity: optionalNumber(fields.capacity),
    units: Number(fields.units),
    is_deductible: fields.is_deductible,
    night_amount: fields.night ? optionalNumber(fields.night_amount) : null,
    night_service_price: fields.night ? optionalNumber(fields.night_service_price) : null,
    day_amount: fields.day ? optionalNumber(fields.day_amount) : null,
    day_service_price: fields.day ? optionalNumber(fields.day_service_price) : null,
    session_amount: fields.session ? optionalNumber(fields.session_amount) : null,
    session_service_price: fields.session ? optionalNumber(fields.session_service_price) : null,
    session_minutes: fields.session ? optionalNumber(fields.session_minutes) : null,
    min_duration: optionalNumber(fields.min_duration),
    max_duration: optionalNumber(fields.max_duration),
    max_quantity_per_order: optionalNumber(fields.max_quantity_per_order),
    is_visible: fields.is_visible,
  }
  if (isAdmin.value) {
    payload.commission_rate_bp =
      fields.commission_percent === '' ? null : Math.round(Number(fields.commission_percent) * 100)
    if (isNew.value) payload.partner_id = fields.partner_id
  }

  const result = await form.submit(() =>
    isNew.value
      ? api.post<{ data: Listing }>(base.value, payload)
      : api.patch<{ data: Listing }>(`${base.value}/${props.id}`, payload),
  )
  if (!result) return
  if (isNew.value) {
    await router.replace({ name: `${props.area}.listings.edit`, params: { id: result.data.id } })
  } else {
    fill(result.data)
    saved.value = true
  }
}

async function deleteListing() {
  if (!listing.value || !confirm('Supprimer définitivement cette offre ?')) return
  const done = await form.submit(async () => {
    await api.delete(`${base.value}/${listing.value!.id}`)
    return true
  })
  if (done) await router.replace({ name: `${props.area}.listings` })
}

async function uploadPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const data = new FormData()
  data.append('photo', file)
  const result = await photos.submit(() =>
    api.post<{ data: Listing }>(`${base.value}/${props.id}/photos`, data),
  )
  if (result) listing.value = result.data
  input.value = ''
}

async function deletePhoto(photoId: number) {
  const result = await photos.submit(() =>
    api.delete<{ data: Listing }>(`${base.value}/${props.id}/photos/${photoId}`),
  )
  if (result) listing.value = result.data
}

/** Back-office (RG51): put on sale, or refuse / withdraw with a reason sent to the partner. */
async function decide(approve: boolean) {
  const result = await review.submit(() =>
    approve
      ? api.post<{ data: Listing }>(`${base.value}/${props.id}/approve`)
      : api.post<{ data: Listing }>(`${base.value}/${props.id}/reject`, { reason: reason.value }),
  )
  if (!result) return
  fill(result.data)
  rejecting.value = false
  reason.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="isNew ? 'Nouvelle offre' : fields.title"
      :icon="Package"
      :back="{
        to: { name: `${area}.listings` },
        label: isAdmin ? 'Offres' : 'Mes offres',
      }"
    />

    <!-- Decision on a listing created or changed by its partner (V3, lot F6) -->
    <section v-if="listing && isAdmin" class="card space-y-3 p-6">
      <div class="flex flex-wrap items-center gap-3">
        <span :class="LISTING_STATUS_BADGES[listing.status]">
          {{ LISTING_STATUS_LABELS[listing.status] }}
        </span>
        <span v-if="listing.partner_updated_at" class="text-sm text-muted">
          Modifiée par le partenaire le {{ formatShortDate(listing.partner_updated_at) }} (détail
          dans le journal d'audit)
        </span>
      </div>
      <p v-if="listing.status === 'pending_review'" class="text-sm">
        Créée ou modifiée par le partenaire : vérifiez le texte, les photos et les prix avant de la
        mettre en vente.
      </p>
      <p v-if="listing.status === 'rejected' && listing.review_note" class="alert-error">
        Motif envoyé au partenaire : {{ listing.review_note }}
      </p>
      <div v-if="review.error.value" class="alert-error">{{ review.error.value }}</div>
      <div v-if="!rejecting" class="flex flex-wrap gap-3">
        <button
          v-if="listing.status === 'pending_review' || listing.status === 'rejected'"
          class="btn-primary"
          :disabled="review.processing.value"
          @click="decide(true)"
        >
          <CheckCircle2 class="size-4" /> Mettre en vente
        </button>
        <button
          v-if="listing.status !== 'rejected'"
          class="btn-ghost text-red-700 hover:bg-red-50"
          @click="rejecting = true"
        >
          <X class="size-4" />
          {{ listing.status === 'pending_review' ? 'Refuser' : 'Retirer du site' }}
        </button>
      </div>
      <form v-else class="space-y-3" @submit.prevent="decide(false)">
        <FormField
          label="Motif (envoyé au partenaire par WhatsApp)"
          for="reason"
          :error="review.fieldError('reason')"
        >
          <textarea
            id="reason"
            v-model="reason"
            class="input"
            rows="2"
            placeholder="Ex. ajoutez des photos de la chambre."
            required
          />
        </FormField>
        <div class="flex flex-wrap gap-3">
          <button class="btn-danger" type="submit" :disabled="review.processing.value">
            Confirmer
          </button>
          <button type="button" class="btn-ghost" @click="rejecting = false">Annuler</button>
        </div>
      </form>
    </section>

    <!-- Partner area: where its listing stands -->
    <template v-if="!isAdmin">
      <p v-if="readOnly" class="alert-info">
        L'équipe KiffUp met à jour vos offres. Pour les gérer vous-même, demandez-lui de vous ouvrir
        la gestion de vos offres.
      </p>
      <p v-else-if="isNew && myPartner?.listings_access === 'review'" class="alert-info">
        Votre offre sera vérifiée par l'équipe KiffUp avant d'être en ligne. Vous êtes prévenu par
        WhatsApp.
      </p>
      <p v-if="listing?.status === 'pending_review'" class="alert-info">
        En attente de validation par l'équipe KiffUp : elle n'est pas encore visible sur le site.
      </p>
      <div v-if="listing?.status === 'rejected'" class="alert-error space-y-1">
        <p v-if="listing.review_note">
          <strong>Offre refusée.</strong> Motif : {{ listing.review_note }}
        </p>
        <p v-else><strong>Offre refusée.</strong></p>
        <p>Corrigez-la et enregistrez : elle sera vérifiée de nouveau.</p>
      </div>
    </template>

    <FormSkeleton v-if="loadingRecord" :fields="8" />
    <form v-else class="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" @submit.prevent="save">
      <fieldset :disabled="readOnly" class="contents">
        <div v-if="form.error.value" class="alert-error sm:col-span-2">{{ form.error.value }}</div>
        <div v-if="saved" class="alert-success sm:col-span-2">Modifications enregistrées.</div>

        <FormField
          v-if="isAdmin"
          label="Partenaire"
          for="partner_id"
          :error="form.fieldError('partner_id')"
        >
          <select
            id="partner_id"
            v-model.number="fields.partner_id"
            class="input"
            :disabled="!isNew"
            required
          >
            <option :value="0" disabled>Choisir un partenaire</option>
            <option v-for="partner in partners" :key="partner.id" :value="partner.id">
              {{ partner.name }} · {{ partner.city }}
            </option>
          </select>
        </FormField>
        <FormField label="Type" for="type" :error="form.fieldError('type')">
          <select id="type" v-model="fields.type" class="input">
            <option v-for="(label, value) in LISTING_TYPE_LABELS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </FormField>
        <FormField
          label="Titre"
          for="title"
          :error="form.fieldError('title')"
          class="sm:col-span-2"
        >
          <input
            id="title"
            v-model="fields.title"
            class="input"
            placeholder="Chambre double vue lagune"
            required
          />
        </FormField>
        <FormField
          label="Ville"
          for="city"
          :error="form.fieldError('city')"
          hint="Vide = ville du partenaire."
        >
          <input id="city" v-model="fields.city" class="input" placeholder="Abidjan" />
        </FormField>
        <FormField label="Adresse (optionnel)" for="address" :error="form.fieldError('address')">
          <input id="address" v-model="fields.address" class="input" />
        </FormField>
        <FormField
          label="Nombre d'unités identiques"
          for="units"
          :error="form.fieldError('units')"
          hint="Ex. 10 chambres doubles. La disponibilité se calcule par date."
        >
          <input id="units" v-model="fields.units" class="input" type="number" min="0" required />
        </FormField>
        <FormField label="Capacité (personnes)" for="capacity" :error="form.fieldError('capacity')">
          <input id="capacity" v-model="fields.capacity" class="input" type="number" min="1" />
        </FormField>

        <!-- Tariffs -->
        <div class="space-y-4 rounded-2xl border border-stone-200 bg-surface p-5 sm:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="section-title">Tarifs hors forfait</h2>
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="fields.is_deductible"
                type="checkbox"
                class="size-4 accent-brand-600"
              />
              Réservation déductible du prix chez le partenaire
            </label>
          </div>
          <p class="text-xs text-muted">
            Montants fixés par le partenaire pour <strong>une</strong> nuit ou
            <strong>un</strong> jour : le client choisit ses dates et tout est multiplié par la
            durée. Pas de hausse dynamique sur ces tarifs. Le forfait d'un événement se règle sur la
            page de l'événement.
          </p>

          <div class="grid gap-4 lg:grid-cols-2">
            <div
              v-for="tariff in ['night', 'day'] as const"
              :key="tariff"
              class="space-y-3 rounded-2xl border bg-white p-4 transition"
              :class="fields[tariff] ? 'border-brand-200 shadow-sm' : 'border-stone-200 opacity-80'"
            >
              <label class="flex items-center gap-2 font-semibold">
                <input
                  v-model="fields[tariff]"
                  type="checkbox"
                  class="size-4 accent-brand-600"
                  @change="tariffTouched = true"
                />
                <component :is="tariff === 'night' ? Moon : Sun" class="size-4 text-brand-600" />
                {{ tariff === 'night' ? 'À la nuit' : 'Au jour' }}
              </label>
              <template v-if="fields[tariff]">
                <FormField
                  :label="`Montant de réservation (FCFA / ${tariff === 'night' ? 'nuit' : 'jour'})`"
                  :for="`${tariff}_amount`"
                  :error="form.fieldError(`${tariff}_amount`)"
                  hint="Reçu en totalité par le partenaire."
                >
                  <input
                    :id="`${tariff}_amount`"
                    v-model="fields[`${tariff}_amount`]"
                    class="input"
                    type="number"
                    min="100"
                    step="100"
                    required
                  />
                </FormField>
                <FormField
                  :label="`Prix total chez le partenaire (FCFA / ${tariff === 'night' ? 'nuit' : 'jour'})`"
                  :for="`${tariff}_service_price`"
                  :error="form.fieldError(`${tariff}_service_price`)"
                  :hint="
                    fields.is_deductible
                      ? 'Obligatoire : sert au reste à payer sur place.'
                      : 'Optionnel.'
                  "
                >
                  <input
                    :id="`${tariff}_service_price`"
                    v-model="fields[`${tariff}_service_price`]"
                    class="input"
                    type="number"
                    min="100"
                    step="100"
                  />
                </FormField>
                <p
                  v-if="listing?.tariffs[tariff]"
                  class="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900"
                >
                  Prix client :
                  <strong>{{ formatXof(listing.tariffs[tariff]!.customer_price) }}</strong>
                  <template v-if="isAdmin">
                    · commission {{ formatXof(listing.commission?.[tariff]) }}</template
                  >
                </p>
              </template>
            </div>
          </div>

          <!-- Session (V3, lot F4): a deposit, the time confirmed by the partner -->
          <div
            class="space-y-3 rounded-2xl border bg-white p-4 transition"
            :class="fields.session ? 'border-brand-200 shadow-sm' : 'border-stone-200 opacity-80'"
          >
            <label class="flex items-center gap-2 font-semibold">
              <input
                v-model="fields.session"
                type="checkbox"
                class="size-4 accent-brand-600"
                @change="tariffTouched = true"
              />
              <Clock3 class="size-4 text-brand-600" /> À la séance (massage, soin, activité…)
            </label>
            <p class="text-xs text-muted">
              Le client choisit un jour et une heure dans les horaires d'ouverture du partenaire
              (sur sa fiche) et paie l'acompte. Le partenaire confirme ou propose une autre heure ;
              sans accord, le client est remboursé. L'acompte est toujours déduit du prix de la
              séance.
            </p>
            <div v-if="fields.session" class="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Durée (minutes)"
                for="session_minutes"
                :error="form.fieldError('session_minutes')"
              >
                <input
                  id="session_minutes"
                  v-model="fields.session_minutes"
                  class="input"
                  type="number"
                  min="15"
                  max="480"
                  step="5"
                  required
                />
              </FormField>
              <FormField
                label="Acompte (FCFA / personne)"
                for="session_amount"
                :error="form.fieldError('session_amount')"
                hint="Reçu en totalité par le partenaire."
              >
                <input
                  id="session_amount"
                  v-model="fields.session_amount"
                  class="input"
                  type="number"
                  min="100"
                  step="100"
                  required
                />
              </FormField>
              <FormField
                label="Prix de la séance (FCFA)"
                for="session_service_price"
                :error="form.fieldError('session_service_price')"
                hint="Le reste est payé sur place."
              >
                <input
                  id="session_service_price"
                  v-model="fields.session_service_price"
                  class="input"
                  type="number"
                  min="100"
                  step="100"
                  required
                />
              </FormField>
            </div>
            <p
              v-if="fields.session && listing?.tariffs.session"
              class="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900"
            >
              Acompte client :
              <strong>{{ formatXof(listing.tariffs.session.customer_price) }}</strong>
              <template v-if="isAdmin">
                · commission {{ formatXof(listing.commission?.session) }}</template
              >
              <template v-if="!listing.session">
                · <strong>pas encore réservable</strong> :
                {{
                  isAdmin
                    ? "le partenaire n'a pas indiqué ses horaires."
                    : 'indiquez vos horaires dans « Mes horaires ».'
                }}
              </template>
            </p>
          </div>

          <div v-if="fields.night || fields.day" class="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Durée minimale (nuits ou jours)"
              for="min_duration"
              :error="form.fieldError('min_duration')"
              hint="Vide = 1."
            >
              <input
                id="min_duration"
                v-model="fields.min_duration"
                class="input"
                type="number"
                min="1"
                max="90"
              />
            </FormField>
            <FormField
              label="Durée maximale"
              for="max_duration"
              :error="form.fieldError('max_duration')"
              hint="Vide = sans limite."
            >
              <input
                id="max_duration"
                v-model="fields.max_duration"
                class="input"
                type="number"
                min="1"
                max="90"
              />
            </FormField>
          </div>
        </div>

        <FormField
          v-if="isAdmin"
          label="Commission spécifique (%)"
          for="commission"
          :error="form.fieldError('commission_rate_bp')"
          hint="Vide = commission du partenaire, sinon celle de la plateforme."
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
        <FormField
          label="Quantité max. par commande"
          for="max_quantity_per_order"
          :error="form.fieldError('max_quantity_per_order')"
        >
          <input
            id="max_quantity_per_order"
            v-model="fields.max_quantity_per_order"
            class="input"
            type="number"
            min="1"
          />
        </FormField>
        <FormField
          label="Description"
          for="description"
          :error="form.fieldError('description')"
          class="sm:col-span-2"
        >
          <textarea id="description" v-model="fields.description" class="input" rows="4" />
        </FormField>
        <label class="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            v-model="fields.is_visible"
            type="checkbox"
            class="size-4 accent-brand-600"
            :disabled="!decided"
          />
          Visible sur le site
          <span v-if="!decided" class="text-xs text-muted">(après validation)</span>
        </label>

        <div
          v-if="!readOnly"
          class="flex flex-wrap gap-3 border-t border-stone-100 pt-5 sm:col-span-2"
        >
          <button class="btn-primary" type="submit" :disabled="form.processing.value">
            {{ isNew ? "Créer l'offre" : 'Enregistrer' }}
          </button>
          <button
            v-if="!isNew"
            type="button"
            class="btn-ghost text-red-700 hover:bg-red-50"
            @click="deleteListing"
          >
            <Trash2 class="size-4" /> Supprimer
          </button>
        </div>
      </fieldset>
    </form>

    <template v-if="listing">
      <!-- Events (set by the team) -->
      <section class="card p-0">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
          <h2 class="section-title flex items-center gap-2">
            <CalendarDays class="size-5 text-brand-600" /> Proposée aux événements
          </h2>
          <span v-if="isAdmin" class="text-xs text-muted">
            Commission effective {{ formatRate(listing.effective_commission_rate_bp) }} ·
            {{ LISTING_STATUS_LABELS[listing.status] }}
          </span>
        </div>
        <p v-if="!listing.proposals?.length" class="px-6 py-6 text-sm text-muted">
          {{
            isAdmin
              ? "Pas encore proposée à un événement. Ouvrez la fiche d'un événement puis « Proposer une offre » pour fixer un forfait."
              : "Pas encore proposée à un événement. L'équipe KiffUp propose les offres aux événements et fixe les forfaits."
          }}
        </p>
        <ul v-else class="mt-4 divide-y divide-stone-100">
          <li v-for="proposal in listing.proposals" :key="proposal.id">
            <component
              :is="isAdmin ? 'RouterLink' : 'div'"
              v-bind="
                isAdmin
                  ? { to: { name: 'admin.events.edit', params: { id: proposal.event_id } } }
                  : {}
              "
              class="group flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 transition"
              :class="{ 'hover:bg-brand-50/40': isAdmin }"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold">{{ proposal.event?.name }}</span>
                <span class="block text-sm text-muted">
                  {{ proposal.event ? formatShortDate(proposal.event.starts_at) : '' }}
                </span>
              </span>
              <span v-if="proposal.package" class="text-sm">
                Forfait <strong>{{ formatXof(proposal.package.customer_price) }}</strong> ·
                {{ proposal.package.available }}/{{ listing.units }} libres
              </span>
              <span v-else class="badge-neutral">Sans forfait</span>
              <span :class="proposal.is_active ? 'badge-success' : 'badge-neutral'">
                {{ proposal.is_active ? 'Active' : 'Retirée' }}
              </span>
              <ChevronRight
                v-if="isAdmin"
                class="size-4 text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-500"
              />
            </component>
          </li>
        </ul>
      </section>

      <!-- Photos -->
      <section class="card space-y-4 p-6">
        <h2 class="section-title">Photos ({{ listing.photos.length }}/10)</h2>
        <div v-if="photos.error.value || photos.fieldError('photo')" class="alert-error">
          {{ photos.fieldError('photo') ?? photos.error.value }}
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="(photo, index) in listing.photos"
            :key="photo.id"
            class="group relative overflow-hidden rounded-2xl shadow-card"
          >
            <img
              :src="photo.url"
              alt=""
              class="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span v-if="index === 0" class="chip absolute top-2 left-2 bg-white/90 text-ink"
              >Principale</span
            >
            <button
              v-if="!readOnly"
              class="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 text-red-700 opacity-90 transition hover:bg-red-600 hover:text-white"
              aria-label="Supprimer la photo"
              @click="deletePhoto(photo.id)"
            >
              <X class="size-4" />
            </button>
          </div>
          <label
            v-if="!readOnly && listing.photos.length < 10"
            class="grid aspect-[4/3] cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-stone-200 bg-surface text-stone-400 transition hover:border-brand-300 hover:text-brand-600"
          >
            <span class="flex flex-col items-center gap-1 text-xs font-medium">
              <ImagePlus class="size-7" />
              {{ photos.processing.value ? 'Envoi…' : 'Ajouter' }}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              @change="uploadPhoto"
            />
          </label>
        </div>
      </section>

      <p class="flex items-center gap-2 text-xs text-muted">
        <BadgePercent class="size-3.5" />
        {{
          isAdmin
            ? 'Les prix client affichés tiennent compte de la commission en vigueur.'
            : 'Le prix client comprend les frais de service KiffUp ; vous recevez le montant de réservation.'
        }}
      </p>
    </template>
  </div>
</template>

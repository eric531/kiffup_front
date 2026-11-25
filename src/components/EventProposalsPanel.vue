<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { addDays, formatStayRange, formatXof } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import FormField from '@/components/FormField.vue'
import {
  LISTING_TYPE_LABELS,
  type EventItem,
  type EventListing,
  type Listing,
} from '@/types/catalog'
import type { Paginated } from '@/types/identity'

/**
 * Back-office, event page: listings proposed to the event, with their optional event package
 * (single price for the event nights, the only tariff with dynamic markup).
 */
const props = defineProps<{ event: EventItem }>()

const proposals = ref<EventListing[]>([])
const candidates = ref<Listing[]>([])
const loading = ref(true)
const editing = ref<number | 'new' | null>(null)
const form = useForm()

const eventDay = computed(() => props.event.starts_at.slice(0, 10))
const lastEventDay = computed(() => (props.event.ends_at ?? props.event.starts_at).slice(0, 10))
const fields = reactive({
  listing_id: 0,
  with_package: true,
  partner_amount: '' as string | number,
  service_price: '' as string | number,
  starts_on: '',
  ends_on: '',
  distance_km: '' as string | number,
  is_active: true,
})

const optionalNumber = (value: string | number) => (value === '' ? null : Number(value))

async function load() {
  loading.value = true
  try {
    const [list, available] = await Promise.all([
      api.get<{ data: EventListing[] }>(`/api/v1/admin/events/${props.event.id}/listings`),
      api.get<Paginated<Listing>>('/api/v1/admin/listings', {
        not_in_event: props.event.id,
        per_page: 200,
      }),
    ])
    proposals.value = list.data
    candidates.value = available.data
  } finally {
    loading.value = false
  }
}
onMounted(load)

function startNew() {
  Object.assign(fields, {
    listing_id: candidates.value[0]?.id ?? 0,
    with_package: true,
    partner_amount: '',
    service_price: '',
    // Default: the event night(s), departure the day after the last event day.
    starts_on: eventDay.value,
    ends_on: addDays(lastEventDay.value, 1),
    distance_km: '',
    is_active: true,
  })
  form.error.value = null
  form.fieldErrors.value = {}
  editing.value = 'new'
}

function startEdit(proposal: EventListing) {
  Object.assign(fields, {
    listing_id: proposal.listing?.id ?? 0,
    with_package: proposal.package !== null,
    partner_amount: proposal.package?.partner_amount ?? '',
    service_price: proposal.service_price ?? '',
    starts_on: proposal.package?.starts_on ?? eventDay.value,
    ends_on: proposal.package?.ends_on ?? addDays(lastEventDay.value, 1),
    distance_km: proposal.distance_km ?? '',
    is_active: proposal.is_active,
  })
  editing.value = proposal.id
}

async function save() {
  const payload: Record<string, unknown> = {
    partner_amount: fields.with_package ? optionalNumber(fields.partner_amount) : null,
    service_price: fields.with_package ? optionalNumber(fields.service_price) : null,
    starts_on: fields.starts_on,
    ends_on: fields.ends_on,
    distance_km: optionalNumber(fields.distance_km),
    is_active: fields.is_active,
  }
  const result = await form.submit(() =>
    editing.value === 'new'
      ? api.post<{ data: EventListing }>(`/api/v1/admin/events/${props.event.id}/listings`, {
          ...payload,
          listing_id: fields.listing_id,
        })
      : api.patch<{ data: EventListing }>(`/api/v1/admin/event-listings/${editing.value}`, payload),
  )
  if (!result) return
  editing.value = null
  await load()
}

async function remove(proposal: EventListing) {
  if (!confirm(`Retirer « ${proposal.listing?.title} » de cet événement ?`)) return
  await api.delete(`/api/v1/admin/event-listings/${proposal.id}`)
  await load()
}
</script>

<template>
  <section class="card p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
      <div>
        <h2 class="section-title">Offres proposées ({{ proposals.length }})</h2>
        <p class="text-xs text-muted">
          Choisissez des offres existantes et fixez, si vous le souhaitez, un forfait pour les nuits
          de l'événement.
        </p>
      </div>
      <div class="flex gap-2">
        <RouterLink :to="{ name: 'admin.listings.create' }" class="btn-secondary">
          Créer une offre
        </RouterLink>
        <button class="btn-primary" :disabled="!candidates.length" @click="startNew">
          <Plus class="size-4" /> Proposer une offre
        </button>
      </div>
    </div>

    <!-- Form (new or edit) -->
    <form
      v-if="editing !== null"
      class="panel mx-6 mt-4 grid gap-4 sm:grid-cols-2"
      @submit.prevent="save"
    >
      <div class="flex items-center justify-between sm:col-span-2">
        <p class="font-semibold">
          {{ editing === 'new' ? 'Proposer une offre' : 'Modifier la proposition' }}
        </p>
        <button
          type="button"
          class="btn-ghost size-9 p-0"
          aria-label="Fermer"
          @click="editing = null"
        >
          <X class="size-4" />
        </button>
      </div>
      <div v-if="form.error.value" class="alert-error sm:col-span-2">{{ form.error.value }}</div>
      <FormField
        v-if="editing === 'new'"
        label="Offre"
        for="proposal_listing"
        :error="form.fieldError('listing_id')"
        class="sm:col-span-2"
      >
        <select id="proposal_listing" v-model.number="fields.listing_id" class="input" required>
          <option v-for="listing in candidates" :key="listing.id" :value="listing.id">
            {{ listing.title }} · {{ listing.partner?.name }} ({{ listing.units }} unité{{
              listing.units > 1 ? 's' : ''
            }})
          </option>
        </select>
      </FormField>
      <label class="flex items-center gap-2 text-sm sm:col-span-2">
        <input v-model="fields.with_package" type="checkbox" class="size-4 accent-brand-600" />
        Avec un forfait événement (prix unique pour les nuits ci-dessous, hausse dynamique
        appliquée)
      </label>
      <template v-if="fields.with_package">
        <FormField
          label="Montant de réservation du forfait (FCFA)"
          for="proposal_amount"
          :error="form.fieldError('partner_amount')"
          hint="Reçu en totalité par le partenaire, majoré selon les paliers."
        >
          <input
            id="proposal_amount"
            v-model="fields.partner_amount"
            class="input"
            type="number"
            min="100"
            step="100"
            required
          />
        </FormField>
        <FormField
          label="Prix du forfait chez le partenaire (FCFA)"
          for="proposal_service"
          :error="form.fieldError('service_price')"
          hint="Obligatoire si l'offre est déductible."
        >
          <input
            id="proposal_service"
            v-model="fields.service_price"
            class="input"
            type="number"
            min="100"
            step="100"
          />
        </FormField>
      </template>
      <FormField
        label="Arrivée (forfait)"
        for="proposal_starts"
        :error="form.fieldError('starts_on')"
      >
        <input id="proposal_starts" v-model="fields.starts_on" class="input" type="date" required />
      </FormField>
      <FormField label="Départ (forfait)" for="proposal_ends" :error="form.fieldError('ends_on')">
        <input id="proposal_ends" v-model="fields.ends_on" class="input" type="date" required />
      </FormField>
      <FormField
        label="Distance du lieu (km)"
        for="proposal_distance"
        :error="form.fieldError('distance_km')"
      >
        <input
          id="proposal_distance"
          v-model="fields.distance_km"
          class="input"
          type="number"
          min="0"
          step="0.1"
        />
      </FormField>
      <label class="flex items-center gap-2 self-end pb-3 text-sm">
        <input v-model="fields.is_active" type="checkbox" class="size-4 accent-brand-600" />
        Visible sur la page de l'événement
      </label>
      <div class="flex gap-2 sm:col-span-2">
        <button class="btn-primary" type="submit" :disabled="form.processing.value">
          Enregistrer
        </button>
        <button type="button" class="btn-ghost" @click="editing = null">Annuler</button>
      </div>
    </form>

    <div v-if="loading" class="space-y-2 p-6">
      <div v-for="n in 2" :key="n" class="skeleton h-14" />
    </div>
    <p v-else-if="proposals.length === 0" class="px-6 py-8 text-sm text-muted">
      Aucune offre proposée pour cet événement.
    </p>
    <ul v-else class="mt-4 divide-y divide-stone-100">
      <li
        v-for="proposal in proposals"
        :key="proposal.id"
        class="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5"
        :class="{ 'opacity-60': !proposal.is_active }"
      >
        <span
          class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"
        >
          <component
            :is="LISTING_TYPE_ICONS[proposal.listing!.type]"
            v-if="proposal.listing"
            class="size-5"
          />
        </span>
        <RouterLink
          :to="{ name: 'admin.listings.edit', params: { id: proposal.listing?.id } }"
          class="group min-w-0 flex-1"
        >
          <span class="block truncate font-semibold group-hover:text-brand-700">
            {{ proposal.listing?.title }}
            <ChevronRight class="inline size-3.5 text-stone-300" />
          </span>
          <span class="block text-sm text-muted">
            {{ proposal.listing ? LISTING_TYPE_LABELS[proposal.listing.type] : '' }} ·
            {{ proposal.listing?.partner?.name }}
            <template v-if="proposal.distance_km != null">
              · {{ proposal.distance_km }} km</template
            >
          </span>
        </RouterLink>
        <span v-if="proposal.package" class="text-right text-sm">
          <strong class="tabular-nums">{{ formatXof(proposal.package.customer_price) }}</strong>
          <span class="block text-xs text-muted">
            forfait {{ formatStayRange(proposal.package.starts_on, proposal.package.ends_on) }} ·
            {{ proposal.package.available }}/{{ proposal.listing?.units }} libres
          </span>
        </span>
        <span v-else class="badge-neutral">Tarifs nuit / jour seulement</span>
        <span :class="proposal.is_active ? 'badge-success' : 'badge-neutral'">
          {{ proposal.is_active ? 'Visible' : 'Masquée' }}
        </span>
        <span class="flex gap-1">
          <button class="btn-ghost size-9 p-0" aria-label="Modifier" @click="startEdit(proposal)">
            <Pencil class="size-4" />
          </button>
          <button
            class="btn-ghost size-9 p-0 text-red-700 hover:bg-red-50"
            aria-label="Retirer"
            @click="remove(proposal)"
          >
            <Trash2 class="size-4" />
          </button>
        </span>
      </li>
    </ul>
  </section>
</template>

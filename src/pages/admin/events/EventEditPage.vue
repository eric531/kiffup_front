<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { toDateTimeLocal } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import FormField from '@/components/FormField.vue'
import TierEditor from '@/components/TierEditor.vue'
import {
  EVENT_STATUS_LABELS,
  type EventItem,
  type EventStatus,
  type PricingTier,
} from '@/types/catalog'
import { CalendarDays, ExternalLink, ImagePlus, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import EventProposalsPanel from '@/components/EventProposalsPanel.vue'

const props = defineProps<{ id?: string }>()
const router = useRouter()

const isNew = computed(() => !props.id)
const event = ref<EventItem | null>(null)
const saved = ref(false)
const form = useForm()
const cover = useForm()

const fields = reactive({
  name: '',
  slug: '',
  artist: '',
  description: '',
  city: 'Abidjan',
  venue: '',
  address: '',
  starts_at: '',
  ends_at: '',
  booking_closes_at: '',
  status: 'draft' as EventStatus,
})

// Per-event overrides of the Super Admin settings (empty = global setting).
const rules = reactive({
  customTiers: false,
  tiers: [] as PricingTier[],
  cancellation_window_hours: '' as string | number,
  cancellation_cutoff_hours: '' as string | number,
  penalty_percent: '' as string | number,
})
const optionalInt = (value: string | number) => (value === '' ? null : Number(value))

function fill(data: EventItem) {
  event.value = data
  Object.assign(fields, {
    name: data.name,
    slug: data.slug,
    artist: data.artist ?? '',
    description: data.description ?? '',
    city: data.city,
    venue: data.venue,
    address: data.address ?? '',
    starts_at: toDateTimeLocal(data.starts_at),
    ends_at: toDateTimeLocal(data.ends_at),
    booking_closes_at: toDateTimeLocal(data.booking_closes_at),
    status: data.status,
  })
  Object.assign(rules, {
    customTiers: data.pricing_tiers != null,
    tiers: structuredClone(data.pricing_tiers ?? data.effective_pricing_tiers ?? []),
    cancellation_window_hours: data.cancellation_window_hours ?? '',
    cancellation_cutoff_hours: data.cancellation_cutoff_hours ?? '',
    penalty_percent: data.cancellation_penalty_bp == null ? '' : data.cancellation_penalty_bp / 100,
  })
}

async function load() {
  if (!props.id) return
  fill((await api.get<{ data: EventItem }>(`/api/v1/admin/events/${props.id}`)).data)
}

async function save() {
  saved.value = false
  const payload = {
    ...fields,
    slug: fields.slug || undefined,
    artist: fields.artist || null,
    description: fields.description || null,
    address: fields.address || null,
    ends_at: fields.ends_at || null,
    booking_closes_at: fields.booking_closes_at || null,
    pricing_tiers: rules.customTiers ? rules.tiers : null,
    cancellation_window_hours: optionalInt(rules.cancellation_window_hours),
    cancellation_cutoff_hours: optionalInt(rules.cancellation_cutoff_hours),
    cancellation_penalty_bp:
      rules.penalty_percent === '' ? null : Math.round(Number(rules.penalty_percent) * 100),
  }
  const result = await form.submit(() =>
    isNew.value
      ? api.post<{ data: EventItem }>('/api/v1/admin/events', payload)
      : api.patch<{ data: EventItem }>(`/api/v1/admin/events/${props.id}`, payload),
  )
  if (!result) return
  if (isNew.value) {
    await router.replace({ name: 'admin.events.edit', params: { id: result.data.id } })
  } else {
    fill(result.data)
    saved.value = true
  }
}

async function uploadCover(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !props.id) return
  const data = new FormData()
  data.append('cover', file)
  const result = await cover.submit(() =>
    api.post<{ data: EventItem }>(`/api/v1/admin/events/${props.id}/cover`, data),
  )
  if (result) event.value = result.data
}

async function removeCover() {
  const result = await cover.submit(() =>
    api.delete<{ data: EventItem }>(`/api/v1/admin/events/${props.id}/cover`),
  )
  if (result) event.value = result.data
}

async function deleteEvent() {
  if (!confirm('Supprimer définitivement ce brouillon ?')) return
  const done = await form.submit(async () => {
    await api.delete(`/api/v1/admin/events/${props.id}`)
    return true
  })
  if (done) await router.replace({ name: 'admin.events' })
}

watch(() => props.id, load, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="isNew ? 'Nouvel événement' : fields.name"
      :icon="CalendarDays"
      :back="{ to: { name: 'admin.events' }, label: 'Événements' }"
    >
      <template #actions>
        <a
          v-if="event && event.status !== 'draft'"
          :href="`/${event.slug}`"
          target="_blank"
          rel="noopener"
          class="btn-secondary"
        >
          Voir la page publique <ExternalLink class="size-4" />
        </a>
      </template>
    </PageHeader>

    <form class="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" @submit.prevent="save">
      <div v-if="form.error.value" class="alert-error sm:col-span-2">{{ form.error.value }}</div>
      <div v-if="saved" class="alert-success sm:col-span-2">Modifications enregistrées.</div>

      <FormField
        label="Nom de l'événement"
        for="name"
        :error="form.fieldError('name')"
        class="sm:col-span-2"
      >
        <input id="name" v-model="fields.name" class="input" required />
      </FormField>
      <FormField
        label="Lien de la page"
        for="slug"
        :error="form.fieldError('slug')"
        :hint="`kiffup.com/${fields.slug || 'genere-depuis-le-nom'}`"
      >
        <input id="slug" v-model="fields.slug" class="input" placeholder="imra" />
      </FormField>
      <FormField label="Artiste" for="artist" :error="form.fieldError('artist')">
        <input id="artist" v-model="fields.artist" class="input" />
      </FormField>
      <FormField
        label="Date et heure de début"
        for="starts_at"
        :error="form.fieldError('starts_at')"
      >
        <input
          id="starts_at"
          v-model="fields.starts_at"
          class="input"
          type="datetime-local"
          required
        />
      </FormField>
      <FormField label="Fin (optionnel)" for="ends_at" :error="form.fieldError('ends_at')">
        <input id="ends_at" v-model="fields.ends_at" class="input" type="datetime-local" />
      </FormField>
      <FormField
        label="Fermeture des réservations"
        for="booking_closes_at"
        :error="form.fieldError('booking_closes_at')"
        hint="Par défaut : au début de l'événement."
      >
        <input
          id="booking_closes_at"
          v-model="fields.booking_closes_at"
          class="input"
          type="datetime-local"
        />
      </FormField>
      <FormField label="Statut" for="status" :error="form.fieldError('status')">
        <select id="status" v-model="fields.status" class="input">
          <option v-for="(label, value) in EVENT_STATUS_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </FormField>
      <FormField label="Ville" for="city" :error="form.fieldError('city')">
        <input id="city" v-model="fields.city" class="input" required />
      </FormField>
      <FormField label="Lieu" for="venue" :error="form.fieldError('venue')">
        <input
          id="venue"
          v-model="fields.venue"
          class="input"
          placeholder="Palais de la Culture"
          required
        />
      </FormField>
      <FormField
        label="Adresse"
        for="address"
        :error="form.fieldError('address')"
        class="sm:col-span-2"
      >
        <input id="address" v-model="fields.address" class="input" />
      </FormField>
      <FormField
        label="Description"
        for="description"
        :error="form.fieldError('description')"
        class="sm:col-span-2"
      >
        <textarea id="description" v-model="fields.description" class="input" rows="4" />
      </FormField>

      <details
        class="group rounded-2xl border border-stone-200 bg-surface p-5 sm:col-span-2"
        :open="rules.customTiers"
      >
        <summary class="cursor-pointer font-display font-bold">
          Règles spécifiques à l'événement (optionnel)
        </summary>
        <p class="mt-2 text-xs text-muted">
          Laissez vide pour appliquer les paramètres généraux définis par le Super Admin.
        </p>

        <div class="mt-4 space-y-3">
          <label class="flex items-center gap-2 text-sm">
            <input v-model="rules.customTiers" type="checkbox" class="size-4 accent-brand-600" />
            Paliers de prix propres à cet événement
          </label>
          <TierEditor
            v-if="rules.customTiers"
            v-model="rules.tiers"
            :error="form.fieldErrors.value.pricing_tiers"
          />
          <p v-else-if="event?.effective_pricing_tiers" class="text-sm text-muted">
            Paliers généraux :
            {{
              event.effective_pricing_tiers
                .map(
                  (t) =>
                    `J-${t.days_before} ${t.markup_bp === null ? 'fermé' : `+${t.markup_bp / 100} %`}`,
                )
                .join(' · ') || 'aucun'
            }}
          </p>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <FormField
            label="Délai d'annulation (h)"
            for="cancellation_window_hours"
            :error="form.fieldError('cancellation_window_hours')"
            hint="Après la réservation."
          >
            <input
              id="cancellation_window_hours"
              v-model="rules.cancellation_window_hours"
              class="input"
              type="number"
              min="0"
            />
          </FormField>
          <FormField
            label="Plus d'annulation avant (h)"
            for="cancellation_cutoff_hours"
            :error="form.fieldError('cancellation_cutoff_hours')"
            hint="Avant le début de l'événement."
          >
            <input
              id="cancellation_cutoff_hours"
              v-model="rules.cancellation_cutoff_hours"
              class="input"
              type="number"
              min="0"
            />
          </FormField>
          <FormField
            label="Pénalité (%)"
            for="penalty"
            :error="form.fieldError('cancellation_penalty_bp')"
          >
            <input
              id="penalty"
              v-model="rules.penalty_percent"
              class="input"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
          </FormField>
        </div>
      </details>

      <div class="flex flex-wrap gap-3 border-t border-stone-100 pt-5 sm:col-span-2">
        <button class="btn-primary" type="submit" :disabled="form.processing.value">
          {{ isNew ? "Créer l'événement" : 'Enregistrer' }}
        </button>
        <button
          v-if="event?.status === 'draft'"
          type="button"
          class="btn-ghost text-red-700 hover:bg-red-50"
          @click="deleteEvent"
        >
          <Trash2 class="size-4" /> Supprimer le brouillon
        </button>
      </div>
    </form>

    <template v-if="event">
      <!-- Cover -->
      <section class="card space-y-4 p-6">
        <h2 class="section-title">Visuel</h2>
        <div v-if="cover.error.value || cover.fieldError('cover')" class="alert-error">
          {{ cover.fieldError('cover') ?? cover.error.value }}
        </div>
        <img
          v-if="event.cover_url"
          :src="event.cover_url"
          alt=""
          class="aspect-[16/9] w-full max-w-lg rounded-2xl object-cover shadow-card"
        />
        <div
          v-else
          class="grid aspect-[16/9] w-full max-w-lg place-items-center rounded-2xl border-2 border-dashed border-stone-200 bg-surface text-stone-400"
        >
          <ImagePlus class="size-10" />
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <label class="btn-secondary cursor-pointer">
            <ImagePlus class="size-4" />
            {{
              cover.processing.value
                ? 'Envoi…'
                : event.cover_url
                  ? 'Remplacer'
                  : 'Ajouter un visuel'
            }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              @change="uploadCover"
            />
          </label>
          <button v-if="event.cover_url" class="btn-ghost" @click="removeCover">Retirer</button>
          <span class="text-xs text-muted">JPEG, PNG ou WebP, 600 px de large minimum.</span>
        </div>
      </section>

      <!-- Listings proposed to the event (packages) -->
      <EventProposalsPanel :event="event" />
    </template>
  </div>
</template>

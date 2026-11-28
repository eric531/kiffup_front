<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileText, Inbox, Mail, MapPin, Phone, UserPlus } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import { api, ApiError } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import { PARTNER_TYPE_LABELS, type PartnerType } from '@/types/catalog'

/**
 * "Devenir partenaire" requests (V3, P10): short requests (establishment, activity, name, phone).
 * The team calls back, then accepts in one click (partner record and login created, password chosen
 * through WhatsApp) or refuses. The partner sends its documents from "Ma fiche" (RG38).
 */
type RequestStatus = 'new' | 'accepted' | 'refused'
interface PartnerRequest {
  id: number
  business_name: string
  category: PartnerType
  contact_name: string
  phone: string
  email: string | null
  city: string | null
  address: string | null
  message: string | null
  documents: { index: number; name: string; mime: string; size: number }[]
  status: RequestStatus
  note: string | null
  handled_at: string | null
  created_at: string | null
}

const route = useRoute()
const router = useRouter()
const TABS: { status: RequestStatus; label: string }[] = [
  { status: 'new', label: 'Nouvelles' },
  { status: 'accepted', label: 'Acceptées' },
  { status: 'refused', label: 'Refusées' },
]
const status = computed<RequestStatus>(() =>
  TABS.some((t) => t.status === route.query.statut) ? (route.query.statut as RequestStatus) : 'new',
)
const requests = ref<PartnerRequest[]>([])
const newCount = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)
const refusing = ref<number | null>(null)
const note = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get<{ data: PartnerRequest[]; meta: { new_count: number } }>(
      '/api/v1/admin/partner-requests',
      { status: status.value },
    )
    requests.value = response.data
    newCount.value = response.meta.new_count
  } catch {
    error.value = 'Impossible de charger les demandes.'
  } finally {
    loading.value = false
  }
}

const accepting = ref<number | null>(null)

/** One click: the partner record and its login are created; the partner gets a WhatsApp message. */
async function accept(request: PartnerRequest) {
  error.value = null
  accepting.value = request.id
  try {
    const { data } = await api.post<{ data: { id: number } }>(
      `/api/v1/admin/partner-requests/${request.id}/accept`,
    )
    await router.push({ name: 'admin.partners.edit', params: { id: data.id } })
  } catch (e) {
    error.value =
      e instanceof ApiError
        ? (Object.values(e.errors)[0]?.[0] ?? e.detail ?? e.message)
        : 'Action impossible.'
  } finally {
    accepting.value = null
  }
}

async function refuse(request: PartnerRequest) {
  error.value = null
  try {
    await api.patch(`/api/v1/admin/partner-requests/${request.id}`, {
      status: 'refused',
      note: note.value || null,
    })
    refusing.value = null
    note.value = ''
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? (e.detail ?? e.message) : 'Action impossible.'
  }
}

const documentUrl = (request: PartnerRequest, index: number) =>
  `${import.meta.env.VITE_API_URL ?? ''}/api/v1/admin/partner-requests/${request.id}/documents/${index}`

watch(status, load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Demandes de partenariat"
      subtitle="Établissements uniquement : appelez le gérant avant d’accepter. Il recevra un message WhatsApp pour choisir son mot de passe, puis complétera sa fiche et enverra ses pièces depuis son espace."
      :icon="UserPlus"
    />

    <div class="tabs">
      <button
        v-for="t in TABS"
        :key="t.status"
        type="button"
        class="tab"
        :class="{ 'tab-active': status === t.status }"
        @click="router.replace({ query: { statut: t.status } })"
      >
        {{ t.label }}
        <span
          v-if="t.status === 'new' && newCount"
          class="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white"
        >
          {{ newCount }}
        </span>
      </button>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <ListSkeleton v-if="loading" :rows="3" />
    <EmptyState v-else-if="requests.length === 0" :icon="Inbox" title="Aucune demande" />

    <article v-for="request in requests" v-else :key="request.id" class="card space-y-3 p-5">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="font-display text-lg font-semibold">{{ request.business_name }}</p>
          <p class="text-sm text-muted">
            {{ PARTNER_TYPE_LABELS[request.category] }} · {{ request.contact_name }}
            <template v-if="request.created_at">
              · reçue le {{ formatShortDate(request.created_at) }}</template
            >
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
        <a :href="`tel:${request.phone}`" class="inline-flex items-center gap-1.5"
          ><Phone class="size-4" /> {{ request.phone }}</a
        >
        <a
          v-if="request.email"
          :href="`mailto:${request.email}`"
          class="inline-flex items-center gap-1.5"
        >
          <Mail class="size-4" /> {{ request.email }}
        </a>
        <span v-if="request.city" class="inline-flex items-center gap-1.5">
          <MapPin class="size-4" /> {{ request.address ? `${request.address}, ` : ''
          }}{{ request.city }}
        </span>
      </div>
      <p v-if="request.message" class="text-sm whitespace-pre-line">{{ request.message }}</p>
      <!-- Older requests only: documents are now sent from "Ma fiche". -->
      <div v-if="request.documents.length" class="flex flex-wrap gap-2">
        <a
          v-for="doc in request.documents"
          :key="doc.index"
          :href="documentUrl(request, doc.index)"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm hover:border-stone-400"
        >
          <FileText class="size-4" /> {{ doc.name }}
        </a>
      </div>
      <p v-if="request.note" class="text-sm text-muted">Note : {{ request.note }}</p>

      <div v-if="request.status === 'new'">
        <div v-if="refusing === request.id" class="panel">
          <textarea
            v-model="note"
            class="input min-h-16"
            placeholder="Motif (pour l’équipe, facultatif)"
          />
          <div class="flex gap-2">
            <button type="button" class="btn-danger px-4 py-2 text-sm" @click="refuse(request)">
              Refuser la demande
            </button>
            <button type="button" class="btn-ghost px-4 py-2 text-sm" @click="refusing = null">
              Annuler
            </button>
          </div>
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-primary px-4 py-2 text-sm"
            :disabled="accepting !== null"
            @click="accept(request)"
          >
            {{ accepting === request.id ? 'Création…' : 'Accepter et créer le compte' }}
          </button>
          <button
            type="button"
            class="btn-ghost px-4 py-2 text-sm text-red-700"
            @click="refusing = request.id"
          >
            Refuser
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

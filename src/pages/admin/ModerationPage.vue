<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Clapperboard, Flag, X } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import { api, ApiError } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import { PARTNER_TYPE_LABELS } from '@/types/catalog'
import {
  CONTACT_BUTTON_LABELS,
  REPORT_REASONS,
  VIDEO_STATUS_LABELS,
  type ManagedVideo,
  type VideoStatus,
} from '@/types/discovery'

/** Video review (RG36) and reported videos (RG37): publish, refuse with a reason, put back. */
interface Page {
  data: ManagedVideo[]
  meta: {
    current_page: number
    last_page: number
    total: number
    counts: { pending_review: number; hidden: number }
  }
}

const route = useRoute()
const router = useRouter()
const TABS: { status: VideoStatus; label: string }[] = [
  { status: 'pending_review', label: 'À valider' },
  { status: 'hidden', label: 'Signalées' },
  { status: 'published', label: 'En ligne' },
  { status: 'rejected', label: 'Refusées' },
]
const status = computed<VideoStatus>(() => {
  const asked = route.query.statut
  return TABS.some((t) => t.status === asked) ? (asked as VideoStatus) : 'pending_review'
})

const page = ref<Page | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const rejecting = ref<number | null>(null)
const reason = ref('')
const actionError = ref<string | null>(null)
const busy = ref<number | null>(null)

const REASON_PRESETS = [
  'La vidéo ne montre pas le lieu ou ses prestations.',
  'Contenu suggestif : contraire à la charte KiffUp.',
  'Image ou son de trop mauvaise qualité.',
  'Coordonnées ou publicité pour un autre service.',
]

async function load(p = 1) {
  loading.value = true
  error.value = null
  try {
    page.value = await api.get<Page>('/api/v1/admin/discovery/videos', {
      status: status.value,
      page: p,
    })
  } catch {
    error.value = 'Impossible de charger les vidéos.'
  } finally {
    loading.value = false
  }
}

async function approve(video: ManagedVideo) {
  busy.value = video.id
  actionError.value = null
  try {
    await api.post(`/api/v1/admin/discovery/videos/${video.id}/approve`)
    await load(page.value?.meta.current_page ?? 1)
  } catch (e) {
    actionError.value = e instanceof ApiError ? (e.detail ?? e.message) : 'Action impossible.'
  } finally {
    busy.value = null
  }
}

async function reject(video: ManagedVideo) {
  busy.value = video.id
  actionError.value = null
  try {
    await api.post(`/api/v1/admin/discovery/videos/${video.id}/reject`, { reason: reason.value })
    rejecting.value = null
    reason.value = ''
    await load(page.value?.meta.current_page ?? 1)
  } catch (e) {
    actionError.value =
      e instanceof ApiError ? (e.errors.reason?.[0] ?? e.detail ?? e.message) : 'Action impossible.'
  } finally {
    busy.value = null
  }
}

const buttonsLabel = (video: ManagedVideo) =>
  video.contact_buttons.map((button) => CONTACT_BUTTON_LABELS[button]).join(', ') || 'aucun'

watch(status, () => load())
onMounted(() => load())
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Modération des vidéos"
      subtitle="Chaque vidéo est vérifiée avant d’apparaître dans Découvrir. Charte : le lieu et ses prestations, jamais de contenu suggestif."
      :icon="Clapperboard"
    />

    <div class="tabs max-w-full overflow-x-auto">
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
          v-if="t.status === 'pending_review' && page?.meta.counts.pending_review"
          class="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white"
          >{{ page.meta.counts.pending_review }}</span
        >
        <span
          v-if="t.status === 'hidden' && page?.meta.counts.hidden"
          class="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white"
          >{{ page.meta.counts.hidden }}</span
        >
      </button>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <div v-if="actionError" class="alert-error">{{ actionError }}</div>
    <ListSkeleton v-if="loading" :rows="2" />
    <EmptyState
      v-else-if="page && page.data.length === 0"
      :icon="Clapperboard"
      :title="status === 'pending_review' ? 'Aucune vidéo à valider' : 'Aucune vidéo'"
    />

    <div v-else-if="page" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="video in page.data" :key="video.id" class="card space-y-3 p-4">
        <video
          v-if="video.video_url"
          :src="video.video_url"
          :poster="video.cover_url ?? undefined"
          class="mx-auto aspect-[9/16] max-h-[28rem] w-full rounded-2xl bg-black object-contain"
          controls
          playsinline
          preload="metadata"
        />
        <div class="space-y-1">
          <p class="font-display font-semibold">{{ video.partner?.name }}</p>
          <p class="text-xs text-muted">
            {{ video.city }} · {{ PARTNER_TYPE_LABELS[video.category] }} ·
            {{ video.partner?.profile === 'showcase' ? 'Vitrine' : 'Réservable' }}
            <template v-if="video.created_at"> · {{ formatShortDate(video.created_at) }}</template>
            <template v-if="video.duration_ms">
              · {{ Math.round(video.duration_ms / 1000) }} s</template
            >
          </p>
          <p class="text-sm">{{ video.caption ?? 'Sans texte' }}</p>
          <p class="text-xs text-muted">
            Boutons :
            {{ buttonsLabel(video) }}
          </p>
        </div>

        <div v-if="video.report_reasons && Object.keys(video.report_reasons).length" class="panel">
          <p class="flex items-center gap-1.5 text-sm font-semibold text-red-700">
            <Flag class="size-4" /> Signalements
          </p>
          <p v-for="(count, key) in video.report_reasons" :key="key" class="text-sm">
            {{ REPORT_REASONS[key] ?? key }} : {{ count }}
          </p>
        </div>
        <p
          v-if="video.status === 'rejected' && video.rejection_reason"
          class="text-sm text-red-700"
        >
          Refusée : {{ video.rejection_reason }}
        </p>

        <div v-if="rejecting === video.id" class="panel">
          <p class="text-sm font-semibold">Motif envoyé au partenaire</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in REASON_PRESETS"
              :key="preset"
              type="button"
              class="rounded-full border border-stone-200 px-3 py-1 text-xs"
              @click="reason = preset"
            >
              {{ preset }}
            </button>
          </div>
          <textarea v-model="reason" class="input min-h-20" maxlength="500" />
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-danger px-4 py-2 text-sm"
              :disabled="busy === video.id"
              @click="reject(video)"
            >
              Refuser
            </button>
            <button type="button" class="btn-ghost px-4 py-2 text-sm" @click="rejecting = null">
              Annuler
            </button>
          </div>
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-if="video.status !== 'published'"
            type="button"
            class="btn-primary px-4 py-2 text-sm"
            :disabled="busy === video.id"
            @click="approve(video)"
          >
            <Check class="size-4" />
            {{ video.status === 'pending_review' ? 'Publier' : 'Remettre en ligne' }}
          </button>
          <button
            v-if="video.status !== 'rejected'"
            type="button"
            class="btn-ghost px-4 py-2 text-sm text-red-700"
            @click="rejecting = video.id"
          >
            <X class="size-4" /> {{ video.status === 'published' ? 'Retirer' : 'Refuser' }}
          </button>
          <span class="chip bg-stone-100 text-stone-600">{{
            VIDEO_STATUS_LABELS[video.status]
          }}</span>
        </div>
      </article>
    </div>

    <div v-if="page && page.meta.last_page > 1" class="flex justify-center gap-2">
      <button
        v-for="n in page.meta.last_page"
        :key="n"
        type="button"
        class="tab"
        :class="{ 'tab-active': n === page.meta.current_page }"
        @click="load(n)"
      >
        {{ n }}
      </button>
    </div>
  </div>
</template>

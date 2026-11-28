<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeCheck,
  Clapperboard,
  Crown,
  Eye,
  Heart,
  MessageCircle,
  MousePointerClick,
  Pencil,
  Receipt,
  Rocket,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import PartnerProfileChecklist from '@/components/PartnerProfileChecklist.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import FormField from '@/components/FormField.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import { api, ApiError, upload } from '@/lib/api'
import { formatEventDate, formatShortDate, formatXof } from '@/lib/format'
import { usePartnerProfile } from '@/composables/usePartnerProfile'
import type { Listing } from '@/types/catalog'
import {
  BOOST_PLAN_LABELS,
  CONTACT_BUTTON_LABELS,
  VIDEO_STATUS_LABELS,
  type BoostPlan,
  type ContactButton,
  type ManagedVideo,
  type Promotions,
  type Purchase,
  type PurchaseStatus,
  type VideoStatus,
} from '@/types/discovery'

/** "Mes vidéos" (V3): publish 30-second videos in "Découvrir", follow their review and stats. */
interface Limits {
  max_duration_seconds: number
  max_upload_mb: number
  max_videos: number
}

const route = useRoute()
const router = useRouter()
const { partner, load: loadProfile } = usePartnerProfile()
const videos = ref<ManagedVideo[]>([])
const limits = ref<Limits>({ max_duration_seconds: 30, max_upload_mb: 100, max_videos: 0 })
const listings = ref<Listing[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const STATUS_STYLES: Record<VideoStatus, string> = {
  processing: 'bg-sky-50 text-sky-700',
  pending_review: 'bg-amber-50 text-amber-800',
  published: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  hidden: 'bg-red-50 text-red-700',
  failed: 'bg-stone-100 text-stone-600',
}
const BUTTONS = Object.keys(CONTACT_BUTTON_LABELS) as ContactButton[]

async function load() {
  loading.value = true
  loadError.value = null
  loadProfile()
  loadPromotions()
  try {
    const response = await api.get<{ data: ManagedVideo[]; meta: Limits }>('/api/v1/partner/videos')
    videos.value = response.data
    limits.value = response.meta
    pollProcessing()
  } catch {
    loadError.value = 'Impossible de charger vos vidéos.'
  } finally {
    loading.value = false
  }
}

// A Réservable partner can link a video to one of its listings ("Voir l'offre / Réserver").
// Follows the profile whenever it arrives (also loaded by the partner layout).
watch(
  () => partner.value?.profile,
  async (profile) => {
    if (profile !== 'bookable' || listings.value.length) return
    try {
      listings.value = (await api.get<{ data: Listing[] }>('/api/v1/partner/listings')).data
    } catch {
      listings.value = []
    }
  },
  { immediate: true },
)

// ─── Upload: duration and size checked in the browser first (the server checks again).
const file = ref<File | null>(null)
const preview = ref<string | null>(null)
const durationMs = ref<number | null>(null)
const fileError = ref<string | null>(null)
const form = reactive({ caption: '', listing_id: '' as number | '', contact_buttons: [...BUTTONS] })
const progress = ref<number | null>(null)
const uploadError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})
const uploaded = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function pickFile(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0] ?? null
  clearFile()
  if (!picked) return
  if (picked.size > limits.value.max_upload_mb * 1024 * 1024) {
    fileError.value = `Fichier trop lourd (${Math.round(picked.size / 1024 / 1024)} Mo) : ${limits.value.max_upload_mb} Mo au plus.`
    return
  }
  file.value = picked
  preview.value = URL.createObjectURL(picked)
}
function onMetadata(event: Event) {
  const el = event.target as HTMLVideoElement
  const seconds = el.duration
  if (!Number.isFinite(seconds)) {
    // Videos recorded by a browser (WebM) often announce no duration: seeking far away makes it
    // read the real one, then the preview goes back to the start.
    const measured = () => {
      if (!Number.isFinite(el.duration)) return
      el.removeEventListener('durationchange', measured)
      el.currentTime = 0
      onMetadata(event)
    }
    el.addEventListener('durationchange', measured)
    el.currentTime = Number.MAX_SAFE_INTEGER
    return
  }
  durationMs.value = Math.round(seconds * 1000)
  if (seconds > limits.value.max_duration_seconds + 0.5) {
    fileError.value = `Votre vidéo dure ${Math.round(seconds)} s : ${limits.value.max_duration_seconds} s au plus. Raccourcissez-la avec l’éditeur de votre téléphone.`
  } else if (seconds < 3) {
    fileError.value = 'Votre vidéo est trop courte : 3 secondes au moins.'
  }
}
function clearFile() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  file.value = null
  preview.value = null
  durationMs.value = null
  fileError.value = null
  uploaded.value = false
}

async function send() {
  if (!file.value || fileError.value) return
  const data = new FormData()
  data.append('video', file.value)
  data.append('caption', form.caption)
  if (form.listing_id !== '') data.append('listing_id', String(form.listing_id))
  form.contact_buttons.forEach((b) => data.append('contact_buttons[]', b))
  if (durationMs.value !== null) data.append('duration_ms', String(durationMs.value))

  uploadError.value = null
  fieldErrors.value = {}
  progress.value = 0
  try {
    const response = await upload<{ data: ManagedVideo }>('/api/v1/partner/videos', data, (p) => {
      progress.value = p
    })
    videos.value = [response.data, ...videos.value]
    form.caption = ''
    form.listing_id = ''
    clearFile()
    if (fileInput.value) fileInput.value.value = ''
    uploaded.value = true
    pollProcessing()
  } catch (e) {
    if (e instanceof ApiError) {
      fieldErrors.value = e.errors
      uploadError.value = e.type === 'validation-error' ? null : (e.detail ?? e.message)
    } else {
      uploadError.value = 'Envoi impossible.'
    }
  } finally {
    progress.value = null
  }
}

// ─── Boosts (RG41) and Vitrine subscription (RG42), paid with Mobile Money
const promotions = ref<Promotions | null>(null)
async function loadPromotions() {
  try {
    promotions.value = (await api.get<{ data: Promotions }>('/api/v1/partner/promotions')).data
  } catch {
    promotions.value = null
  }
}
const subscription = computed(() => promotions.value?.subscription ?? null)
const canBoost = computed(
  () => !!promotions.value?.boost_plans.length && (subscription.value?.covered ?? true),
)

const boosting = ref<number | null>(null)
const subscribing = ref(false)
const plan = ref<BoostPlan['plan'] | ''>('')
const paymentMethod = ref('')
const paymentMethodRequired = ref(false)
const payError = ref<string | null>(null)
const paying = ref(false)
const selectedPlan = computed(() =>
  promotions.value?.boost_plans.find((p) => p.plan === plan.value),
)

function startBoost(video: ManagedVideo) {
  editing.value = null
  subscribing.value = false
  payError.value = null
  boosting.value = video.id
  plan.value = promotions.value?.boost_plans[0]?.plan ?? ''
}
function startSubscription() {
  boosting.value = null
  payError.value = null
  subscribing.value = true
}

/** Creates the purchase and goes to the provider's page; back on this page with ?achat=. */
async function pay(path: string, body: Record<string, unknown> = {}) {
  payError.value = null
  if (paymentMethodRequired.value && !paymentMethod.value) {
    payError.value = 'Choisissez votre moyen de paiement.'
    return
  }
  paying.value = true
  try {
    const response = await api.post<{ data: Purchase & { payment_url: string } }>(path, {
      ...body,
      payment_method: paymentMethod.value || undefined,
    })
    window.location.assign(response.data.payment_url)
  } catch (e) {
    payError.value =
      e instanceof ApiError
        ? (Object.values(e.errors)[0]?.[0] ?? e.detail ?? e.message)
        : 'Paiement impossible.'
    paying.value = false
  }
}

// Back from the payment page: the confirmation (provider webhook) can take a few seconds.
const returned = ref<Purchase | null>(null)
const returnTimedOut = ref(false)
let returnTimer: ReturnType<typeof setTimeout> | undefined
async function followPurchase(id: number, attempt = 0) {
  try {
    const purchase = (await api.get<{ data: Purchase }>(`/api/v1/partner/promotions/${id}`)).data
    returned.value = purchase
    if (purchase.status === 'pending') {
      if (attempt < 20) returnTimer = setTimeout(() => followPurchase(id, attempt + 1), 3000)
      else returnTimedOut.value = true
      return
    }
    if (purchase.status === 'paid') load()
  } catch {
    // Unknown purchase: nothing to show.
  }
}

const PURCHASE_STYLES: Record<PurchaseStatus, string> = {
  pending: 'bg-amber-50 text-amber-800',
  paid: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-stone-100 text-stone-600',
}
const PURCHASE_LABELS: Record<PurchaseStatus, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Non abouti',
}
const purchaseLabel = (p: Purchase) =>
  p.kind === 'boost'
    ? `Boost ${p.plan ? BOOST_PLAN_LABELS[p.plan] : `${p.days} j`}${p.video_id ? ` · vidéo n° ${p.video_id}` : ''}`
    : p.kind === 'spotlight'
      ? `À la une${p.video_id ? ` · vidéo n° ${p.video_id}` : ''}`
      : `Abonnement Vitrine · ${p.days} jours`

// Server processing (compression) takes a few seconds: the status refreshes by itself.
let pollTimer: ReturnType<typeof setTimeout> | undefined
function pollProcessing() {
  clearTimeout(pollTimer)
  if (!videos.value.some((v) => v.status === 'processing')) return
  pollTimer = setTimeout(async () => {
    try {
      const response = await api.get<{ data: ManagedVideo[]; meta: Limits }>(
        '/api/v1/partner/videos',
      )
      videos.value = response.data
    } finally {
      pollProcessing()
    }
  }, 4000)
}
onBeforeUnmount(() => {
  clearTimeout(pollTimer)
  clearTimeout(returnTimer)
  clearFile()
})

// ─── Edit / delete
const editing = ref<number | null>(null)
const edit = reactive({
  caption: '',
  listing_id: '' as number | '',
  contact_buttons: [] as ContactButton[],
})
const editError = ref<string | null>(null)
function startEdit(video: ManagedVideo) {
  boosting.value = null
  editing.value = video.id
  editError.value = null
  edit.caption = video.caption ?? ''
  edit.listing_id = video.listing_id ?? ''
  edit.contact_buttons = [...video.contact_buttons]
}
async function saveEdit(video: ManagedVideo) {
  editError.value = null
  try {
    const response = await api.patch<{ data: ManagedVideo }>(`/api/v1/partner/videos/${video.id}`, {
      caption: edit.caption,
      listing_id: edit.listing_id === '' ? null : edit.listing_id,
      contact_buttons: edit.contact_buttons,
    })
    videos.value = videos.value.map((v) => (v.id === video.id ? response.data : v))
    editing.value = null
  } catch (e) {
    editError.value =
      e instanceof ApiError
        ? (Object.values(e.errors)[0]?.[0] ?? e.message)
        : 'Enregistrement impossible.'
  }
}
async function remove(video: ManagedVideo) {
  if (!window.confirm('Supprimer définitivement cette vidéo ?')) return
  await api.delete(`/api/v1/partner/videos/${video.id}`)
  videos.value = videos.value.filter((v) => v.id !== video.id)
}

const counted = computed(
  () => videos.value.filter((v) => !['failed', 'rejected'].includes(v.status)).length,
)
const limitReached = computed(
  () => limits.value.max_videos > 0 && counted.value >= limits.value.max_videos,
)
const listingTitle = (id: number | null) => listings.value.find((l) => l.id === id)?.title

onMounted(() => {
  load()
  const purchase = Number(route.query.achat)
  if (purchase > 0) {
    followPurchase(purchase)
    router.replace({ query: { ...route.query, achat: undefined } })
  }
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Mes vidéos"
      :subtitle="
        partner?.profile === 'showcase'
          ? 'Montrez votre lieu en 30 secondes : après validation par l’équipe KiffUp, vos vidéos apparaissent dans Vitrine, l’espace de Découvrir réservé aux clients connectés.'
          : 'Montrez votre lieu en 30 secondes : vos vidéos apparaissent dans Découvrir après validation par l’équipe KiffUp.'
      "
      :icon="Clapperboard"
    />

    <PartnerProfileChecklist v-if="partner" :partner="partner" />
    <div v-if="loadError" class="alert-error">{{ loadError }}</div>

    <!-- Back from the payment page -->
    <template v-if="returned">
      <div v-if="returned.status === 'paid'" class="alert-success">
        <template v-if="returned.kind === 'boost'">
          Boost activé : votre vidéo passe en tête de Découvrir jusqu’au
          {{ returned.ends_at ? formatEventDate(returned.ends_at) : '' }}.
        </template>
        <template v-else>
          Abonnement payé : vos vidéos restent dans Découvrir jusqu’au
          {{ returned.ends_at ? formatEventDate(returned.ends_at) : '' }}.
        </template>
      </div>
      <div v-else-if="returned.status === 'failed'" class="alert-error">
        Le paiement {{ returned.reference }} n’a pas abouti : vous pouvez réessayer.
      </div>
      <div v-else class="alert-info">
        {{
          returnTimedOut
            ? 'La confirmation de votre paiement prend plus de temps que prévu : vous serez prévenu par WhatsApp dès qu’elle arrive.'
            : 'Paiement en cours de confirmation… Cette page se met à jour toute seule.'
        }}
      </div>
    </template>

    <!-- Vitrine subscription (only when KiffUp asks for it) -->
    <section
      v-if="subscription?.required"
      class="card space-y-3 p-5"
      :class="subscription.covered ? '' : 'ring-2 ring-red-200'"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <h2 class="section-title flex items-center gap-2">
            <BadgeCheck class="size-5 text-brand-600" /> Abonnement Vitrine
          </h2>
          <p v-if="!subscription.covered" class="text-sm font-semibold text-red-700">
            Abonnement terminé : vos vidéos ne sont plus diffusées dans Découvrir.
          </p>
          <p v-else-if="subscription.trial" class="text-sm text-stone-700">
            Période offerte jusqu’au
            {{ subscription.covered_until ? formatShortDate(subscription.covered_until) : '' }}.
            Ensuite, l’abonnement garde vos vidéos dans Découvrir.
          </p>
          <p v-else class="text-sm text-stone-700">
            Abonnement actif jusqu’au
            {{ subscription.covered_until ? formatShortDate(subscription.covered_until) : '' }}.
          </p>
          <p class="text-xs text-muted">
            {{ formatXof(subscription.price) }} pour {{ subscription.days }} jours, payé par Mobile
            Money. Un paiement fait avant la fin s’ajoute à la suite.
          </p>
        </div>
        <button
          v-if="!subscribing"
          type="button"
          class="btn-primary px-4 py-2 text-sm"
          @click="startSubscription"
        >
          {{ subscription.covered ? 'Prolonger' : 'Renouveler' }} ·
          {{ formatXof(subscription.price) }}
        </button>
      </div>
      <form v-if="subscribing" class="panel" @submit.prevent="pay('/api/v1/partner/subscription')">
        <div v-if="payError" class="alert-error">{{ payError }}</div>
        <PaymentMethodPicker v-model="paymentMethod" v-model:required="paymentMethodRequired" />
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="btn-primary px-4 py-2 text-sm" :disabled="paying">
            {{ paying ? 'Redirection…' : `Payer ${formatXof(subscription.price)}` }}
          </button>
          <button type="button" class="btn-ghost px-4 py-2 text-sm" @click="subscribing = false">
            Annuler
          </button>
        </div>
      </form>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <!-- Upload -->
      <form class="card space-y-4 p-5 sm:p-6" @submit.prevent="send">
        <h2 class="section-title flex items-center gap-2">
          <Upload class="size-5 text-brand-600" /> Publier une vidéo
        </h2>
        <div v-if="uploaded" class="alert-success">
          Vidéo envoyée. Elle sera visible dans Découvrir dès sa validation : vous serez prévenu par
          WhatsApp.
        </div>
        <div v-if="limitReached" class="alert-info">
          Vous avez atteint la limite de {{ limits.max_videos }} vidéos. Supprimez-en une pour en
          publier une nouvelle.
        </div>
        <div v-if="uploadError" class="alert-error">{{ uploadError }}</div>

        <div>
          <label class="label" for="video">Vidéo (verticale de préférence)</label>
          <input
            id="video"
            ref="fileInput"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            class="input file:mr-3 file:rounded-full file:border-0 file:bg-night-900 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            :disabled="limitReached || progress !== null"
            @change="pickFile"
          />
          <p class="mt-1 text-xs text-muted">
            {{ limits.max_duration_seconds }} secondes au plus · {{ limits.max_upload_mb }} Mo au
            plus.
          </p>
          <p v-if="fileError || fieldErrors.video" class="input-error">
            {{ fileError ?? fieldErrors.video?.[0] }}
          </p>
        </div>

        <video
          v-if="preview"
          :src="preview"
          class="mx-auto max-h-80 rounded-2xl bg-black"
          controls
          playsinline
          muted
          @loadedmetadata="onMetadata"
        />

        <FormField label="Texte (facultatif)" for="caption" :error="fieldErrors.caption?.[0]">
          <textarea
            id="caption"
            v-model="form.caption"
            class="input min-h-20"
            maxlength="300"
            placeholder="Ex. : Coucher de soleil sur la lagune, cocktails offerts le vendredi"
          />
        </FormField>

        <FormField
          v-if="listings.length"
          label="Offre à réserver depuis la vidéo (facultatif)"
          for="listing"
          :error="fieldErrors.listing_id?.[0]"
        >
          <select id="listing" v-model="form.listing_id" class="input">
            <option value="">Aucune</option>
            <option v-for="l in listings" :key="l.id" :value="l.id">{{ l.title }}</option>
          </select>
        </FormField>

        <fieldset>
          <legend class="label">Boutons de contact sous la vidéo</legend>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="b in BUTTONS"
              :key="b"
              class="flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5 text-sm"
            >
              <input v-model="form.contact_buttons" type="checkbox" :value="b" />
              {{ CONTACT_BUTTON_LABELS[b] }}
            </label>
          </div>
        </fieldset>

        <div v-if="progress !== null" class="space-y-1">
          <div class="h-2 overflow-hidden rounded-full bg-stone-100">
            <div class="h-full bg-sunset transition-all" :style="{ width: `${progress}%` }" />
          </div>
          <p class="text-xs text-muted">
            {{ progress < 100 ? `Envoi… ${progress} %` : 'Traitement de la vidéo…' }}
          </p>
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="!file || !!fileError || progress !== null || limitReached"
        >
          {{ progress !== null ? 'Envoi en cours…' : 'Envoyer la vidéo' }}
        </button>
      </form>

      <!-- Charter -->
      <aside class="card h-fit space-y-3 p-5 text-sm">
        <h2 class="section-title flex items-center gap-2">
          <ShieldCheck class="size-5 text-emerald-600" /> Ce qui est publié
        </h2>
        <ul class="list-disc space-y-1.5 pl-5 text-stone-700">
          <li>Votre lieu, vos prestations, votre équipe, l’ambiance.</li>
          <li>Images nettes, de jour de préférence, son propre.</li>
          <li>
            Refusé : contenu suggestif ou dénudé, mise en avant de personnes plutôt que du lieu,
            numéros ou liens vers d’autres services, prix trompeurs.
          </li>
        </ul>
        <p class="text-muted">
          Chaque vidéo est vérifiée avant publication. Une vidéo signalée par plusieurs visiteurs
          est retirée en attendant une nouvelle vérification.
        </p>
      </aside>
    </div>

    <!-- List -->
    <section class="space-y-3">
      <h2 class="section-title">Vos vidéos</h2>
      <ListSkeleton v-if="loading" :rows="2" />
      <EmptyState
        v-else-if="videos.length === 0"
        :icon="Clapperboard"
        title="Aucune vidéo pour le moment"
        text="Filmez 15 à 30 secondes de votre lieu avec votre téléphone, puis envoyez-la ci-dessus."
      />
      <article
        v-for="video in videos"
        :key="video.id"
        class="card flex flex-col gap-4 p-4 sm:flex-row sm:p-5"
      >
        <div class="aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-2xl bg-night-900">
          <img
            v-if="video.cover_url"
            :src="video.cover_url"
            alt=""
            class="size-full object-cover"
            loading="lazy"
          />
          <video
            v-else-if="video.video_url"
            :src="`${video.video_url}#t=1`"
            class="size-full object-cover"
            preload="metadata"
            muted
            playsinline
          />
        </div>
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="chip" :class="STATUS_STYLES[video.status]">
              {{ VIDEO_STATUS_LABELS[video.status] }}
            </span>
            <span v-if="video.boosted_until" class="chip bg-fuchsia-50 text-fuchsia-700">
              <Rocket class="size-3.5" /> Boostée jusqu’au
              {{ formatEventDate(video.boosted_until) }}
            </span>
            <span v-if="video.created_at" class="text-xs text-muted">
              Envoyée le {{ formatShortDate(video.created_at) }}
            </span>
          </div>
          <p
            v-if="video.status === 'rejected' && video.rejection_reason"
            class="text-sm text-red-700"
          >
            Motif : {{ video.rejection_reason }}
          </p>
          <p
            v-if="video.status === 'failed' && video.failure_reason"
            class="text-sm text-stone-600"
          >
            {{ video.failure_reason }}
          </p>

          <template v-if="editing !== video.id">
            <p class="text-sm">{{ video.caption ?? 'Sans texte' }}</p>
            <p v-if="video.listing_id" class="text-xs text-muted">
              Offre liée : {{ listingTitle(video.listing_id) ?? `n° ${video.listing_id}` }}
            </p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              <span class="inline-flex items-center gap-1"
                ><Eye class="size-3.5" /> {{ video.stats.views }} vues</span
              >
              <span class="inline-flex items-center gap-1"
                ><Heart class="size-3.5" /> {{ video.stats.likes }}</span
              >
              <span class="inline-flex items-center gap-1"
                ><Share2 class="size-3.5" /> {{ video.stats.shares }} partages</span
              >
              <span class="inline-flex items-center gap-1"
                ><MessageCircle class="size-3.5" /> {{ video.stats.contacts }} contacts</span
              >
              <span v-if="video.listing_id" class="inline-flex items-center gap-1">
                <MousePointerClick class="size-3.5" /> {{ video.stats.offer_clicks }} vers l’offre
              </span>
              <span
                v-if="video.listing_id || video.stats.bookings"
                class="inline-flex items-center gap-1 font-semibold text-emerald-700"
              >
                <ShoppingBag class="size-3.5" />
                {{ video.stats.bookings }} réservation{{ video.stats.bookings > 1 ? 's' : '' }}
                <template v-if="video.stats.booking_amount">
                  · {{ formatXof(video.stats.booking_amount) }}
                </template>
              </span>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <!-- Vitrine (RG53) is for logged-in customers: the preview above is enough. -->
              <RouterLink
                v-if="video.status === 'published' && partner?.profile !== 'showcase'"
                :to="{ name: 'discover-video', params: { videoId: video.id } }"
                class="btn-secondary px-3 py-1.5 text-sm"
              >
                Voir dans Découvrir
              </RouterLink>
              <button
                v-if="video.status === 'published' && canBoost && boosting !== video.id"
                type="button"
                class="btn-secondary px-3 py-1.5 text-sm"
                @click="startBoost(video)"
              >
                <Rocket class="size-4" />
                {{ video.boosted_until ? 'Prolonger le boost' : 'Booster' }}
              </button>
              <RouterLink
                v-if="video.status === 'published' && (subscription?.covered ?? true)"
                :to="{ name: 'partner.spotlight', query: { video: video.id } }"
                class="btn-secondary px-3 py-1.5 text-sm"
              >
                <Crown class="size-4" /> À la une
              </RouterLink>
              <button
                v-if="!['processing', 'failed'].includes(video.status)"
                type="button"
                class="btn-ghost px-3 py-1.5 text-sm"
                @click="startEdit(video)"
              >
                <Pencil class="size-4" /> Modifier
              </button>
              <button
                type="button"
                class="btn-ghost px-3 py-1.5 text-sm text-red-700"
                @click="remove(video)"
              >
                <Trash2 class="size-4" /> Supprimer
              </button>
            </div>
          </template>

          <form
            v-if="boosting === video.id && promotions"
            class="panel"
            @submit.prevent="pay(`/api/v1/partner/videos/${video.id}/boost`, { plan })"
          >
            <p class="text-sm text-stone-700">
              Votre vidéo passe en tête du fil Découvrir, juste après « À la une », avec la mention
              « Sponsorisé ».
              <template v-if="video.boosted_until">
                Le nouveau boost s’ajoute à la suite de celui en cours.
              </template>
            </p>
            <div v-if="payError" class="alert-error">{{ payError }}</div>
            <div
              class="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="radiogroup"
              aria-label="Durée du boost"
            >
              <button
                v-for="p in promotions.boost_plans"
                :key="p.plan"
                type="button"
                role="radio"
                class="rounded-2xl border px-3 py-2.5 text-left transition"
                :class="
                  plan === p.plan
                    ? 'border-transparent bg-night-900 text-white shadow-md'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                "
                :aria-checked="plan === p.plan"
                @click="plan = p.plan"
              >
                <span class="block text-sm font-semibold">{{ BOOST_PLAN_LABELS[p.plan] }}</span>
                <span class="text-xs opacity-80">{{ formatXof(p.price) }}</span>
              </button>
            </div>
            <PaymentMethodPicker v-model="paymentMethod" v-model:required="paymentMethodRequired" />
            <div class="flex flex-wrap gap-2">
              <button
                type="submit"
                class="btn-primary px-4 py-2 text-sm"
                :disabled="paying || !selectedPlan"
              >
                {{ paying ? 'Redirection…' : `Payer ${formatXof(selectedPlan?.price)}` }}
              </button>
              <button type="button" class="btn-ghost px-4 py-2 text-sm" @click="boosting = null">
                Annuler
              </button>
            </div>
          </form>

          <form v-else-if="editing === video.id" class="panel" @submit.prevent="saveEdit(video)">
            <div v-if="editError" class="alert-error">{{ editError }}</div>
            <textarea v-model="edit.caption" class="input min-h-20" maxlength="300" />
            <p v-if="video.status === 'published'" class="text-xs text-muted">
              Un nouveau texte repasse en validation avant d’être publié.
            </p>
            <select v-if="listings.length" v-model="edit.listing_id" class="input">
              <option value="">Aucune offre liée</option>
              <option v-for="l in listings" :key="l.id" :value="l.id">{{ l.title }}</option>
            </select>
            <div class="flex flex-wrap gap-2">
              <label v-for="b in BUTTONS" :key="b" class="flex items-center gap-2 text-sm">
                <input v-model="edit.contact_buttons" type="checkbox" :value="b" />
                {{ CONTACT_BUTTON_LABELS[b] }}
              </label>
            </div>
            <div class="flex gap-2">
              <button type="submit" class="btn-primary px-4 py-2 text-sm">Enregistrer</button>
              <button type="button" class="btn-ghost px-4 py-2 text-sm" @click="editing = null">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </article>
    </section>

    <!-- Payments for boosts and subscription -->
    <section v-if="promotions?.purchases.length" class="space-y-3">
      <h2 class="section-title flex items-center gap-2">
        <Receipt class="size-5 text-brand-600" /> Vos paiements Découvrir
      </h2>
      <div class="card divide-y divide-stone-100">
        <div
          v-for="p in promotions.purchases"
          :key="p.id"
          class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
        >
          <div class="min-w-0">
            <p class="font-semibold">{{ purchaseLabel(p) }}</p>
            <p class="text-xs text-muted">
              {{ p.reference }}
              <template v-if="p.created_at"> · {{ formatShortDate(p.created_at) }}</template>
              <template v-if="p.status === 'paid' && p.ends_at">
                · jusqu’au {{ formatShortDate(p.ends_at) }}
              </template>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ formatXof(p.amount) }}</span>
            <span class="chip" :class="PURCHASE_STYLES[p.status]">
              {{ PURCHASE_LABELS[p.status] }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <p v-if="partner?.profile === 'showcase'" class="text-center text-sm text-muted">
      Vous souhaitez aussi recevoir des réservations payées en ligne ? Contactez l’équipe KiffUp
      pour passer en partenaire Réservable.
    </p>
  </div>
</template>

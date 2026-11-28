<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Copy,
  Lock,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'
import { usePublicTabs } from '@/composables/usePublicTabs'
import DiscoverSlide from '@/components/discover/DiscoverSlide.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import { api, ApiError } from '@/lib/api'
import { rememberDiscoveryOrigin } from '@/lib/discoveryOrigin'
import { formatEventDate, formatXof } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { PARTNER_TYPE_LABELS, type PartnerType } from '@/types/catalog'
import { REPORT_REASONS, type FeedVideo, type VitrineStatus } from '@/types/discovery'

/**
 * "Découvrir" (V3): vertical full-screen feed of partner videos, open to everyone (RG40).
 * /decouvrir/:videoId opens a shared video first, then the feed continues.
 * /decouvrir/vitrine (lot F8, RG53): the Vitrine partners' videos, for logged-in customers; a few
 * free videos a day, then the Pass Vitrine (also needed to contact or share).
 */
const props = defineProps<{ videoId?: string; vitrine?: boolean }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const videos = ref<FeedVideo[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const finished = ref(false)
const failed = ref(false)
const active = ref(0)
const muted = ref(true)
const scroller = ref<HTMLElement | null>(null)

const str = (value: unknown) => (typeof value === 'string' ? value : '')
const city = ref(str(route.query.ville))
const category = ref(str(route.query.categorie))
const cities = ref<{ city: string; videos: number }[]>([])
const filtersOpen = ref(false)
const CATEGORIES: PartnerType[] = [
  'wellness',
  'restaurant',
  'leisure',
  'event_space',
  'hotel',
  'residence',
]

const current = computed(() => videos.value[active.value] ?? null)
// "Vitrine" (RG53): the Vitrine partners' videos.
const inVitrine = ref(!!props.vitrine)
useHead({
  title: computed(() =>
    current.value?.partner
      ? `${current.value.partner.name} · ${inVitrine.value ? 'Vitrine' : 'Découvrir'}`
      : inVitrine.value
        ? 'Vitrine'
        : 'Découvrir',
  ),
})

// ─── Vitrine (RG53)
const vitrineStatus = ref<VitrineStatus | null>(null)
// Free videos of the day used up: the next locked videos show only their cover.
const blocked = ref(false)
const passRequired = computed(() => inVitrine.value && !vitrineStatus.value?.has_pass)
const opening = new Set<number>()

async function loadVitrine() {
  try {
    vitrineStatus.value = (await api.get<{ data: VitrineStatus }>('/api/v1/customer/vitrine')).data
  } catch {
    vitrineStatus.value = null
  }
}

/** The customer reaches a locked video: its file, or the Pass Vitrine once the free ones are used. */
async function open(video: FeedVideo) {
  if (opening.has(video.id)) return
  opening.add(video.id)
  try {
    const response = await api.post<{ data: FeedVideo; meta: VitrineStatus }>(
      `/api/v1/customer/vitrine/videos/${video.id}/watch`,
    )
    // "À la une" may come back later in the feed: every copy is opened.
    videos.value.filter((v) => v.id === video.id).forEach((v) => Object.assign(v, response.data))
    vitrineStatus.value = response.meta
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) {
      if (!blocked.value) passOpen.value = true
      blocked.value = true
    }
  } finally {
    opening.delete(video.id)
  }
}
watch([current, inVitrine], ([video]) => {
  if (inVitrine.value && video?.locked && !blocked.value) open(video)
})

function toggleVitrine() {
  router.push({ name: inVitrine.value ? 'discover' : 'discover-vitrine' })
}

// ─── Pass Vitrine: the provider's page, then back here with ?pass=
const passOpen = ref(false)
const plan = ref('')
const paymentMethod = ref('')
const paymentMethodRequired = ref(false)
const buying = ref(false)
const buyError = ref<string | null>(null)
const passNotice = ref<{ ok: boolean; text: string } | null>(null)
watch(
  () => vitrineStatus.value?.plans,
  (plans) => {
    if (plans?.length && !plans.some((p) => p.plan === plan.value)) plan.value = plans[0]!.plan
  },
)

async function buyPass() {
  buyError.value = null
  if (paymentMethodRequired.value && !paymentMethod.value) {
    buyError.value = 'Choisis ton moyen de paiement.'
    return
  }
  buying.value = true
  try {
    const response = await api.post<{ payment_url: string }>('/api/v1/customer/vitrine/pass', {
      plan: plan.value,
      payment_method: paymentMethod.value || null,
    })
    window.location.assign(response.payment_url)
  } catch (e) {
    buyError.value =
      e instanceof ApiError
        ? (Object.values(e.errors)[0]?.[0] ?? e.detail ?? e.message)
        : 'Paiement impossible.'
    buying.value = false
  }
}

let passTimer: ReturnType<typeof setTimeout> | undefined
async function followPass(id: string, attempt = 0) {
  try {
    const pass = (
      await api.get<{ data: { status: string; ends_at: string | null } }>(
        `/api/v1/customer/vitrine/pass/${id}`,
      )
    ).data
    if (pass.status === 'paid') {
      passNotice.value = {
        ok: true,
        text: `Pass Vitrine activé jusqu'au ${formatEventDate(pass.ends_at!)}. Toutes les vidéos sont ouvertes.`,
      }
      router.replace({ name: 'discover-vitrine' })
      return
    }
    if (pass.status === 'failed') {
      passNotice.value = { ok: false, text: "Le paiement n'a pas abouti : aucun montant débité." }
      return
    }
    passNotice.value = { ok: true, text: 'Confirmation du paiement…' }
    if (attempt < 20) passTimer = setTimeout(() => followPass(id, attempt + 1), 3000)
  } catch {
    passNotice.value = null
  }
}

async function loadMore() {
  if (loading.value || finished.value) return
  loading.value = true
  failed.value = false
  try {
    const response = await api.get<{ data: FeedVideo[]; next_cursor: string | null }>(
      '/api/v1/public/discovery/feed',
      {
        city: city.value || undefined,
        category: category.value || undefined,
        cursor: nextCursor.value ?? undefined,
        except: props.videoId ? Number(props.videoId) : undefined,
        vitrine: inVitrine.value ? 1 : undefined,
      },
    )
    videos.value = [...videos.value, ...response.data]
    nextCursor.value = response.next_cursor
    finished.value = response.next_cursor === null
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function reset() {
  videos.value = []
  nextCursor.value = null
  finished.value = false
  active.value = 0
  blocked.value = false
  scroller.value?.scrollTo({ top: 0 })
  if (props.videoId) {
    try {
      const response = await api.get<{ data: FeedVideo }>(
        `/api/v1/public/discovery/videos/${props.videoId}`,
      )
      // A shared Vitrine video: Vitrine follows, after the customer login (a partner or staff
      // member just sees its cover).
      if (
        response.data.vitrine &&
        !inVitrine.value &&
        !(auth.isAuthenticated && !auth.isCustomer)
      ) {
        if (!auth.isCustomer) {
          await router.replace({
            name: 'customer-login',
            query: { redirect: `/decouvrir/${props.videoId}` },
          })
          return
        }
        inVitrine.value = true
      }
      videos.value = [response.data]
    } catch {
      // Removed or unknown video: the feed alone.
    }
  }
  if (inVitrine.value) await loadVitrine()
  await loadMore()
  loadCities()
}

function loadCities() {
  api
    .get<{ data: { city: string; videos: number }[] }>('/api/v1/public/discovery/cities', {
      vitrine: inVitrine.value ? 1 : undefined,
    })
    .then((r) => (cities.value = r.data))
    .catch(() => undefined)
}

// Active slide = the one filling the screen; more videos are loaded two slides before the end.
let observer: IntersectionObserver | null = null
function observe() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          active.value = Number((entry.target as HTMLElement).dataset.index)
        }
      }
    },
    { root: scroller.value, threshold: 0.6 },
  )
  scroller.value?.querySelectorAll('[data-index]').forEach((el) => observer?.observe(el))
}
watch(
  () => videos.value.length,
  async () => {
    await nextTick()
    observe()
  },
)
watch(active, (index) => {
  if (index >= videos.value.length - 3) loadMore()
})

function track(video: FeedVideo, type: 'view' | 'complete' | 'share' | 'contact' | 'offer') {
  api.post(`/api/v1/public/discovery/videos/${video.id}/track`, { type }).catch(() => undefined)
}

/** "Réserver": the booking that follows is credited to this video (RG43). */
function openOffer(video: FeedVideo) {
  rememberDiscoveryOrigin(video.id)
  track(video, 'offer')
}

/** "Écrire" (lot F9): the conversation with the place, about this video. */
async function chat(video: FeedVideo) {
  if (!video.partner || !(await requireCustomer(video))) return
  track(video, 'contact')
  try {
    const conversation = (
      await api.post<{ data: { id: number } }>('/api/v1/customer/conversations', {
        partner_id: video.partner.id,
      })
    ).data
    await router.push({
      name: 'customer.conversation',
      params: { conversationId: conversation.id },
      query: { video: video.id, sujet: video.caption || 'Vidéo' },
    })
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) passOpen.value = true
  }
}

/** Likes and saves need a customer account (RG40): login first, then back to this video. */
async function requireCustomer(video: FeedVideo): Promise<boolean> {
  if (auth.isCustomer) return true
  await router.push({ name: 'customer-login', query: { redirect: `/decouvrir/${video.id}` } })
  return false
}

async function like(video: FeedVideo) {
  if (!(await requireCustomer(video))) return
  const wasLiked = video.liked
  video.liked = !wasLiked
  video.likes += wasLiked ? -1 : 1
  try {
    const response = await (wasLiked
      ? api.delete<{ data: { likes: number } }>(`/api/v1/customer/videos/${video.id}/like`)
      : api.put<{ data: { likes: number } }>(`/api/v1/customer/videos/${video.id}/like`))
    video.likes = response.data.likes
  } catch {
    video.liked = wasLiked
    video.likes += wasLiked ? 1 : -1
  }
}

async function favorite(video: FeedVideo) {
  if (!(await requireCustomer(video))) return
  const was = video.favorited
  video.favorited = !was
  try {
    if (was) await api.delete(`/api/v1/customer/favorites/videos/${video.id}`)
    else await api.put(`/api/v1/customer/favorites/videos/${video.id}`)
  } catch {
    video.favorited = was
  }
}

// ─── Sharing: the phone's share sheet when available, otherwise WhatsApp / Facebook / copy.
const shareFor = ref<FeedVideo | null>(null)
const copied = ref(false)
const shareUrl = (video: FeedVideo) => `${window.location.origin}/decouvrir/${video.id}`
const shareText = (video: FeedVideo) =>
  `${video.partner?.name ?? 'KiffUp'} à ${video.city}${video.caption ? ` : ${video.caption}` : ''}`

async function share(video: FeedVideo) {
  track(video, 'share')
  video.shares++
  if (navigator.share) {
    try {
      await navigator.share({ title: shareText(video), url: shareUrl(video) })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  copied.value = false
  shareFor.value = video
}
async function copyLink() {
  if (!shareFor.value) return
  try {
    await navigator.clipboard.writeText(shareUrl(shareFor.value))
    copied.value = true
  } catch {
    copied.value = false
  }
}

// ─── Reports (RG37)
const reportFor = ref<FeedVideo | null>(null)
const reportReason = ref('')
const reportDetails = ref('')
const reportSent = ref(false)
const reportError = ref<string | null>(null)
function openReport(video: FeedVideo) {
  reportFor.value = video
  reportReason.value = ''
  reportDetails.value = ''
  reportSent.value = false
  reportError.value = null
}
async function sendReport() {
  if (!reportFor.value) return
  reportError.value = null
  try {
    await api.post(`/api/v1/public/discovery/videos/${reportFor.value.id}/report`, {
      reason: reportReason.value,
      details: reportDetails.value || null,
    })
    reportSent.value = true
  } catch (e) {
    reportError.value =
      e instanceof ApiError ? (e.errors.reason?.[0] ?? e.detail ?? e.message) : 'Envoi impossible.'
  }
}

function applyFilters() {
  filtersOpen.value = false
  router.replace({
    name: inVitrine.value ? 'discover-vitrine' : 'discover',
    query: { ville: city.value || undefined, categorie: category.value || undefined },
  })
}
watch(
  () => [route.query.ville, route.query.categorie, props.videoId, props.vitrine],
  () => {
    city.value = str(route.query.ville)
    category.value = str(route.query.categorie)
    inVitrine.value = !!props.vitrine
    reset()
  },
)

function back() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'home' })
}

onMounted(async () => {
  await reset()
  const pass = str(route.query.pass)
  if (inVitrine.value && pass) followPass(pass)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(passTimer)
})
// Phones: the same bottom tab bar as the rest of the site.
const { tabs } = usePublicTabs()
</script>

<template>
  <div class="fixed inset-0 bg-black text-white">
    <!-- Top bar over the videos -->
    <header
      class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-8"
    >
      <!-- The bar lets clicks through to the video, its buttons do not. -->
      <div class="pointer-events-auto flex items-center gap-1">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full hover:bg-white/10"
          aria-label="Retour"
          @click="back"
        >
          <ArrowLeft class="size-6" />
        </button>
        <RouterLink :to="{ name: 'home' }" aria-label="KiffUp, accueil" class="scale-90">
          <BrandLogo />
        </RouterLink>
      </div>
      <div class="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur transition"
          :class="inVitrine ? 'bg-white text-night-900' : 'bg-white/15'"
          :aria-pressed="inVitrine"
          @click="toggleVitrine"
        >
          <Store class="size-4" /> Vitrine
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur sm:px-4"
          aria-label="Filtrer"
          @click="filtersOpen = true"
        >
          <SlidersHorizontal class="size-4" />
          <span class="hidden sm:inline">
            {{ city || (category ? PARTNER_TYPE_LABELS[category as PartnerType] : 'Tout voir') }}
          </span>
        </button>
      </div>
    </header>

    <!-- Vitrine: free videos left today, or the payment of the pass. Only the chip itself takes
         clicks: on wide screens this row passes over the video's sound and full-screen buttons. -->
    <div
      v-if="inVitrine && (vitrineStatus || passNotice)"
      class="pointer-events-none absolute top-[calc(4.5rem+env(safe-area-inset-top))] right-44 left-3 z-20 flex flex-col items-start gap-2 *:pointer-events-auto"
    >
      <p
        v-if="passNotice"
        class="rounded-2xl px-4 py-2 text-center text-sm font-semibold shadow-lg"
        :class="passNotice.ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'"
      >
        {{ passNotice.text }}
      </p>
      <button
        v-else-if="vitrineStatus && !vitrineStatus.has_pass"
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-semibold backdrop-blur"
        @click="passOpen = true"
      >
        {{
          vitrineStatus.free_left > 0
            ? `${vitrineStatus.free_left} gratuite${vitrineStatus.free_left > 1 ? 's' : ''} aujourd'hui`
            : 'Gratuites épuisées'
        }}
        <span class="rounded-full bg-gold-400 px-2 py-0.5 text-night-900">Pass Vitrine</span>
      </button>
    </div>

    <!-- Feed -->
    <div
      ref="scroller"
      class="h-[calc(100dvh-var(--tabbar))] snap-y snap-mandatory overflow-y-scroll overscroll-contain"
    >
      <!-- The first of "À la une" comes back every few videos: the same video, another slide. -->
      <div v-for="(video, index) in videos" :key="`${index}-${video.id}`" :data-index="index">
        <DiscoverSlide
          :video="video"
          :active="index === active"
          :preload="index === active + 1"
          :muted="muted"
          :pass-required="passRequired && video.vitrine"
          :blocked="blocked"
          @pass="passOpen = true"
          @like="like(video)"
          @favorite="favorite(video)"
          @share="share(video)"
          @report="openReport(video)"
          @contact="track(video, 'contact')"
          @chat="chat(video)"
          @offer="openOffer(video)"
          @viewed="track(video, 'view')"
          @completed="track(video, 'complete')"
          @toggle-sound="muted = !muted"
        />
      </div>

      <section
        v-if="!loading && videos.length === 0"
        class="flex h-[calc(100dvh-var(--tabbar))] flex-col items-center justify-center gap-4 px-8 text-center"
      >
        <span class="grid size-16 place-items-center rounded-3xl bg-white/10">
          <Clapperboard class="size-8" />
        </span>
        <p class="font-display text-xl font-bold">
          {{
            failed
              ? 'Le fil ne répond pas'
              : inVitrine
                ? 'Bientôt des vidéos Vitrine'
                : 'Bientôt des vidéos ici'
          }}
        </p>
        <p class="max-w-xs text-sm text-white/70">
          {{
            failed
              ? 'Vérifie ta connexion puis réessaie.'
              : 'Nos partenaires préparent leurs plus belles vidéos : plages, spas, restaurants, lieux de fête…'
          }}
        </p>
        <button v-if="failed" type="button" class="btn-light" @click="reset">Réessayer</button>
        <button
          v-else-if="city || category"
          type="button"
          class="btn-light"
          @click="router.replace({ name: inVitrine ? 'discover-vitrine' : 'discover' })"
        >
          Tout voir
        </button>
      </section>
      <div v-if="loading" class="grid h-24 place-items-center text-sm text-white/60">
        Chargement…
      </div>
    </div>

    <!-- Filters -->
    <div
      v-if="filtersOpen"
      class="absolute inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center"
      @click.self="filtersOpen = false"
    >
      <div
        class="w-full space-y-5 rounded-t-4xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink sm:max-w-md sm:rounded-4xl sm:pb-6"
      >
        <div class="flex items-center justify-between">
          <p class="font-display text-lg font-bold">Qu'est-ce que tu veux découvrir ?</p>
          <button type="button" aria-label="Fermer" @click="filtersOpen = false">
            <X class="size-5" />
          </button>
        </div>
        <div>
          <p class="label">Ville</p>
          <select v-model="city" class="input">
            <option value="">Toutes les villes</option>
            <option v-for="c in cities" :key="c.city" :value="c.city">
              {{ c.city }} ({{ c.videos }})
            </option>
          </select>
        </div>
        <div>
          <p class="label">Catégorie</p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="tab border border-stone-200"
              :class="{ 'tab-active': category === '' }"
              @click="category = ''"
            >
              Tout
            </button>
            <button
              v-for="c in CATEGORIES"
              :key="c"
              type="button"
              class="tab border border-stone-200"
              :class="{ 'tab-active': category === c }"
              @click="category = c"
            >
              {{ PARTNER_TYPE_LABELS[c] }}
            </button>
          </div>
        </div>
        <button type="button" class="btn-primary w-full" @click="applyFilters">
          Voir les vidéos
        </button>
      </div>
    </div>

    <!-- Pass Vitrine -->
    <div
      v-if="passOpen && vitrineStatus"
      class="absolute inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center"
      @click.self="passOpen = false"
    >
      <form
        class="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-4xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink sm:max-w-md sm:rounded-4xl sm:pb-6"
        @submit.prevent="buyPass"
      >
        <div class="flex items-center justify-between">
          <p class="flex items-center gap-2 font-display text-lg font-bold">
            <Lock class="size-5 text-brand-600" /> Pass Vitrine
          </p>
          <button type="button" aria-label="Fermer" @click="passOpen = false">
            <X class="size-5" />
          </button>
        </div>
        <p class="text-sm text-muted">
          {{
            vitrineStatus.free_left > 0
              ? `Il te reste ${vitrineStatus.free_left} vidéo${vitrineStatus.free_left > 1 ? 's' : ''} gratuite${vitrineStatus.free_left > 1 ? 's' : ''} aujourd'hui.`
              : vitrineStatus.free_per_day === 0
                ? 'Les vidéos Vitrine sont réservées au pass.'
                : vitrineStatus.free_per_day === 1
                  ? 'Tu as regardé ta vidéo gratuite du jour.'
                  : `Tu as regardé tes ${vitrineStatus.free_per_day} vidéos gratuites du jour.`
          }}
          Avec le pass : toutes les vidéos Vitrine, et tu peux écrire aux lieux, les appeler ou t’y
          rendre.
        </p>
        <p v-if="vitrineStatus.plans.length === 0" class="alert-info">
          Le pass n'est pas en vente pour le moment.
        </p>
        <template v-else>
          <div v-if="buyError" class="alert-error">{{ buyError }}</div>
          <label
            v-for="p in vitrineStatus.plans"
            :key="p.plan"
            class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3"
            :class="plan === p.plan ? 'border-brand-500 bg-brand-50' : 'border-stone-200'"
          >
            <span class="flex items-center gap-3">
              <input v-model="plan" type="radio" name="plan" :value="p.plan" />
              <span class="font-semibold">{{
                p.days === 1 ? '24 heures' : `${p.days} jours`
              }}</span>
            </span>
            <span class="font-display font-bold">{{ formatXof(p.price) }}</span>
          </label>
          <PaymentMethodPicker v-model="paymentMethod" v-model:required="paymentMethodRequired" />
          <button type="submit" class="btn-primary w-full" :disabled="buying || !plan">
            {{
              buying
                ? 'Redirection…'
                : `Payer ${formatXof(vitrineStatus.plans.find((p) => p.plan === plan)?.price ?? 0)}`
            }}
          </button>
          <p class="text-center text-xs text-muted">
            Paiement unique, sans renouvellement automatique. Non remboursable.
          </p>
        </template>
      </form>
    </div>

    <!-- Share (browsers without the native share sheet) -->
    <div
      v-if="shareFor"
      class="absolute inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center"
      @click.self="shareFor = null"
    >
      <div
        class="w-full space-y-3 rounded-t-4xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink sm:max-w-md sm:rounded-4xl sm:pb-6"
      >
        <p class="font-display text-lg font-bold">Partager cette vidéo</p>
        <a
          class="btn-primary w-full"
          :href="`https://wa.me/?text=${encodeURIComponent(`${shareText(shareFor)} ${shareUrl(shareFor)}`)}`"
          target="_blank"
          rel="noopener"
        >
          WhatsApp
        </a>
        <a
          class="btn-secondary w-full"
          :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl(shareFor))}`"
          target="_blank"
          rel="noopener"
        >
          Facebook
        </a>
        <button type="button" class="btn-ghost w-full" @click="copyLink">
          <component :is="copied ? Check : Copy" class="size-4" />
          {{ copied ? 'Lien copié' : 'Copier le lien' }}
        </button>
      </div>
    </div>

    <!-- Report -->
    <div
      v-if="reportFor"
      class="absolute inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center"
      @click.self="reportFor = null"
    >
      <form
        class="w-full space-y-4 rounded-t-4xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink sm:max-w-md sm:rounded-4xl sm:pb-6"
        @submit.prevent="sendReport"
      >
        <template v-if="!reportSent">
          <p class="font-display text-lg font-bold">Signaler cette vidéo</p>
          <div v-if="reportError" class="alert-error">{{ reportError }}</div>
          <label
            v-for="(label, value) in REPORT_REASONS"
            :key="value"
            class="flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          >
            <input v-model="reportReason" type="radio" name="reason" :value="value" required />
            {{ label }}
          </label>
          <textarea
            v-model="reportDetails"
            class="input min-h-20"
            maxlength="1000"
            placeholder="Précisions (facultatif)"
          />
          <button type="submit" class="btn-danger w-full">Envoyer le signalement</button>
        </template>
        <template v-else>
          <p class="font-display text-lg font-bold">Merci</p>
          <p class="text-sm text-muted">
            L'équipe KiffUp va vérifier cette vidéo. Au-delà de quelques signalements, elle est
            retirée en attendant.
          </p>
          <button type="button" class="btn-primary w-full" @click="reportFor = null">Fermer</button>
        </template>
      </form>
    </div>

    <!-- Phones: the site's tab bar under the feed, as in a video app -->
    <MobileTabBar :items="tabs" />
  </div>
</template>

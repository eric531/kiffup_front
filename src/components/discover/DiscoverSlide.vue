<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Bookmark,
  Crown,
  Flag,
  Heart,
  Lock,
  MapPin,
  Maximize,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  Share2,
  ShoppingBag,
} from 'lucide-vue-next'
import { formatXof } from '@/lib/format'
import { PARTNER_TYPE_LABELS, perUnitSuffix } from '@/types/catalog'
import type { FeedVideo } from '@/types/discovery'

/**
 * One full-screen video of the "Découvrir" feed. Plays only while it is the active slide; the
 * next one is preloaded by the parent (preload prop).
 * In "Vitrine" without a pass (passRequired), contacting asks for the Pass Vitrine; a video beyond
 * the free ones of the day (blocked) shows only its cover (RG53).
 * "Plein écran": the video alone, with the player's controls (native player on iPhone).
 */
const props = defineProps<{
  video: FeedVideo
  active: boolean
  preload: boolean
  muted: boolean
  passRequired?: boolean
  blocked?: boolean
}>()
const emit = defineEmits<{
  like: []
  favorite: []
  share: []
  report: []
  contact: [kind: 'call' | 'directions']
  /** "Écrire": the conversation with the place (lot F9). */
  chat: []
  offer: []
  viewed: []
  completed: []
  toggleSound: []
  pass: []
}>()

const player = ref<HTMLVideoElement | null>(null)
const paused = ref(false)
let completed = false
let viewTimer: ReturnType<typeof setTimeout> | undefined

async function sync(active: boolean) {
  clearTimeout(viewTimer)
  const el = player.value
  if (!el) return
  if (active) {
    paused.value = false
    try {
      await el.play()
    } catch {
      // Autoplay refused (rare when muted): the visitor taps to play.
      paused.value = true
    }
    // A view counts after one second on screen, not while scrolling past.
    viewTimer = setTimeout(() => emit('viewed'), 1000)
  } else {
    el.pause()
    el.currentTime = 0
  }
}
// The slide already on screen when the feed opens plays at once; the others when they become active.
watch(() => props.active, sync, { flush: 'post' })
// A Vitrine video receives its file once opened (RG53).
watch(
  () => props.video.video_url,
  () => sync(props.active),
  { flush: 'post' },
)
onMounted(() => {
  sync(props.active)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  clearTimeout(viewTimer)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

// ─── Full screen
const fullscreen = ref(false)
type IosVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

async function enterFullscreen() {
  const el = player.value as IosVideo | null
  if (!el) return
  // Watching in full screen is a choice: with the sound.
  if (props.muted) emit('toggleSound')
  if (el.requestFullscreen) await el.requestFullscreen().catch(() => undefined)
  else el.webkitEnterFullscreen?.() // iPhone: only the native player goes full screen
}

/** Back from full screen: the sound chosen in the player becomes the feed's. */
function onFullscreenChange() {
  fullscreen.value = !!player.value && document.fullscreenElement === player.value
  if (!fullscreen.value) syncSound()
}
function syncSound() {
  if (player.value && player.value.muted !== props.muted) emit('toggleSound')
}

function togglePlay() {
  const el = player.value
  if (!el) return
  if (el.paused) {
    el.play().catch(() => undefined)
    paused.value = false
  } else {
    el.pause()
    paused.value = true
  }
}

function onTimeUpdate() {
  const el = player.value
  if (!completed && el && el.duration > 0 && el.currentTime / el.duration >= 0.9) {
    completed = true
    emit('completed')
  }
}

const callLink = computed(() =>
  props.video.partner?.contact.call ? `tel:${props.video.partner.contact.call}` : null,
)
const directionsLink = computed(() => props.video.partner?.contact.directions ?? null)
const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace('.', ',')} k` : String(n)
</script>

<template>
  <section class="relative flex h-dvh w-full snap-start snap-always items-center justify-center">
    <!-- Video: 9:16 column on large screens, full screen on phones -->
    <div class="relative h-full w-full sm:aspect-[9/16] sm:w-auto sm:max-w-full">
      <video
        ref="player"
        class="size-full bg-black object-cover"
        :src="video.video_url ?? undefined"
        :poster="video.cover_url ?? undefined"
        :preload="active || preload ? 'auto' : 'metadata'"
        :muted="muted"
        :controls="fullscreen"
        playsinline
        loop
        disablepictureinpicture
        @click="fullscreen || togglePlay()"
        @timeupdate="onTimeUpdate"
        @webkitendfullscreen="syncSound"
      />
      <!-- Vitrine: free videos of the day used up -->
      <div
        v-if="video.locked && blocked"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/60 px-8 text-center backdrop-blur-sm"
      >
        <span class="grid size-16 place-items-center rounded-3xl bg-white/15">
          <Lock class="size-8" />
        </span>
        <p class="font-display text-xl font-bold">Réservé au Pass Vitrine</p>
        <p class="max-w-xs text-sm text-white/75">
          Tu as regardé tes vidéos gratuites du jour. Avec le pass, regarde tout et contacte les
          lieux.
        </p>
        <button type="button" class="btn-primary" @click="emit('pass')">Voir les formules</button>
      </div>
      <button
        v-else-if="paused && video.video_url"
        type="button"
        class="absolute inset-0 grid place-items-center"
        aria-label="Lire la vidéo"
        @click="togglePlay"
      >
        <span class="grid size-20 place-items-center rounded-full bg-black/40 backdrop-blur">
          <Play class="size-9 translate-x-0.5 fill-white text-white" />
        </span>
      </button>

      <!-- Readability gradient -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
      />

      <!-- Right column: reactions -->
      <div
        class="absolute right-3 bottom-36 flex flex-col items-center gap-5 text-white sm:bottom-40"
      >
        <button
          type="button"
          class="discover-action"
          :aria-pressed="video.liked"
          @click="emit('like')"
        >
          <Heart class="size-7" :class="video.liked ? 'fill-rose-500 text-rose-500' : ''" />
          <span>{{ compact(video.likes) }}</span>
        </button>
        <button
          type="button"
          class="discover-action"
          :aria-pressed="video.favorited"
          :aria-label="video.favorited ? 'Retirer des favoris' : 'Enregistrer'"
          @click="emit('favorite')"
        >
          <Bookmark
            class="size-7"
            :class="video.favorited ? 'fill-amber-400 text-amber-400' : ''"
          />
          <span>{{ video.favorited ? 'Enregistré' : 'Garder' }}</span>
        </button>
        <button type="button" class="discover-action" @click="emit('share')">
          <Share2 class="size-7" />
          <span>Partager</span>
        </button>
        <button type="button" class="discover-action opacity-80" @click="emit('report')">
          <Flag class="size-6" />
          <span>Signaler</span>
        </button>
      </div>

      <!-- Bottom: partner, caption, contacts, listing -->
      <div class="absolute inset-x-0 bottom-0 space-y-3 p-4 pr-20 pb-6 text-white sm:pb-8">
        <div>
          <p class="font-display text-lg leading-tight font-bold drop-shadow">
            {{ video.partner?.name }}
          </p>
          <p class="mt-0.5 flex items-center gap-1 text-sm text-white/80">
            <MapPin class="size-3.5" /> {{ video.city }} ·
            {{ PARTNER_TYPE_LABELS[video.category] ?? '' }}
            <span
              v-if="video.placement === 'spotlight'"
              class="ml-1 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold tracking-wide text-night-900 uppercase"
            >
              <Crown v-if="video.spotlight_rank === 1" class="size-3" /> À la une
            </span>
            <span
              v-else-if="video.sponsored"
              class="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
            >
              Sponsorisé
            </span>
          </p>
        </div>
        <p v-if="video.caption" class="line-clamp-3 text-sm leading-snug text-white/95">
          {{ video.caption }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="passRequired"
            type="button"
            class="discover-chip bg-white/15"
            @click="emit('pass')"
          >
            <Lock class="size-4" /> Écrire au lieu
          </button>
          <button
            v-if="video.partner?.contact.chat"
            type="button"
            class="discover-chip bg-brand-600"
            @click="emit('chat')"
          >
            <MessageCircle class="size-4" /> Écrire
          </button>
          <a
            v-if="callLink"
            :href="callLink"
            class="discover-chip bg-white/15"
            @click="emit('contact', 'call')"
          >
            <Phone class="size-4" /> Appeler
          </a>
          <a
            v-if="directionsLink"
            :href="directionsLink"
            target="_blank"
            rel="noopener"
            class="discover-chip bg-white/15"
            @click="emit('contact', 'directions')"
          >
            <Navigation class="size-4" /> Itinéraire
          </a>
        </div>
        <RouterLink
          v-if="video.offer"
          :to="{ name: 'stay', params: { listingId: video.offer.id } }"
          class="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-lg"
          @click="emit('offer')"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">{{ video.offer.title }}</span>
            <span v-if="video.offer.price" class="text-xs text-muted">
              dès {{ formatXof(video.offer.price) }}
              {{ video.offer.unit ? perUnitSuffix(video.offer.unit) : '' }}
            </span>
          </span>
          <span class="btn-primary shrink-0 px-4 py-2 text-sm">
            <ShoppingBag class="size-4" /> Réserver
          </span>
        </RouterLink>
      </div>

      <div class="absolute top-[4.5rem] right-3 flex items-center gap-2">
        <button
          v-if="video.video_url && !(video.locked && blocked)"
          type="button"
          class="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
          aria-label="Plein écran"
          title="Plein écran"
          @click="enterFullscreen"
        >
          <Maximize class="size-4" />
        </button>
        <button
          type="button"
          class="rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
          @click="emit('toggleSound')"
        >
          {{ muted ? 'Activer le son' : 'Couper le son' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Full screen: the whole picture, not the feed's crop. */
video:fullscreen {
  object-fit: contain;
}
</style>

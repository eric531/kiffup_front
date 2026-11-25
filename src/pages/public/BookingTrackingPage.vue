<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertTriangle,
  CalendarDays,
  CircleCheckBig,
  Clock,
  MapPin,
  RotateCcw,
  User,
  XCircle,
} from 'lucide-vue-next'
import { api, ApiError } from '@/lib/api'
import { formatEventDate, formatRate, formatStayRange, formatXof } from '@/lib/format'
import { readBookingToken, saveBookingToken } from '@/lib/bookingTokens'
import { formatSessionDate } from '@/lib/sessions'
import StageBackdrop from '@/components/StageBackdrop.vue'
import CancelBookingPanel from '@/components/CancelBookingPanel.vue'
import SessionPanel from '@/components/SessionPanel.vue'
import PriceDetail from '@/components/PriceDetail.vue'
import { BOOKING_STATUS_LABELS, type Booking } from '@/types/booking'
import { durationLabel } from '@/types/catalog'

const props = defineProps<{ code: string }>()
const route = useRoute()

const token = (typeof route.query.t === 'string' && route.query.t) || readBookingToken(props.code)
const booking = ref<Booking | null>(null)
const notFound = ref(false)
const failed = ref(false)

const qrUrl = computed(() =>
  booking.value?.status === 'paid' && token
    ? `${import.meta.env.VITE_API_URL ?? ''}/api/v1/public/bookings/${booking.value.code}/qr.png?t=${encodeURIComponent(token)}`
    : null,
)

const heading = computed(() => {
  const status = booking.value?.status
  switch (status) {
    case 'pending':
      return {
        title: 'Confirmation du paiement…',
        text: 'Cela prend généralement quelques secondes. Ne ferme pas cette page.',
      }
    case 'requested':
      return booking.value?.session?.proposed_starts_at
        ? {
            title: 'Autre heure proposée',
            text: "L'établissement te propose une autre heure : accepte-la ou refuse-la.",
          }
        : {
            title: 'Demande envoyée',
            text: "Acompte payé. L'établissement confirme l'heure de ta séance.",
          }
    case 'paid':
      return booking.value?.session
        ? {
            title: 'Séance confirmée',
            text: 'Ton créneau est réservé. Présente ce billet à ton arrivée.',
          }
        : {
            title: 'Réservation confirmée',
            text: 'Ta place est garantie. Présente ce billet à ton arrivée.',
          }
    case undefined:
      return null
    default:
      return { title: BOOKING_STATUS_LABELS[status], text: '' }
  }
})

let poll: ReturnType<typeof setTimeout> | undefined
let attempts = 0

async function load() {
  if (!token) {
    notFound.value = true
    return
  }
  try {
    booking.value = (
      await api.get<{ data: Booking }>(`/api/v1/public/bookings/${props.code}`, { t: token })
    ).data
    saveBookingToken(booking.value.code, token)
    // Payment confirmation usually arrives within seconds (provider webhook).
    if (booking.value.status === 'pending' && attempts++ < 60) poll = setTimeout(load, 3000)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else failed.value = true
  }
}

/** Celebrates a confirmed booking once per code (not on every visit of the tracking link). */
async function celebrate(code: string) {
  const key = `es-celebrated-${code}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    return
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#f97316', '#ec4899', '#8b5cf6', '#facc15']
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.35 }, colors })
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors })
    confetti({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors })
  }, 250)
}

watch(
  () => booking.value?.status,
  (status) => {
    if (status === 'paid' && booking.value) celebrate(booking.value.code)
  },
)

onMounted(load)
onBeforeUnmount(() => clearTimeout(poll))
</script>

<template>
  <div>
    <!-- ───────────── STATUS BAND ───────────── -->
    <section class="relative isolate overflow-hidden pt-28 pb-36 text-center text-white sm:pt-32">
      <StageBackdrop :spotlights="booking?.status === 'paid'" intensity="soft" />
      <div class="relative mx-auto max-w-2xl px-4">
        <template v-if="notFound">
          <XCircle class="mx-auto size-12 text-white/60" />
          <h1 class="mt-4 text-3xl font-extrabold">Réservation introuvable</h1>
          <p class="mt-2 text-white/70">
            Ouvre le lien reçu par email ou WhatsApp après ton paiement.
          </p>
        </template>
        <template v-else-if="heading && booking">
          <div class="mx-auto mb-5 grid size-16 place-items-center">
            <span
              v-if="booking.status === 'pending'"
              class="size-14 animate-spin rounded-full border-4 border-white/20 border-t-brand-400"
            />
            <span
              v-else-if="booking.status === 'paid'"
              class="relative grid size-16 animate-pop place-items-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgb(16_185_129_/_0.55)]"
            >
              <span class="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />
              <CircleCheckBig class="relative size-8" />
            </span>
            <span
              v-else-if="booking.status === 'requested'"
              class="grid size-16 place-items-center rounded-full bg-white/10"
            >
              <Clock class="size-8 text-brand-300" />
            </span>
            <span v-else class="grid size-16 place-items-center rounded-full bg-white/10">
              <AlertTriangle class="size-8 text-amber-300" />
            </span>
          </div>
          <h1 class="animate-fade-up text-3xl font-extrabold sm:text-4xl">{{ heading.title }}</h1>
          <p v-if="heading.text" class="mt-2 animate-fade-up text-white/75 [animation-delay:80ms]">
            {{ heading.text }}
          </p>
        </template>
        <div
          v-else-if="!failed"
          class="mx-auto size-14 animate-spin rounded-full border-4 border-white/20 border-t-brand-400"
        />
      </div>
    </section>

    <div class="relative mx-auto -mt-24 max-w-2xl space-y-6 px-4 pb-20">
      <p v-if="failed" class="alert-error">Impossible de charger ta réservation pour le moment.</p>
      <div v-else-if="notFound" class="card text-center">
        <RouterLink :to="{ name: 'home' }" class="btn-primary">Voir les événements</RouterLink>
      </div>
      <div v-else-if="!booking" class="skeleton h-80 rounded-4xl" />

      <template v-else>
        <!-- Ticket -->
        <article
          class="animate-fade-up overflow-hidden rounded-4xl bg-white shadow-lift [animation-delay:120ms]"
        >
          <header
            v-if="booking.event"
            class="bg-night-900 bg-[radial-gradient(circle_at_top_right,rgb(236_72_153_/_0.4),transparent_55%),radial-gradient(circle_at_bottom_left,rgb(249_115_22_/_0.35),transparent_55%)] px-6 py-6 text-white sm:px-8"
          >
            <p class="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">Ton billet</p>
            <RouterLink
              :to="{ name: 'event', params: { slug: booking.event.slug } }"
              class="mt-1 block font-display text-2xl font-extrabold hover:underline"
            >
              {{ booking.event.name }}
            </RouterLink>
            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
              <span class="inline-flex items-center gap-1.5 first-letter:uppercase">
                <CalendarDays class="size-4" /> {{ formatEventDate(booking.event.starts_at) }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <MapPin class="size-4" /> {{ booking.event.venue }}, {{ booking.event.city }}
              </span>
            </div>
          </header>
          <!-- Stay outside any event: the listing and its dates -->
          <header
            v-else
            class="bg-night-900 bg-[radial-gradient(circle_at_top_right,rgb(236_72_153_/_0.4),transparent_55%),radial-gradient(circle_at_bottom_left,rgb(249_115_22_/_0.35),transparent_55%)] px-6 py-6 text-white sm:px-8"
          >
            <p class="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">
              {{ booking.session ? 'Ta séance' : 'Ton billet' }}
            </p>
            <p class="mt-1 font-display text-2xl font-extrabold">{{ booking.items[0]?.title }}</p>
            <p
              v-if="booking.session"
              class="mt-3 inline-flex items-center gap-1.5 text-sm text-white/80 first-letter:uppercase"
            >
              <CalendarDays class="size-4" /> {{ formatSessionDate(booking.session.starts_at) }}
              <template v-if="booking.session.minutes">
                · {{ booking.session.minutes }} min</template
              >
            </p>
            <p
              v-if="booking.items[0]?.stay_starts_on && booking.items[0]?.stay_ends_on"
              class="mt-3 inline-flex items-center gap-1.5 text-sm text-white/80"
            >
              <CalendarDays class="size-4" />
              {{ formatStayRange(booking.items[0].stay_starts_on, booking.items[0].stay_ends_on) }}
            </p>
          </header>

          <!-- Perforation -->
          <div class="relative h-0">
            <span class="absolute -top-4 -left-4 size-8 rounded-full bg-surface" />
            <span class="absolute -top-4 -right-4 size-8 rounded-full bg-surface" />
            <span class="absolute inset-x-6 top-0 border-t-2 border-dashed border-stone-200" />
          </div>

          <div class="space-y-6 px-6 py-7 sm:px-8">
            <div
              v-if="booking.status === 'paid'"
              class="grid items-center gap-6 sm:grid-cols-[auto_1fr]"
            >
              <div class="mx-auto rounded-3xl border border-stone-200 p-3 shadow-sm">
                <img v-if="qrUrl" :src="qrUrl" alt="QR code de la réservation" class="size-44" />
              </div>
              <div class="text-center sm:text-left">
                <p class="text-sm text-muted">Code de réservation</p>
                <p class="font-mono text-3xl font-bold tracking-wider">{{ booking.code }}</p>
                <p class="mt-2 text-sm text-muted">
                  Présente ce QR code ou ce code au partenaire à ton arrivée.
                </p>
              </div>
            </div>

            <div
              v-else-if="booking.status !== 'pending' && booking.status !== 'requested'"
              class="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700"
            >
              <template v-if="booking.status === 'failed'">
                Le paiement n'a pas abouti. Aucun montant n'a été débité : tu peux réessayer.
              </template>
              <template v-else-if="booking.status === 'expired'">
                Le délai de paiement est dépassé et les unités ont été remises en vente. Tu peux
                refaire une réservation.
              </template>
              <template v-else-if="booking.status === 'cancelled'">
                Réservation annulée.
                <template
                  v-if="
                    booking.session &&
                    (booking.cancelled_by === 'partner' || booking.cancelled_by === 'system') &&
                    booking.cancellation_reason
                  "
                >
                  {{ booking.cancellation_reason }}
                </template>
                <template v-if="booking.refund_amount">
                  Un remboursement de
                  <strong class="text-ink">{{ formatXof(booking.refund_amount) }}</strong> est en
                  cours sur ton moyen de paiement<template v-if="booking.penalty_amount">
                    (pénalité retenue : {{ formatXof(booking.penalty_amount) }})</template
                  >.
                </template>
              </template>
              <template v-else-if="booking.status === 'conflict'">
                Ton paiement est arrivé après que l'offre a été réservée entièrement. On te
                rembourse en entier et notre équipe te contacte.
              </template>
            </div>

            <!-- Lines -->
            <div class="space-y-2 text-sm">
              <div
                v-for="item in booking.items"
                :key="item.listing_id"
                class="flex justify-between gap-4"
              >
                <span>
                  {{ item.title }} <span class="text-muted">× {{ item.quantity }}</span>
                  <span
                    v-if="item.stay_starts_on && item.stay_ends_on"
                    class="mt-0.5 block text-xs text-brand-700"
                  >
                    {{ formatStayRange(item.stay_starts_on, item.stay_ends_on) }} ·
                    {{ durationLabel(item.pricing_unit, item.duration) }}
                  </span>
                  <span
                    v-else-if="item.session_starts_at"
                    class="mt-0.5 block text-xs text-brand-700 first-letter:uppercase"
                  >
                    {{ formatSessionDate(item.session_starts_at) }} · {{ item.session_minutes }} min
                  </span>
                </span>
                <span class="font-medium">{{ formatXof(item.total) }}</span>
              </div>
            </div>

            <PriceDetail
              :partner-base="
                booking.price_breakdown.partner_amount - booking.price_breakdown.markup_amount
              "
              :markup-bp="booking.items[0]?.markup_bp ?? 0"
              :markup-amount="booking.price_breakdown.markup_amount"
              :service-fee="booking.price_breakdown.service_fee"
              :total="booking.price_breakdown.total"
              :rental-cost="booking.price_breakdown.service_price_total"
              :balance="booking.price_breakdown.balance_due_on_site"
              :deductible="booking.items.every((item) => item.is_deductible)"
              :grand-total="booking.price_breakdown.grand_total"
              :paid="booking.status === 'paid' || booking.status === 'requested'"
              :session="!!booking.session"
            />

            <div class="grid gap-2 text-sm text-muted sm:grid-cols-2">
              <p class="flex items-start gap-2">
                <User class="mt-0.5 size-4 shrink-0" />
                <span>{{ booking.customer.name }} · {{ booking.customer.phone }}</span>
              </p>
              <p v-if="booking.status === 'paid'" class="flex items-start gap-2">
                <component
                  :is="booking.cancellable_until ? RotateCcw : Clock"
                  class="mt-0.5 size-4 shrink-0"
                />
                <span v-if="booking.cancellable_until">
                  Annulable jusqu'au {{ formatEventDate(booking.cancellable_until) }} (pénalité
                  {{ formatRate(booking.cancellation_penalty_bp) }}).
                </span>
                <span v-else>Cette réservation n'est pas annulable.</span>
              </p>
            </div>
          </div>
        </article>

        <SessionPanel
          v-if="booking.session && token"
          :booking="booking"
          :token="token"
          @updated="booking = $event"
        />

        <CancelBookingPanel
          v-if="(booking.status === 'paid' || booking.status === 'requested') && token"
          :booking="booking"
          :token="token"
          @cancelled="booking = $event"
        />
      </template>
    </div>
  </div>
</template>

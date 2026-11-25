<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Crown, ListOrdered, Timer } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import { api, ApiError } from '@/lib/api'
import { countdownTo, formatXof } from '@/lib/format'
import type { ManagedVideo, Purchase, SpotlightState } from '@/types/discovery'

/**
 * "À la une" (V3, lot F5, RG49): the daily auction for the top of Découvrir. The partner sees the
 * ranking (amounts only), its place, and adds to its total of the day with Mobile Money.
 */
const route = useRoute()
const router = useRouter()
const state = ref<SpotlightState | null>(null)
const videos = ref<ManagedVideo[]>([])
const loadError = ref<string | null>(null)

const videoId = ref<number | null>(Number(route.query.video) || null)
const amount = ref<number | ''>('')
const paymentMethod = ref('')
const paymentMethodRequired = ref(false)
const payError = ref<string | null>(null)
const paying = ref(false)
const switched = ref(false)

async function loadState() {
  try {
    state.value = (await api.get<{ data: SpotlightState }>('/api/v1/partner/spotlight')).data
    loadError.value = null
  } catch {
    loadError.value = 'Impossible de charger le classement du jour.'
  }
}
async function loadVideos() {
  try {
    const all = (await api.get<{ data: ManagedVideo[] }>('/api/v1/partner/videos')).data
    videos.value = all.filter((v) => v.status === 'published')
    videoId.value ??= state.value?.mine?.video_id ?? videos.value[0]?.id ?? null
  } catch {
    videos.value = []
  }
}

const mine = computed(() => state.value?.mine ?? null)
const myTotal = computed(() => mine.value?.amount ?? 0)
/** Amount to add to be first (null: already first). */
const toLeadTopUp = computed(() =>
  state.value?.to_lead != null ? state.value.to_lead - myTotal.value : null,
)
const newTotal = computed(() => myTotal.value + (Number(amount.value) || 0))
/** At equal amounts, the bids already there stay ahead. */
const expectedRank = computed(() => {
  const others = state.value?.ranking.filter((r) => !r.mine) ?? []
  return 1 + others.filter((r) => r.amount >= newTotal.value).length
})
const shortcuts = computed(() => {
  if (!state.value) return []
  const list: { label: string; value: number }[] = []
  if (toLeadTopUp.value !== null) {
    list.push({ label: `Passer n°1 · +${formatXof(toLeadTopUp.value)}`, value: toLeadTopUp.value })
  }
  for (const extra of [500, 1000, 2000]) {
    const value = Math.max(extra, state.value.min_bid - myTotal.value)
    if (!list.some((s) => s.value === value)) list.push({ label: `+${formatXof(value)}`, value })
  }
  return list
})

watch(
  () => state.value?.to_lead,
  () => {
    if (amount.value === '' && toLeadTopUp.value !== null) amount.value = toLeadTopUp.value
  },
)

// Midnight countdown, refreshed every 30 seconds with the ranking (others keep bidding).
const now = ref(Date.now())
const countdown = computed(() => (state.value ? countdownTo(state.value.ends_at, now.value) : null))
let refreshTimer: ReturnType<typeof setInterval> | undefined

/** Creates the purchase and goes to the provider's page; back on this page with ?achat=. */
async function pay() {
  payError.value = null
  if (!videoId.value) {
    payError.value = 'Choisissez la vidéo à mettre à la une.'
    return
  }
  if (paymentMethodRequired.value && !paymentMethod.value) {
    payError.value = 'Choisissez votre moyen de paiement.'
    return
  }
  paying.value = true
  try {
    const response = await api.post<{ data: Purchase & { payment_url: string } }>(
      '/api/v1/partner/spotlight',
      {
        video_id: videoId.value,
        amount: Number(amount.value) || 0,
        payment_method: paymentMethod.value || undefined,
      },
    )
    window.location.assign(response.data.payment_url)
  } catch (e) {
    payError.value =
      e instanceof ApiError
        ? (Object.values(e.errors)[0]?.[0] ?? e.detail ?? e.message)
        : 'Paiement impossible.'
    paying.value = false
  }
}

/** Already "À la une" today: another video, without paying again. */
async function switchVideo() {
  payError.value = null
  switched.value = false
  try {
    state.value = (
      await api.put<{ data: SpotlightState }>('/api/v1/partner/spotlight/video', {
        video_id: videoId.value,
      })
    ).data
    switched.value = true
  } catch (e) {
    payError.value =
      e instanceof ApiError
        ? (Object.values(e.errors)[0]?.[0] ?? e.message)
        : 'Changement impossible.'
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
    if (purchase.status === 'paid') {
      amount.value = ''
      await loadState()
    }
  } catch {
    // Unknown purchase: nothing to show.
  }
}

onMounted(async () => {
  await loadState()
  loadVideos()
  const purchase = Number(route.query.achat)
  if (purchase > 0) {
    followPurchase(purchase)
    router.replace({ query: { ...route.query, achat: undefined } })
  }
  refreshTimer = setInterval(() => {
    now.value = Date.now()
    loadState()
  }, 30_000)
})
onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(returnTimer)
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="À la une"
      subtitle="Chaque jour, la plus grosse mise place sa vidéo en premier dans Découvrir. Le classement repart à zéro à minuit."
      :icon="Crown"
    />

    <div v-if="loadError" class="alert-error">{{ loadError }}</div>

    <!-- Back from the payment page -->
    <template v-if="returned">
      <div v-if="returned.status === 'paid'" class="alert-success">
        Paiement {{ returned.reference }} reçu : {{ formatXof(returned.amount) }} ajoutés à votre
        total du jour.
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

    <ListSkeleton v-if="!state && !loadError" :rows="2" />

    <template v-else-if="state">
      <div v-if="!state.enabled" class="alert-info">
        « À la une » n’est pas proposé pour le moment.
      </div>
      <div v-else-if="!state.available" class="alert-error">
        Votre abonnement Vitrine est terminé : renouvelez-le dans
        <RouterLink :to="{ name: 'partner.videos' }" class="font-semibold underline">
          Mes vidéos
        </RouterLink>
        pour revenir dans Découvrir.
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="card space-y-5 p-5 sm:p-6">
          <!-- The partner's place -->
          <div
            class="flex flex-wrap items-center gap-4 rounded-3xl p-4"
            :class="mine?.rank === 1 ? 'bg-gold-400/20' : 'bg-stone-50'"
          >
            <span
              class="grid size-16 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold"
              :class="mine?.rank === 1 ? 'bg-gold-400 text-night-900' : 'bg-white text-stone-500'"
            >
              <template v-if="mine">n°{{ mine.rank }}</template>
              <Crown v-else class="size-7" />
            </span>
            <div class="min-w-0 flex-1 space-y-0.5">
              <template v-if="mine">
                <p class="font-semibold">Votre total du jour : {{ formatXof(mine.amount) }}</p>
                <p v-if="mine.rank === 1" class="text-sm text-stone-700">
                  Vous êtes n°1 : votre vidéo s’affiche en premier à chaque ouverture de Découvrir,
                  puis revient régulièrement pendant que le visiteur fait défiler.
                </p>
                <p v-else class="text-sm text-stone-700">
                  Votre vidéo passe avant les boosts. Pour être n°1, ajoutez
                  <strong>{{ formatXof(toLeadTopUp) }}</strong> (total
                  {{ formatXof(state.to_lead) }}).
                </p>
              </template>
              <template v-else>
                <p class="font-semibold">Vous n’êtes pas encore à la une aujourd’hui.</p>
                <p class="text-sm text-stone-700">
                  Mise minimale {{ formatXof(state.min_bid) }}.
                  <template v-if="state.to_lead !== null && state.ranking.length">
                    Pour être n°1 : {{ formatXof(state.to_lead) }}.
                  </template>
                </p>
              </template>
            </div>
          </div>

          <form v-if="state.enabled && state.available" class="space-y-5" @submit.prevent="pay">
            <div v-if="payError" class="alert-error">{{ payError }}</div>
            <div v-if="switched" class="alert-success">Vidéo changée, sans nouveau paiement.</div>

            <fieldset>
              <legend class="label">Vidéo à mettre à la une</legend>
              <p v-if="!videos.length" class="text-sm text-muted">
                Aucune vidéo en ligne : publiez-en une dans
                <RouterLink :to="{ name: 'partner.videos' }" class="font-semibold underline">
                  Mes vidéos
                </RouterLink>
                .
              </p>
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup">
                <button
                  v-for="v in videos"
                  :key="v.id"
                  type="button"
                  role="radio"
                  :aria-checked="videoId === v.id"
                  :aria-label="v.caption ?? `Vidéo n° ${v.id}`"
                  class="relative aspect-[9/16] overflow-hidden rounded-2xl bg-night-900 ring-offset-2 transition"
                  :class="
                    videoId === v.id ? 'ring-4 ring-gold-400' : 'opacity-70 hover:opacity-100'
                  "
                  @click="videoId = v.id"
                >
                  <img
                    v-if="v.cover_url"
                    :src="v.cover_url"
                    alt=""
                    class="size-full object-cover"
                    loading="lazy"
                  />
                  <span
                    v-if="mine?.video_id === v.id"
                    class="absolute inset-x-1 bottom-1 rounded-full bg-gold-400 px-1.5 py-0.5 text-[10px] font-bold text-night-900"
                  >
                    À la une
                  </span>
                </button>
              </div>
              <button
                v-if="mine && videoId && mine.video_id !== videoId"
                type="button"
                class="btn-secondary mt-3 px-4 py-2 text-sm"
                @click="switchVideo"
              >
                Afficher cette vidéo à la place (sans repayer)
              </button>
            </fieldset>

            <div>
              <label class="label" for="amount">
                {{ mine ? 'Montant à ajouter à votre total' : 'Votre mise' }} (FCFA)
              </label>
              <input
                id="amount"
                v-model.number="amount"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                class="input"
                required
              />
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="s in shortcuts"
                  :key="s.value"
                  type="button"
                  class="tab border border-stone-200"
                  :class="{ 'tab-active': amount === s.value }"
                  @click="amount = s.value"
                >
                  {{ s.label }}
                </button>
              </div>
              <p v-if="amount" class="mt-2 text-sm text-stone-700">
                Nouveau total : <strong>{{ formatXof(newTotal) }}</strong> · place prévue
                <strong>n°{{ expectedRank }}</strong>
              </p>
            </div>

            <PaymentMethodPicker v-model="paymentMethod" v-model:required="paymentMethodRequired" />

            <button
              type="submit"
              class="btn-primary w-full"
              :disabled="paying || !amount || !videoId"
            >
              {{ paying ? 'Redirection…' : `Payer ${formatXof(Number(amount) || 0)}` }}
            </button>
            <p class="text-xs text-muted">
              Valable aujourd’hui jusqu’à minuit, non remboursable. Votre vidéo porte la mention « À
              la une ». Si une autre vidéo passe devant vous, vous êtes prévenu par WhatsApp et
              pouvez compléter votre mise.
            </p>
          </form>
        </section>

        <!-- Ranking of the day: amounts only -->
        <aside class="card h-fit space-y-4 p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="section-title flex items-center gap-2">
              <ListOrdered class="size-5 text-brand-600" /> Classement du jour
            </h2>
            <span v-if="countdown" class="chip bg-stone-100 text-stone-700">
              <Timer class="size-3.5" /> fin dans {{ countdown.hours }} h
              {{ String(countdown.minutes).padStart(2, '0') }}
            </span>
          </div>
          <p v-if="!state.ranking.length" class="text-sm text-muted">
            Personne n’est encore à la une aujourd’hui : la première place est à vous dès
            {{ formatXof(state.min_bid) }}.
          </p>
          <ol v-else class="divide-y divide-stone-100">
            <li
              v-for="row in state.ranking"
              :key="row.rank"
              class="flex items-center justify-between gap-3 py-2.5 text-sm"
              :class="{ 'font-semibold': row.mine }"
            >
              <span class="flex items-center gap-2">
                <span
                  class="grid size-7 place-items-center rounded-full text-xs font-bold"
                  :class="row.rank === 1 ? 'bg-gold-400 text-night-900' : 'bg-stone-100'"
                >
                  {{ row.rank }}
                </span>
                {{ row.mine ? 'Vous' : 'Autre établissement' }}
              </span>
              <span>{{ formatXof(row.amount) }}</span>
            </li>
          </ol>
          <ul class="list-disc space-y-1 pl-5 text-xs text-stone-600">
            <li>La plus grosse mise est n°1 ; à montant égal, le premier arrivé garde sa place.</li>
            <li>
              Pour passer devant une mise, il faut au moins {{ formatXof(state.increment) }} de
              plus.
            </li>
            <li>Toutes les vidéos à la une passent avant les boosts, dans l’ordre des mises.</li>
            <li>Le n°1 revient aussi régulièrement pendant que le visiteur fait défiler.</li>
          </ul>
        </aside>
      </div>
    </template>
  </div>
</template>

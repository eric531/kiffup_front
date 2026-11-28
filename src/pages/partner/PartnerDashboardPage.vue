<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Phone,
  ScanLine,
  Unlock,
  UserRoundCheck,
  Wallet,
} from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatEventDate, formatShortDate, formatXof } from '@/lib/format'
import { LISTING_TYPE_GRADIENTS, LISTING_TYPE_ICONS } from '@/lib/icons'
import DashboardHero from '@/components/DashboardHero.vue'
import PartnerProfileChecklist from '@/components/PartnerProfileChecklist.vue'
import StatCard from '@/components/StatCard.vue'
import OccupancyGrid from '@/components/OccupancyGrid.vue'
import {
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
  PAYOUT_METHOD_LABELS,
  type Listing,
  type Partner,
} from '@/types/catalog'
import type { PartnerFinance } from '@/types/finance'
import type { PartnerBookingLine } from '@/types/partnerArea'

const partner = ref<Partner | null>(null)
const listings = ref<Listing[]>([])
const finance = ref<PartnerFinance | null>(null)
const bookings = ref<PartnerBookingLine[]>([])
const error = ref<string | null>(null)
const loading = ref(true)

const paid = computed(() => bookings.value.filter((b) => b.status === 'paid'))
const expected = computed(() =>
  paid.value
    .filter((b) => !b.checked_in_at)
    .sort((a, b) => (a.event?.starts_at ?? '').localeCompare(b.event?.starts_at ?? '')),
)
const arrived = computed(() => paid.value.filter((b) => b.checked_in_at).length)
const toCollect = computed(() =>
  expected.value.reduce((sum, b) => sum + (b.balance_due_on_site ?? 0), 0),
)
const releases = computed(() => finance.value?.upcoming_releases.slice(0, 4) ?? [])

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
/** Units already sold on the nights of an event package. */
const soldOnPackage = (listing: Listing, available: number) =>
  Math.max(0, listing.units - available)
const packagePercent = (listing: Listing, available: number) =>
  listing.units
    ? `${Math.min(100, (soldOnPackage(listing, available) / listing.units) * 100)}%`
    : '0%'

onMounted(async () => {
  try {
    const [profile, listingsResponse, balance, lines] = await Promise.all([
      api.get<{ data: Partner }>('/api/v1/partner/profile'),
      api.get<{ data: Listing[] }>('/api/v1/partner/listings'),
      api.get<{ data: PartnerFinance }>('/api/v1/partner/balance'),
      api.get<{ data: PartnerBookingLine[] }>('/api/v1/partner/bookings'),
    ])
    partner.value = profile.data
    listings.value = listingsResponse.data
    finance.value = balance.data
    bookings.value = lines.data
  } catch {
    error.value =
      "Impossible de charger votre espace. Contactez l'équipe KiffUp si le problème persiste."
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-8">
    <div v-if="loading" class="space-y-6">
      <div class="skeleton h-64 rounded-4xl" />
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="n in 4" :key="n" class="skeleton h-32 rounded-3xl" />
      </div>
    </div>
    <div v-else-if="error" class="alert-error">{{ error }}</div>

    <template v-else-if="partner">
      <DashboardHero
        :title="partner.name"
        subtitle="Vos réservations, vos arrivées et vos gains en un coup d'œil."
      >
        <template #actions>
          <RouterLink :to="{ name: 'partner.check-in' }" class="btn-light">
            <ScanLine class="size-4" /> Scanner<span class="hidden sm:inline"> une arrivée</span>
          </RouterLink>
          <RouterLink :to="{ name: 'partner.balance' }" class="btn-glass">
            <Wallet class="size-4" /> Retirer<span class="hidden sm:inline"> mon argent</span>
          </RouterLink>
        </template>

        <div v-if="finance" class="grid grid-cols-2 gap-3">
          <div class="glass flex items-center gap-3 rounded-2xl px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <span
              class="hidden size-11 shrink-0 place-items-center rounded-2xl bg-sunset shadow-glow sm:grid"
            >
              <Unlock class="size-5" />
            </span>
            <div>
              <p class="text-xs text-white/60">Disponible au retrait</p>
              <p class="font-display text-lg font-extrabold tabular-nums sm:text-2xl">
                {{ formatXof(finance.balances.available) }}
              </p>
            </div>
          </div>
          <div class="glass flex items-center gap-3 rounded-2xl px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <span
              class="hidden size-11 shrink-0 place-items-center rounded-2xl bg-white/10 sm:grid"
            >
              <Lock class="size-5" />
            </span>
            <div>
              <p class="text-xs text-white/60">Bloqué 48 h</p>
              <p class="font-display text-lg font-extrabold tabular-nums sm:text-2xl">
                {{ formatXof(finance.balances.locked) }}
              </p>
              <p v-if="releases[0]?.available_at" class="text-xs text-white/60">
                Prochain déblocage le {{ formatEventDate(releases[0].available_at) }}
              </p>
            </div>
          </div>
        </div>
      </DashboardHero>

      <PartnerProfileChecklist :partner="partner" />

      <!-- Key figures -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          v-reveal
          label="Réservations payées"
          :value="paid.length"
          format="count"
          :icon="CheckCircle2"
          tone="emerald"
        />
        <StatCard
          v-reveal="80"
          label="Arrivées attendues"
          :value="expected.length"
          format="count"
          :icon="CalendarClock"
          tone="amber"
        />
        <StatCard
          v-reveal="160"
          label="Clients arrivés"
          :value="arrived"
          format="count"
          :icon="UserRoundCheck"
          tone="sky"
        />
        <StatCard
          v-reveal="240"
          label="À encaisser sur place"
          :value="toCollect"
          :icon="Wallet"
          tone="flare"
          hint="Reste dû par les clients attendus"
        />
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <!-- Upcoming arrivals -->
        <section v-reveal class="card p-0">
          <div class="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 class="font-display text-lg font-bold">Prochaines arrivées</h2>
            <RouterLink
              :to="{ name: 'partner.bookings' }"
              class="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              Tout voir <ArrowRight class="size-3.5" />
            </RouterLink>
          </div>
          <div v-if="expected.length === 0" class="px-6 py-12 text-center">
            <span
              class="mx-auto grid size-12 place-items-center rounded-2xl bg-stone-100 text-muted"
            >
              <CalendarClock class="size-6" />
            </span>
            <p class="mt-3 text-sm text-muted">Aucune arrivée attendue pour le moment.</p>
          </div>
          <ul v-else class="mt-3 divide-y divide-stone-100">
            <li
              v-for="line in expected.slice(0, 6)"
              :key="line.code"
              class="flex items-center gap-4 px-5 py-3.5 transition hover:bg-brand-50/40 sm:px-6"
            >
              <span
                class="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-pink-100 text-sm font-bold text-brand-800"
              >
                {{ initials(line.customer.name) }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ line.customer.name }}</p>
                <p class="truncate text-sm text-muted">
                  {{ line.title }} × {{ line.quantity }}
                  <template v-if="line.event">
                    · {{ formatShortDate(line.event.starts_at) }}</template
                  >
                </p>
              </div>
              <div class="hidden text-right sm:block">
                <p class="font-mono text-sm font-bold">{{ line.code }}</p>
                <p v-if="line.balance_due_on_site !== null" class="text-xs text-muted">
                  {{ formatXof(line.balance_due_on_site) }} sur place
                </p>
              </div>
              <a
                :href="`tel:${line.customer.phone}`"
                class="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 transition hover:bg-brand-100 hover:text-brand-700"
                :aria-label="`Appeler ${line.customer.name}`"
              >
                <Phone class="size-4" />
              </a>
            </li>
          </ul>
        </section>

        <aside class="space-y-6">
          <!-- Releases timeline -->
          <section v-reveal="100" class="card">
            <h2 class="font-display text-lg font-bold">Prochains déblocages</h2>
            <p v-if="releases.length === 0" class="mt-2 text-sm text-muted">
              Rien en attente de déblocage.
            </p>
            <ol
              v-else
              class="relative mt-4 space-y-4 border-l-2 border-dashed border-stone-200 pl-5"
            >
              <li
                v-for="release in releases"
                :key="release.reference ?? release.available_at ?? ''"
                class="relative"
              >
                <span
                  class="absolute top-1 -left-[1.6rem] size-3 rounded-full bg-sunset ring-4 ring-white"
                />
                <p class="font-semibold tabular-nums">{{ formatXof(release.amount) }}</p>
                <p class="flex items-center gap-1.5 text-xs text-muted">
                  <Clock class="size-3" />
                  {{
                    release.available_at ? formatEventDate(release.available_at) : 'Date à venir'
                  }}
                </p>
              </li>
            </ol>
          </section>

          <!-- Profile -->
          <section v-reveal="160" class="card space-y-3 text-sm">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-lg font-bold">Mon établissement</h2>
              <RouterLink :to="{ name: 'partner.profile' }" class="btn-ghost px-3 py-1.5 text-sm">
                Ma fiche
              </RouterLink>
            </div>
            <p class="flex items-center gap-2.5">
              <Phone class="size-4 text-brand-600" /> {{ partner.phone }}
            </p>
            <p class="flex items-center gap-2.5">
              <MapPin class="size-4 text-brand-600" /> {{ partner.city ?? 'Ville à compléter' }}
            </p>
            <p class="flex items-start gap-2.5">
              <Wallet class="mt-0.5 size-4 shrink-0 text-brand-600" />
              <span>
                {{
                  partner.payout_method
                    ? PAYOUT_METHOD_LABELS[partner.payout_method]
                    : 'Moyen de retrait non renseigné'
                }}
                <span v-if="partner.payout_account" class="text-muted"
                  >· {{ partner.payout_account }}</span
                >
              </span>
            </p>
          </section>
        </aside>
      </div>

      <OccupancyGrid v-reveal />

      <!-- Listings -->
      <section class="space-y-4">
        <div v-reveal class="flex items-center justify-between gap-3">
          <h2 class="font-display text-lg font-bold">Mes offres</h2>
          <RouterLink :to="{ name: 'partner.listings' }" class="btn-ghost text-sm">
            Voir et modifier
          </RouterLink>
        </div>
        <p v-if="listings.length === 0" class="card text-sm text-muted">
          Aucune offre pour le moment.
        </p>
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="(listing, i) in listings"
            :key="listing.id"
            v-reveal="(i % 3) * 80"
            class="card card-hover overflow-hidden p-0"
          >
            <div
              class="relative flex h-24 items-end overflow-hidden bg-gradient-to-br px-5 pb-3"
              :class="LISTING_TYPE_GRADIENTS[listing.type]"
            >
              <img
                v-if="listing.photos[0]"
                :src="listing.photos[0].url"
                alt=""
                class="absolute inset-0 size-full object-cover opacity-60"
              />
              <component
                :is="LISTING_TYPE_ICONS[listing.type]"
                class="absolute -right-3 -bottom-4 size-24 rotate-[-12deg] text-white/15"
              />
              <span class="chip relative bg-white/90 text-ink">
                <component :is="LISTING_TYPE_ICONS[listing.type]" class="size-3.5 text-brand-600" />
                {{ LISTING_TYPE_LABELS[listing.type] }}
              </span>
              <span
                class="chip absolute top-3 right-3"
                :class="
                  listing.status === 'active'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/80 text-stone-700'
                "
              >
                {{ LISTING_STATUS_LABELS[listing.status] }}
              </span>
            </div>
            <div class="space-y-4 p-5">
              <p class="font-semibold">{{ listing.title }}</p>
              <p class="text-xs text-muted">
                {{ listing.units }} unité{{ listing.units > 1 ? 's' : '' }} · vous recevez :
              </p>
              <ul class="space-y-2 text-sm">
                <li v-if="listing.night_amount != null" class="flex justify-between gap-3">
                  <span class="text-muted">À la nuit</span>
                  <strong class="tabular-nums">{{ formatXof(listing.night_amount) }}</strong>
                </li>
                <li v-if="listing.day_amount != null" class="flex justify-between gap-3">
                  <span class="text-muted">Au jour</span>
                  <strong class="tabular-nums">{{ formatXof(listing.day_amount) }}</strong>
                </li>
                <li
                  v-for="proposal in (listing.proposals ?? []).filter((p) => p.package)"
                  :key="proposal.id"
                  class="space-y-1.5 rounded-2xl bg-surface px-3 py-2.5"
                >
                  <div class="flex justify-between gap-3">
                    <span class="truncate text-muted">Forfait {{ proposal.event?.name }}</span>
                    <strong class="tabular-nums">{{
                      formatXof(
                        proposal.package!.partner_amount_now ?? proposal.package!.partner_amount,
                      )
                    }}</strong>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-muted">Vendu sur les nuits du forfait</span>
                    <span class="font-semibold tabular-nums"
                      >{{ soldOnPackage(listing, proposal.package!.available) }} /
                      {{ listing.units }}</span
                    >
                  </div>
                  <span class="block h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <span
                      class="block h-full rounded-full bg-sunset"
                      :style="{ width: packagePercent(listing, proposal.package!.available) }"
                    />
                  </span>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

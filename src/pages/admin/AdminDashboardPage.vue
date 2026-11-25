<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Crown,
  BadgePercent,
  CircleDollarSign,
  Clapperboard,
  CreditCard,
  Hourglass,
  Lock,
  ReceiptText,
  Rocket,
  ShoppingBag,
  TrendingUp,
  Unlock,
  Wallet,
} from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatXof } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { FinanceSummary } from '@/types/finance'
import type { ReportOverview } from '@/types/reporting'
import DashboardHero from '@/components/DashboardHero.vue'
import StatCard from '@/components/StatCard.vue'
import SalesChart from '@/components/SalesChart.vue'
import EventReportsTable from '@/components/EventReportsTable.vue'

const auth = useAuthStore()
const summary = ref<FinanceSummary | null>(null)
const report = ref<ReportOverview | null>(null)
const failed = ref(false)

const firstName = computed(() => auth.user?.name.split(/\s+/)[0] ?? '')
const recentDays = computed(() => report.value?.daily.slice(-14) ?? [])
const heroStats = computed(() =>
  report.value
    ? [
        { label: 'Encaissé', value: formatXof(report.value.totals.revenue) },
        { label: 'Commandes', value: String(report.value.totals.orders) },
        { label: 'Unités vendues', value: String(report.value.totals.units) },
        { label: 'Commission', value: formatXof(report.value.totals.commission) },
      ]
    : [],
)

onMounted(async () => {
  try {
    const [finance, overview] = await Promise.all([
      api.get<{ data: FinanceSummary }>('/api/v1/admin/finance/summary'),
      api.get<{ data: ReportOverview }>('/api/v1/admin/reports/overview', { days: 30 }),
    ])
    summary.value = finance.data
    report.value = overview.data
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <div class="space-y-8">
    <DashboardHero
      :title="`Bonjour ${firstName}`"
      subtitle="Voici l'activité de la plateforme sur les 30 derniers jours."
    >
      <template #actions>
        <RouterLink :to="{ name: 'admin.bookings' }" class="btn-glass">
          <ReceiptText class="size-4" /> Réservations
        </RouterLink>
        <RouterLink :to="{ name: 'admin.withdrawals' }" class="btn-light">
          <Banknote class="size-4" /> Retraits
          <span
            v-if="summary?.withdrawals_failed_recent"
            class="grid size-5 place-items-center rounded-full bg-red-600 text-[11px] text-white"
            :title="`${summary.withdrawals_failed_recent} virement(s) échoué(s) ces 7 derniers jours`"
          >
            {{ summary.withdrawals_failed_recent }}
          </span>
        </RouterLink>
      </template>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <template v-if="report">
          <div v-for="stat in heroStats" :key="stat.label" class="glass rounded-2xl px-4 py-3.5">
            <p class="text-xs text-white/60">{{ stat.label }}</p>
            <p
              class="mt-1 font-display text-lg font-extrabold whitespace-nowrap tabular-nums sm:text-2xl"
            >
              {{ stat.value }}
            </p>
          </div>
        </template>
        <template v-else-if="!failed">
          <div v-for="n in 4" :key="n" class="h-[4.6rem] animate-pulse rounded-2xl bg-white/10" />
        </template>
      </div>
    </DashboardHero>

    <p v-if="failed" class="alert-error">
      Impossible de charger le tableau de bord pour le moment.
    </p>

    <RouterLink
      v-if="summary?.refunds_to_handle"
      :to="{ name: 'admin.bookings' }"
      class="flex items-center gap-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-900 transition hover:shadow-card"
    >
      <span
        class="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-red-600 text-white"
      >
        <span class="absolute inset-0 animate-pulse-ring rounded-2xl bg-red-500" />
        <AlertTriangle class="relative size-5" />
      </span>
      <span class="flex-1 text-sm">
        <strong>{{ summary.refunds_to_handle }} remboursement(s) client</strong> à traiter
        manuellement (échec ou attente du prestataire).
      </span>
      <ArrowRight class="size-4 shrink-0" />
    </RouterLink>

    <SalesChart v-if="report" v-reveal :days="recentDays" />
    <div v-else-if="!failed" class="skeleton h-72 rounded-3xl" />

    <div v-if="summary" class="grid gap-8 xl:grid-cols-2">
      <section v-reveal class="space-y-3">
        <h2 class="font-display text-lg font-bold">Revenus de la plateforme</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Commissions"
            :value="summary.platform.commission"
            :icon="BadgePercent"
            tone="brand"
          />
          <StatCard
            label="Pénalités d'annulation"
            :value="summary.platform.penalties"
            :icon="Hourglass"
            tone="dusk"
          />
          <StatCard
            label="Frais de paiement"
            :value="Math.abs(summary.platform.gateway_fees)"
            :icon="CreditCard"
            tone="red"
            hint="Prélevés par le prestataire"
          />
          <StatCard
            label="Marge nette"
            :value="summary.platform.net"
            :icon="TrendingUp"
            tone="emerald"
            :hint="
              summary.platform.promotions ||
              summary.platform.vitrine_passes ||
              summary.platform.withdrawal_fees
                ? [
                    summary.platform.promotions
                      ? `Dont ${formatXof(summary.platform.promotions)} de boosts, « À la une » et abonnements`
                      : '',
                    summary.platform.vitrine_passes
                      ? `${formatXof(summary.platform.vitrine_passes)} de Pass Vitrine`
                      : '',
                    summary.platform.withdrawal_fees
                      ? `${formatXof(summary.platform.withdrawal_fees)} de frais de retrait`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : undefined
            "
          />
        </div>
      </section>

      <section v-reveal="100" class="space-y-3">
        <h2 class="font-display text-lg font-bold">Dû aux partenaires</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Bloqué"
            :value="summary.partners.locked"
            :icon="Lock"
            tone="amber"
            hint="Débloqué 48 h après chaque réservation"
          />
          <StatCard
            label="Disponible"
            :value="summary.partners.available"
            :icon="Unlock"
            tone="sky"
          />
          <StatCard
            label="Virements en cours"
            :value="summary.withdrawals_processing.amount"
            :icon="Wallet"
            tone="flare"
          >
            <RouterLink
              v-if="summary.withdrawals_failed_recent"
              :to="{ name: 'admin.withdrawals' }"
              class="font-semibold text-red-700 hover:underline"
            >
              {{ summary.withdrawals_failed_recent }} échoué(s) cette semaine →
            </RouterLink>
            <template v-else-if="summary.withdrawals_processing.count">
              {{ summary.withdrawals_processing.count }} en attente du prestataire
            </template>
            <template v-else>Retraits envoyés automatiquement</template>
          </StatCard>
          <StatCard
            label="Déjà versé"
            :value="summary.partners.paid_out"
            :icon="CircleDollarSign"
            tone="emerald"
          />
        </div>
      </section>
    </div>
    <div v-else-if="!failed" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="n in 4" :key="n" class="skeleton h-32 rounded-3xl" />
    </div>

    <section v-if="report" v-reveal class="space-y-3">
      <h2 class="font-display text-lg font-bold">Découvrir</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Réservations venues d’une vidéo"
          :value="report.discovery.bookings.revenue"
          :icon="ShoppingBag"
          tone="emerald"
          :hint="`${report.discovery.bookings.orders} réservation(s) · ${formatXof(report.discovery.bookings.commission)} de commission`"
        />
        <StatCard
          label="Boosts payés"
          :value="report.discovery.boosts.amount"
          :icon="Rocket"
          tone="flare"
          :hint="`${report.discovery.boosts.count} boost(s) · ${report.discovery.active_boosts} vidéo(s) boostée(s) en ce moment`"
        />
        <StatCard
          label="Abonnements Vitrine"
          :value="report.discovery.subscriptions.amount"
          :icon="Clapperboard"
          tone="dusk"
          :hint="`${report.discovery.subscriptions.count} paiement(s)`"
        />
        <StatCard
          label="À la une"
          :value="report.discovery.spotlights.amount"
          :icon="Crown"
          tone="amber"
          :hint="`${report.discovery.spotlights.count} mise(s) payée(s)`"
        />
      </div>
    </section>

    <EventReportsTable v-if="report" v-reveal :events="report.events" />
  </div>
</template>

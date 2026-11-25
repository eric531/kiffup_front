<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/lib/api'
import { formatShortDate, formatXof } from '@/lib/format'
import { PAYOUT_METHOD_LABELS, type PayoutMethod } from '@/types/catalog'
import type { Paginated } from '@/types/identity'
import { WITHDRAWAL_STATUS_LABELS, type Withdrawal, type WithdrawalStatus } from '@/types/finance'
import { Banknote, Info } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

/** Instant withdrawals: sent by the payout provider without validation, followed here (read only). */
const statusOptions: { value: WithdrawalStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'processing', label: 'En cours d’envoi' },
  { value: 'paid', label: 'Versés' },
  { value: 'failed', label: 'Échoués' },
]
const STATUS_BADGES: Record<WithdrawalStatus, string> = {
  processing: 'badge-info',
  paid: 'badge-success',
  failed: 'badge-danger',
  requested: 'badge-warning',
  rejected: 'badge-neutral',
}
const withdrawals = ref<Withdrawal[]>([])
const status = ref<WithdrawalStatus | ''>('')
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    withdrawals.value = (
      await api.get<Paginated<Withdrawal>>('/api/v1/admin/withdrawals', {
        status: status.value || undefined,
        per_page: 100,
      })
    ).data
  } finally {
    loading.value = false
  }
}

watch(status, load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Retraits partenaires"
      subtitle="Envoyés automatiquement par le prestataire de virement, sans validation."
      :icon="Banknote"
    />

    <p
      class="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
    >
      <Info class="mt-0.5 size-4 shrink-0" />
      <span>
        Le partenaire retire lui-même son solde disponible, après confirmation par un code. Un
        virement échoué est remis automatiquement sur son solde ; il peut réessayer. Les virements
        en cours sont vérifiés auprès du prestataire toutes les 5 minutes.
      </span>
    </p>

    <div class="tabs" role="group" aria-label="Statut">
      <button
        v-for="option in statusOptions"
        :key="option.value"
        class="tab"
        :class="{ 'tab-active': status === option.value }"
        :aria-pressed="status === option.value"
        @click="status = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <ListSkeleton v-if="loading" :rows="3" />
    <EmptyState
      v-else-if="withdrawals.length === 0"
      :icon="Banknote"
      title="Aucun retrait"
      text="Les retraits des partenaires apparaîtront ici."
    />

    <ul v-else class="space-y-3">
      <li
        v-for="(withdrawal, i) in withdrawals"
        :key="withdrawal.id"
        v-reveal="Math.min(i, 4) * 50"
        class="card flex flex-wrap items-start gap-4"
      >
        <span
          class="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-pink-100 text-brand-700"
        >
          <Banknote class="size-5" />
        </span>
        <div class="min-w-0 flex-1 space-y-1">
          <p class="font-semibold">{{ withdrawal.partner?.name }}</p>
          <p class="font-display text-2xl font-extrabold tabular-nums">
            {{ formatXof(withdrawal.net_amount) }}
            <span class="text-sm font-medium text-muted">
              envoyés · {{ formatXof(withdrawal.amount) }} retirés, {{ formatXof(withdrawal.fee) }}
              de frais
            </span>
          </p>
          <p class="text-sm text-muted">
            {{ PAYOUT_METHOD_LABELS[withdrawal.method as PayoutMethod] ?? withdrawal.method }} ·
            {{ withdrawal.account }} · {{ withdrawal.reference }} ·
            {{ withdrawal.created_at ? formatShortDate(withdrawal.created_at) : '' }}
            <template v-if="withdrawal.provider"> · via {{ withdrawal.provider }}</template>
          </p>
          <p v-if="withdrawal.payout_reference" class="text-sm">
            Référence du virement : <span class="font-mono">{{ withdrawal.payout_reference }}</span>
          </p>
          <p v-if="withdrawal.note" class="text-sm text-red-700">{{ withdrawal.note }}</p>
        </div>
        <span :class="STATUS_BADGES[withdrawal.status]">
          {{ WITHDRAWAL_STATUS_LABELS[withdrawal.status] }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import { formatEventDate, formatShortDate, formatXof } from '@/lib/format'
import { useForm } from '@/composables/useForm'
import { PAYOUT_METHOD_LABELS, type PayoutMethod } from '@/types/catalog'
import {
  WITHDRAWAL_STATUS_LABELS,
  ledgerLineLabel,
  withdrawalFee,
  type PartnerFinance,
  type Withdrawal,
  type WithdrawalCodeResult,
  type WithdrawalStatus,
} from '@/types/finance'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleCheckBig,
  KeyRound,
  Send,
  CircleDollarSign,
  Clock,
  History,
  Hourglass,
  Lock,
  Unlock,
  Wallet,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const finance = ref<PartnerFinance | null>(null)
const withdrawals = ref<Withdrawal[]>([])
const loading = ref(true)
const amount = ref<number | ''>('')
// Instant withdrawal: amount → code (WhatsApp/email) → transfer sent at once.
const step = ref<'amount' | 'code'>('amount')
const pending = ref<WithdrawalCodeResult | null>(null)
const code = ref('')
const result = ref<Withdrawal | null>(null)
const codeForm = useForm()
const withdrawForm = useForm()

const preview = computed(() => {
  if (!finance.value || !amount.value || Number(amount.value) <= 0) return null
  const fee = withdrawalFee(Number(amount.value), finance.value.withdrawal_fee)
  return { fee, net: Number(amount.value) - fee }
})
const feeLabel = computed(() => {
  const fee = finance.value?.withdrawal_fee
  if (!fee) return ''
  const percent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(fee.bp / 100)
  return fee.fixed ? `${percent} % + ${formatXof(fee.fixed)}` : `${percent} %`
})
const canWithdraw = computed(
  () =>
    !!finance.value &&
    finance.value.balances.available > 0 &&
    finance.value.withdrawals_left_today > 0,
)

const STATUS_BADGES: Record<WithdrawalStatus, string> = {
  processing: 'badge-info',
  paid: 'badge-success',
  failed: 'badge-danger',
  requested: 'badge-warning',
  rejected: 'badge-neutral',
}

// Only movements the partner cares about: bookings and cancellations, and for withdrawals the
// effect on the withdrawable balance (one line, plus a refund line if the transfer failed).
const visibleLines = () =>
  (finance.value?.entries ?? []).filter((l) =>
    l.kind.startsWith('withdrawal_')
      ? l.account === 'partner_available'
      : l.account !== 'partner_locked' || l.kind === 'booking_paid' || l.kind === 'cancellation',
  )

async function load() {
  const [balance, list] = await Promise.all([
    api.get<{ data: PartnerFinance }>('/api/v1/partner/balance'),
    api.get<{ data: Withdrawal[] }>('/api/v1/partner/withdrawals'),
  ])
  finance.value = balance.data
  withdrawals.value = list.data
}

onMounted(async () => {
  try {
    await load()
  } finally {
    loading.value = false
  }
})

async function requestCode() {
  result.value = null
  const response = await codeForm.submit(() =>
    api.post<{ data: WithdrawalCodeResult }>('/api/v1/partner/withdrawals/code', {
      amount: Number(amount.value),
    }),
  )
  if (!response) return
  pending.value = response.data
  code.value = ''
  step.value = 'code'
}

async function confirmWithdrawal() {
  if (!pending.value) return
  const response = await withdrawForm.submit(() =>
    api.post<{ data: Withdrawal }>('/api/v1/partner/withdrawals', {
      amount: pending.value!.amount,
      code: code.value.trim(),
    }),
  )
  if (!response) return
  result.value = response.data
  cancelWithdrawal()
  await load()
}

function cancelWithdrawal() {
  step.value = 'amount'
  pending.value = null
  code.value = ''
  amount.value = ''
}
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      title="Mon solde"
      subtitle="Vos gains, vos déblocages et vos retraits."
      :icon="Wallet"
    />
    <ListSkeleton v-if="loading" :rows="3" />

    <template v-else-if="finance">
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          v-reveal
          label="Disponible au retrait"
          :value="finance.balances.available"
          :icon="Unlock"
          :tone="finance.balances.available < 0 ? 'red' : 'emerald'"
        />
        <StatCard
          v-reveal="70"
          label="Bloqué"
          :value="finance.balances.locked"
          :icon="Lock"
          tone="amber"
          hint="48 h après chaque réservation"
        />
        <StatCard
          v-reveal="140"
          label="En cours d’envoi"
          :value="finance.balances.withdrawal_pending"
          :icon="Hourglass"
          tone="dusk"
        />
        <StatCard
          v-reveal="210"
          label="Déjà versé"
          :value="finance.balances.paid_out"
          :icon="CircleDollarSign"
          tone="sky"
        />
      </section>

      <p v-if="finance.balances.available < 0" class="alert-error">
        Votre solde est négatif suite à une annulation. Il sera comblé par vos prochaines
        réservations ; aucun retrait n'est possible d'ici là.
      </p>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <!-- Withdrawal (instant) -->
        <section
          v-reveal
          class="relative isolate overflow-hidden rounded-4xl bg-night-950 p-6 text-white shadow-lift sm:p-7"
        >
          <div
            class="pointer-events-none absolute -top-16 -right-10 -z-10 size-60 animate-blob rounded-full bg-flare-500/30 blur-3xl"
          />
          <div
            class="pointer-events-none absolute -bottom-20 -left-10 -z-10 size-60 animate-blob rounded-full bg-brand-500/25 blur-3xl [animation-delay:-8s]"
          />
          <h2 class="flex items-center gap-2 font-display text-xl font-bold">
            <Banknote class="size-5 text-brand-300" /> Retirer mon argent
          </h2>
          <p class="mt-2 text-sm text-white/70">
            Envoi immédiat sur
            <strong class="text-white">
              {{
                finance.payout.method
                  ? PAYOUT_METHOD_LABELS[finance.payout.method as PayoutMethod]
                  : 'moyen non renseigné'
              }}
            </strong>
            <template v-if="finance.payout.account"> · {{ finance.payout.account }}</template
            >. Minimum {{ formatXof(finance.min_withdrawal_amount) }}, frais de virement
            {{ feeLabel }} déduits.
          </p>

          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="result"
              class="mt-4 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
              :class="
                result.status === 'failed'
                  ? 'bg-red-500/15 text-red-100'
                  : 'bg-emerald-500/15 text-emerald-100'
              "
            >
              <CircleCheckBig v-if="result.status !== 'failed'" class="mt-0.5 size-4 shrink-0" />
              <span v-if="result.status === 'paid'">
                <strong>{{ formatXof(result.net_amount) }}</strong> envoyés sur votre compte. Vous
                recevez une confirmation par WhatsApp.
              </span>
              <span v-else-if="result.status === 'processing'">
                Virement de <strong>{{ formatXof(result.net_amount) }}</strong> en cours d'envoi :
                il est confirmé en quelques minutes.
              </span>
              <span v-else>
                Le virement n'a pas abouti ({{ result.note }}). Le montant est de nouveau sur votre
                solde : vous pouvez réessayer.
              </span>
            </div>
          </Transition>

          <!-- Step 1: amount -->
          <form v-if="step === 'amount'" class="mt-5 space-y-3" @submit.prevent="requestCode">
            <div v-if="codeForm.error.value" class="alert-error">{{ codeForm.error.value }}</div>
            <div class="flex flex-wrap items-start gap-2">
              <div class="min-w-0 flex-1 sm:flex-none">
                <div class="relative">
                  <input
                    v-model.number="amount"
                    class="input w-full border-white/20 bg-white/10 pr-16 text-white placeholder:text-white/40 focus:border-brand-400 sm:w-56"
                    type="number"
                    min="1"
                    step="1"
                    :max="finance.balances.available"
                    placeholder="Montant"
                    aria-label="Montant du retrait"
                    required
                  />
                  <span
                    class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-white/50"
                    >FCFA</span
                  >
                </div>
                <p v-if="codeForm.fieldError('amount')" class="input-error text-red-300">
                  {{ codeForm.fieldError('amount') }}
                </p>
              </div>
              <button
                type="button"
                class="btn-glass"
                :disabled="finance.balances.available <= 0"
                @click="amount = finance.balances.available"
              >
                Tout
              </button>
              <button
                class="btn-primary"
                type="submit"
                :disabled="codeForm.processing.value || !canWithdraw || !amount"
              >
                <KeyRound class="size-4" /> Recevoir le code
              </button>
            </div>
            <p v-if="preview" class="text-sm text-white/70">
              Vous recevrez <strong class="text-white">{{ formatXof(preview.net) }}</strong> (frais
              de virement {{ formatXof(preview.fee) }}).
            </p>
            <p v-if="finance.withdrawals_left_today === 0" class="text-sm text-amber-200">
              Limite de retraits atteinte pour aujourd'hui. Réessayez demain.
            </p>
          </form>

          <!-- Step 2: code -->
          <form v-else-if="pending" class="mt-5 space-y-3" @submit.prevent="confirmWithdrawal">
            <div class="grid grid-cols-3 gap-2 text-center text-sm">
              <div class="rounded-2xl bg-white/10 px-3 py-2.5">
                <p class="text-xs text-white/60">Retiré du solde</p>
                <p class="font-semibold tabular-nums">{{ formatXof(pending.amount) }}</p>
              </div>
              <div class="rounded-2xl bg-white/10 px-3 py-2.5">
                <p class="text-xs text-white/60">Frais</p>
                <p class="font-semibold tabular-nums">{{ formatXof(pending.fee) }}</p>
              </div>
              <div class="rounded-2xl bg-sunset px-3 py-2.5 shadow-glow">
                <p class="text-xs text-white/80">Vous recevez</p>
                <p class="font-bold tabular-nums">{{ formatXof(pending.net_amount) }}</p>
              </div>
            </div>
            <p class="text-sm text-white/70">
              Code envoyé{{ pending.sent_to ? ` au ${pending.sent_to}` : '' }} par WhatsApp et
              email, valable {{ pending.expires_in_minutes }} minutes.
            </p>
            <p
              v-if="pending.dev_code"
              class="rounded-2xl bg-amber-400/15 px-3 py-2 text-sm text-amber-100"
            >
              Environnement de test : votre code est <strong>{{ pending.dev_code }}</strong
              >.
            </p>
            <div v-if="withdrawForm.error.value" class="alert-error">
              {{ withdrawForm.error.value }}
            </div>
            <div class="flex flex-wrap items-start gap-2">
              <div>
                <input
                  v-model="code"
                  class="input w-40 border-white/20 bg-white/10 text-center font-mono text-lg tracking-[0.4em] text-white placeholder:text-white/30 focus:border-brand-400"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="000000"
                  aria-label="Code de confirmation"
                  autocomplete="one-time-code"
                  required
                />
                <p
                  v-if="withdrawForm.fieldError('code') || withdrawForm.fieldError('amount')"
                  class="input-error text-red-300"
                >
                  {{ withdrawForm.fieldError('code') ?? withdrawForm.fieldError('amount') }}
                </p>
              </div>
              <button
                class="btn-primary"
                type="submit"
                :disabled="withdrawForm.processing.value || code.trim().length !== 6"
              >
                <span
                  v-if="withdrawForm.processing.value"
                  class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                <Send v-else class="size-4" /> Confirmer et envoyer
              </button>
              <button
                type="button"
                class="btn-ghost text-white/70 hover:bg-white/10 hover:text-white"
                @click="cancelWithdrawal"
              >
                Annuler
              </button>
            </div>
          </form>
        </section>

        <!-- Upcoming releases -->
        <section v-reveal="100" class="card">
          <h2 class="section-title">Prochains déblocages</h2>
          <p v-if="finance.upcoming_releases.length === 0" class="mt-2 text-sm text-muted">
            Aucun montant bloqué.
          </p>
          <ol v-else class="relative mt-4 space-y-4 border-l-2 border-dashed border-stone-200 pl-5">
            <li
              v-for="release in finance.upcoming_releases"
              :key="`${release.reference}-${release.available_at}`"
              class="relative"
            >
              <span
                class="absolute top-1 -left-[1.6rem] size-3 rounded-full bg-sunset ring-4 ring-white"
              />
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-mono text-xs text-muted">{{ release.reference }}</span>
                <strong class="tabular-nums">{{ formatXof(release.amount) }}</strong>
              </div>
              <p class="flex items-center gap-1.5 text-xs text-muted">
                <Clock class="size-3" />
                {{ release.available_at ? formatEventDate(release.available_at) : '—' }}
              </p>
            </li>
          </ol>
        </section>
      </div>

      <!-- Withdrawals -->
      <section v-reveal class="card p-0">
        <h2 class="section-title px-5 pt-5 sm:px-6">Mes retraits</h2>
        <p v-if="withdrawals.length === 0" class="px-5 py-6 text-sm text-muted sm:px-6">
          Aucun retrait pour le moment.
        </p>
        <ul v-else class="mt-3 divide-y divide-stone-100">
          <li
            v-for="withdrawal in withdrawals"
            :key="withdrawal.id"
            class="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm sm:px-6"
          >
            <span class="grid size-10 place-items-center rounded-2xl bg-stone-100 text-stone-600">
              <Banknote class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">
                {{ formatXof(withdrawal.net_amount) }}
                <span v-if="withdrawal.fee" class="text-xs font-normal text-muted">
                  reçus · {{ formatXof(withdrawal.amount) }} retirés,
                  {{ formatXof(withdrawal.fee) }} de frais</span
                >
              </p>
              <p class="text-xs text-muted">
                {{ withdrawal.reference }} ·
                {{ withdrawal.created_at ? formatShortDate(withdrawal.created_at) : '' }}
                <template v-if="withdrawal.payout_reference">
                  · réf. {{ withdrawal.payout_reference }}</template
                >
              </p>
              <p v-if="withdrawal.note" class="text-xs text-red-700">{{ withdrawal.note }}</p>
            </div>
            <span :class="STATUS_BADGES[withdrawal.status]">
              {{ WITHDRAWAL_STATUS_LABELS[withdrawal.status] }}
            </span>
          </li>
        </ul>
      </section>

      <!-- Journal -->
      <section v-reveal class="card p-0">
        <h2 class="section-title flex items-center gap-2 px-5 pt-5 sm:px-6">
          <History class="size-5 text-muted" /> Historique des mouvements
        </h2>
        <ul class="mt-3 divide-y divide-stone-100">
          <li
            v-for="line in visibleLines()"
            :key="line.id"
            class="flex items-center gap-4 px-5 py-3 text-sm sm:px-6"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl"
              :class="line.amount < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'"
            >
              <component :is="line.amount < 0 ? ArrowUpRight : ArrowDownLeft" class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              {{ ledgerLineLabel(line) }}
              <span class="block truncate text-xs text-muted">
                {{ formatShortDate(line.created_at) }}
                <span class="font-mono">{{ line.reference }}</span>
              </span>
            </span>
            <span
              class="font-semibold whitespace-nowrap tabular-nums"
              :class="line.amount < 0 ? 'text-red-700' : 'text-emerald-700'"
            >
              {{ line.amount > 0 ? '+' : '' }}{{ formatXof(line.amount) }}
            </span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

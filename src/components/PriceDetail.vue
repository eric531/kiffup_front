<script setup lang="ts">
import { computed } from 'vue'
import { Info } from 'lucide-vue-next'
import { formatRate, formatXof } from '@/lib/format'

/**
 * Transparent price detail shown to customers:
 *   partner's booking amount + date markup + KiffUp service fee = paid online,
 *   then the rental cost at the partner's and what is left to pay there.
 * Works for one unit (tariff card, with a suffix such as "/ nuit") or for a whole order.
 */
const props = withDefaults(
  defineProps<{
    partnerBase: number
    markupBp?: number
    markupAmount?: number
    serviceFee: number
    total: number
    /** Full rental cost at the partner's (null when unknown). */
    rentalCost: number | null
    balance: number | null
    deductible: boolean
    /** "/ nuit", "/ jour"… for a unit price. */
    suffix?: string
    /** Everything the stay costs (paid online + on site), whole orders only. */
    grandTotal?: number | null
    paid?: boolean
    /** Session (V3, lot F4): a deposit on the price of the session, not a rental. */
    session?: boolean
  }>(),
  { markupBp: 0, markupAmount: 0, suffix: '', grandTotal: null, paid: false, session: false },
)

const deducted = computed(() =>
  props.deductible && props.rentalCost !== null && props.balance !== null
    ? props.rentalCost - props.balance
    : null,
)
</script>

<template>
  <div class="space-y-3 text-sm">
    <dl class="space-y-1.5">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">
          {{ session ? 'Acompte au partenaire' : 'Réservation chez le partenaire' }}
        </dt>
        <dd class="whitespace-nowrap tabular-nums">{{ formatXof(partnerBase) }}</dd>
      </div>
      <div v-if="markupAmount > 0" class="flex justify-between gap-3">
        <dt class="text-muted">
          Majoration de date
          <span class="chip ml-1 bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700"
            >+{{ formatRate(markupBp) }}</span
          >
        </dt>
        <dd class="whitespace-nowrap tabular-nums">{{ formatXof(markupAmount) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="flex items-center gap-1 text-muted">
          Frais de service KiffUp
          <span
            class="text-stone-400"
            title="Couvrent la plateforme et les frais du moyen de paiement. Jamais déduits de la part du partenaire."
          >
            <Info class="size-3.5" />
          </span>
        </dt>
        <dd class="whitespace-nowrap tabular-nums">{{ formatXof(serviceFee) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3 border-t border-stone-200 pt-2">
        <dt class="font-semibold">{{ paid ? 'Payé en ligne' : 'À payer maintenant' }}</dt>
        <dd class="font-display text-lg font-extrabold whitespace-nowrap tabular-nums">
          {{ formatXof(total) }}
          <span v-if="suffix" class="text-xs font-semibold text-muted">{{ suffix }}</span>
        </dd>
      </div>
    </dl>

    <dl
      v-if="rentalCost !== null || balance !== null"
      class="space-y-1.5 rounded-2xl px-4 py-3"
      :class="deductible ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'"
    >
      <div v-if="rentalCost !== null" class="flex justify-between gap-3">
        <dt>{{ session ? 'Prix de la séance' : 'Coût de la location chez le partenaire' }}</dt>
        <dd class="font-semibold whitespace-nowrap tabular-nums">
          {{ formatXof(rentalCost) }}
          <span v-if="suffix" class="text-xs font-normal opacity-70">{{ suffix }}</span>
        </dd>
      </div>
      <div v-if="deducted !== null" class="flex justify-between gap-3">
        <dt>{{ session ? 'Acompte déduit' : 'Réservation déduite' }}</dt>
        <dd class="whitespace-nowrap tabular-nums">− {{ formatXof(deducted) }}</dd>
      </div>
      <div v-if="balance !== null" class="flex justify-between gap-3 font-semibold">
        <dt>Reste à régler sur place</dt>
        <dd class="whitespace-nowrap tabular-nums">{{ formatXof(balance) }}</dd>
      </div>
      <p class="text-xs opacity-80">
        {{
          session
            ? 'L’acompte est déduit du prix de la séance.'
            : deductible
              ? 'Ta réservation est déduite du prix de la location.'
              : 'Réservation non déductible : la location se règle en totalité sur place.'
        }}
      </p>
    </dl>

    <p
      v-if="grandTotal !== null"
      class="flex items-baseline justify-between gap-3 rounded-2xl border border-stone-200 px-4 py-2.5"
    >
      <span class="font-semibold">{{ session ? 'Coût total de ta séance' : 'Coût total' }}</span>
      <span class="font-display text-lg font-extrabold whitespace-nowrap tabular-nums">{{
        formatXof(grandTotal)
      }}</span>
    </p>
  </div>
</template>

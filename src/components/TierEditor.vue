<script setup lang="ts">
import { computed } from 'vue'
import type { PricingTier } from '@/types/catalog'

/**
 * Editor of dynamic pricing tiers. The model stays in basis points (API format);
 * the inputs show percentages.
 */
const tiers = defineModel<PricingTier[]>({ required: true })
defineProps<{ error?: string[] }>()

const sorted = computed(() => [...tiers.value].sort((a, b) => b.days_before - a.days_before))

function update(index: number, patch: Partial<PricingTier>) {
  tiers.value = tiers.value.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
}

function addTier() {
  const lowest = Math.min(...tiers.value.map((t) => t.days_before), 60)
  const highestMarkup = Math.max(0, ...tiers.value.map((t) => t.markup_bp ?? 0))
  tiers.value = [
    ...tiers.value,
    { days_before: Math.max(0, lowest - 7), markup_bp: Math.min(10_000, highestMarkup + 1000) },
  ]
}

function remove(index: number) {
  tiers.value = tiers.value.filter((_, i) => i !== index)
}

const percent = (bp: number | null) => (bp === null ? '' : bp / 100)

/** Human summary: "Jusqu'à J-45 : prix de base · J-44 à J-30 : +15 % · …" */
const summary = computed(() => {
  if (sorted.value.length === 0)
    return 'Aucune majoration : le prix reste le même jusqu’à l’événement.'
  const parts = [`Jusqu'à J-${sorted.value[0]!.days_before + 1} : prix de base`]
  sorted.value.forEach((tier, i) => {
    const next = sorted.value[i + 1]
    const range = next
      ? `J-${tier.days_before} à J-${next.days_before + 1}`
      : `À partir de J-${tier.days_before}`
    parts.push(
      `${range} : ${tier.markup_bp === null ? 'réservations fermées' : `+${tier.markup_bp / 100} %`}`,
    )
  })
  return parts.join(' · ')
})
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(tier, index) in tiers"
      :key="index"
      class="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label class="label" :for="`tier-days-${index}`">À partir de J-</label>
        <input
          :id="`tier-days-${index}`"
          class="input w-24"
          type="number"
          min="0"
          max="365"
          :value="tier.days_before"
          @input="update(index, { days_before: Number(($event.target as HTMLInputElement).value) })"
        />
      </div>
      <div>
        <label class="label" :for="`tier-markup-${index}`">Majoration (%)</label>
        <input
          :id="`tier-markup-${index}`"
          class="input w-28"
          type="number"
          min="0"
          max="100"
          step="1"
          :disabled="tier.markup_bp === null"
          :value="percent(tier.markup_bp)"
          @input="
            update(index, {
              markup_bp: Math.round(Number(($event.target as HTMLInputElement).value) * 100),
            })
          "
        />
      </div>
      <label class="flex items-center gap-2 pb-3 text-sm">
        <input
          type="checkbox"
          class="size-4 accent-brand-600"
          :checked="tier.markup_bp === null"
          @change="
            update(index, { markup_bp: ($event.target as HTMLInputElement).checked ? null : 0 })
          "
        />
        Fermer les réservations
      </label>
      <button
        type="button"
        class="btn-ghost ml-auto text-red-700 hover:bg-red-50"
        @click="remove(index)"
      >
        Retirer
      </button>
    </div>

    <button type="button" class="btn-secondary" @click="addTier">Ajouter un palier</button>

    <p class="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900">{{ summary }}</p>
    <ul v-if="error?.length" class="space-y-1">
      <li v-for="message in error" :key="message" class="input-error">{{ message }}</li>
    </ul>
  </div>
</template>

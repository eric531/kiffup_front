<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, Circle, ClipboardList } from 'lucide-vue-next'
import type { Partner } from '@/types/catalog'

/**
 * "Complétez votre fiche": what a partner accepted from a short request still has to give. Hidden once
 * everything is done. Withdrawals wait for the documents check; listings and videos wait for the city.
 */
const props = defineProps<{ partner: Partner }>()

const steps = computed(() => {
  const bookable = props.partner.profile === 'bookable'
  return [
    {
      label: 'Ville et adresse de votre établissement',
      hint: 'Nécessaire pour publier vos offres et vos vidéos.',
      done: !!props.partner.city,
    },
    { label: 'Présentation de votre établissement', hint: null, done: !!props.partner.description },
    ...(bookable
      ? [
          {
            label: 'Numéro de retrait (Wave, Orange Money, MTN, Moov)',
            hint: 'Là où vous recevez votre argent.',
            done: !!props.partner.payout_account,
          },
          {
            label: 'Pièces justificatives',
            hint: props.partner.documents.length
              ? 'Envoyées : l’équipe KiffUp les vérifie avant votre premier retrait.'
              : 'RCCM ou pièce d’identité du gérant, et une photo de la devanture.',
            done: !!props.partner.verified_at || props.partner.documents.length > 0,
          },
        ]
      : []),
  ]
})
const remaining = computed(() => steps.value.filter((s) => !s.done).length)
</script>

<template>
  <section v-if="remaining" class="card space-y-4 border-l-4 border-brand-500 p-5 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="section-title flex items-center gap-2">
        <ClipboardList class="size-5 text-brand-600" /> Complétez votre fiche
      </h2>
      <RouterLink :to="{ name: 'partner.profile' }" class="btn-primary px-4 py-2 text-sm">
        Compléter ma fiche
      </RouterLink>
    </div>
    <ul class="space-y-2 text-sm">
      <li v-for="step in steps" :key="step.label" class="flex items-start gap-2.5">
        <CircleCheck v-if="step.done" class="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <Circle v-else class="mt-0.5 size-4 shrink-0 text-stone-400" />
        <span>
          <span :class="step.done ? 'text-muted line-through' : 'font-medium'">{{
            step.label
          }}</span>
          <span v-if="step.hint && !step.done" class="block text-xs text-muted">{{
            step.hint
          }}</span>
        </span>
      </li>
    </ul>
  </section>
</template>

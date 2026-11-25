<script setup lang="ts">
import { computed, toRef, type Component } from 'vue'
import { formatXof } from '@/lib/format'
import { useCountUp } from '@/composables/useCountUp'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    icon: Component
    /** 'money' → "12 000 FCFA", 'count' → "12" */
    format?: 'money' | 'count'
    tone?: 'brand' | 'flare' | 'dusk' | 'emerald' | 'amber' | 'red' | 'sky'
    hint?: string
  }>(),
  { format: 'money', tone: 'brand', hint: undefined },
)

const animated = useCountUp(toRef(props, 'value'))
const text = computed(() =>
  props.format === 'money'
    ? formatXof(animated.value)
    : new Intl.NumberFormat('fr-FR').format(animated.value),
)

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  flare: 'bg-pink-50 text-flare-500',
  dusk: 'bg-violet-50 text-dusk-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  sky: 'bg-sky-50 text-sky-600',
} as const
</script>

<template>
  <div class="card card-hover relative overflow-hidden p-5">
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm font-medium text-muted">{{ label }}</p>
      <span class="grid size-10 shrink-0 place-items-center rounded-2xl" :class="TONES[tone]">
        <component :is="icon" class="size-5" />
      </span>
    </div>
    <p class="mt-2 font-display text-2xl font-extrabold tabular-nums">{{ text }}</p>
    <p v-if="hint || $slots.default" class="mt-1 text-xs text-muted">
      <slot>{{ hint }}</slot>
    </p>
  </div>
</template>

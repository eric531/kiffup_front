<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatShortDate, formatXof } from '@/lib/format'

/** Daily sales as animated bars (oldest → newest). Hover or tap a bar for the figures. */
const props = defineProps<{ days: { date: string; orders: number; revenue: number }[] }>()

const active = ref<number | null>(null)
const max = computed(() => Math.max(1, ...props.days.map((d) => d.revenue)))
const total = computed(() => props.days.reduce((sum, d) => sum + d.revenue, 0))
const orders = computed(() => props.days.reduce((sum, d) => sum + d.orders, 0))
const focused = computed(() => (active.value === null ? null : props.days[active.value]))
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'Africa/Abidjan' }).format(
    new Date(iso),
  )
</script>

<template>
  <div class="card p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-lg font-bold">Ventes des {{ days.length }} derniers jours</h2>
        <p class="text-sm text-muted">
          {{ orders }} commande{{ orders > 1 ? 's' : '' }} payée{{ orders > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="text-right" aria-live="polite">
        <p class="text-xs text-muted">
          {{ focused ? formatShortDate(focused.date) : 'Total encaissé' }}
        </p>
        <p class="font-display text-2xl font-extrabold tabular-nums">
          {{ formatXof(focused ? focused.revenue : total) }}
        </p>
        <p v-if="focused" class="text-xs text-muted">
          {{ focused.orders }} commande{{ focused.orders > 1 ? 's' : '' }}
        </p>
      </div>
    </div>

    <div class="mt-6 flex h-44 items-end gap-1 sm:gap-1.5" role="list" @mouseleave="active = null">
      <button
        v-for="(day, i) in days"
        :key="day.date"
        type="button"
        role="listitem"
        class="group relative flex h-full flex-1 flex-col items-center justify-end gap-2 focus:outline-none"
        :aria-label="`${formatShortDate(day.date)} : ${formatXof(day.revenue)}`"
        @mouseenter="active = i"
        @focus="active = i"
        @click="active = active === i ? null : i"
      >
        <span class="relative flex w-full flex-1 items-end">
          <span
            class="bar w-full origin-bottom rounded-t-lg transition-colors"
            :class="
              day.revenue === 0
                ? 'bg-stone-100'
                : active === i
                  ? 'bg-sunset shadow-glow'
                  : 'bg-gradient-to-t from-brand-400 to-flare-400 opacity-80 group-hover:opacity-100'
            "
            :style="{
              height: `${Math.max(4, (day.revenue / max) * 100)}%`,
              animationDelay: `${i * 25}ms`,
            }"
          />
        </span>
        <span
          class="text-[10px] tabular-nums transition-colors"
          :class="active === i ? 'font-bold text-ink' : 'text-muted'"
          >{{ dayLabel(day.date) }}</span
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.bar {
  animation: grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes grow {
  from {
    transform: scaleY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .bar {
    animation: none;
  }
}
</style>

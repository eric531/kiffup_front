<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import type { PartnerOccupancy } from '@/types/partnerArea'

/** Occupancy of the partner's listings on the next days: units sold per day, all bookings included. */
const props = withDefaults(defineProps<{ days?: number }>(), { days: 14 })

const rows = ref<PartnerOccupancy[]>([])
const loaded = ref(false)

const dates = computed(() => Object.keys(rows.value[0]?.days ?? {}))
const weekday = (ymd: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow', timeZone: 'UTC' }).format(
    new Date(`${ymd}T00:00:00Z`),
  )
const isWeekend = (ymd: string) => [0, 6].includes(new Date(`${ymd}T00:00:00Z`).getUTCDay())

const sold = (row: PartnerOccupancy, day: string) =>
  Math.max(0, row.units - (row.days[day] ?? row.units))
function tone(row: PartnerOccupancy, day: string): string {
  const ratio = row.units ? sold(row, day) / row.units : 0
  if (ratio >= 1) return 'bg-night-900 text-white'
  if (ratio >= 0.5) return 'bg-brand-400 text-white'
  if (ratio > 0) return 'bg-brand-100 text-brand-900'
  return 'bg-stone-100 text-stone-400'
}
/** Occupancy rate of a listing over the period. */
const rate = (row: PartnerOccupancy) => {
  const capacity = row.units * dates.value.length
  if (!capacity) return 0
  const total = dates.value.reduce((sum, day) => sum + sold(row, day), 0)
  return Math.round((total / capacity) * 100)
}

onMounted(async () => {
  try {
    rows.value = (
      await api.get<{ data: PartnerOccupancy[] }>('/api/v1/partner/occupancy', { days: props.days })
    ).data.filter((row) => row.units > 0)
  } catch {
    rows.value = []
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <section v-if="loaded && rows.length" class="card">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="font-display text-lg font-bold">Occupation des {{ days }} prochains jours</h2>
        <p class="text-sm text-muted">Unités vendues par jour, avec et sans événement.</p>
      </div>
      <div class="flex flex-wrap gap-3 text-xs text-muted">
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-3 rounded bg-stone-100" /> Libre</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-3 rounded bg-brand-100" /> En partie</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-3 rounded bg-brand-400" /> Plus de la moitié</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-3 rounded bg-night-900" /> Complet</span
        >
      </div>
    </div>

    <div class="-mx-5 mt-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table class="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th class="sticky left-0 z-10 bg-white" />
            <th
              v-for="day in dates"
              :key="day"
              class="min-w-8 font-medium"
              :class="isWeekend(day) ? 'text-brand-700' : 'text-muted'"
            >
              <span class="block uppercase">{{ weekday(day) }}</span>
              <span class="block font-display text-sm text-ink">{{ Number(day.slice(8)) }}</span>
            </th>
            <th class="pl-2 text-right font-medium text-muted">Taux</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <th
              class="sticky left-0 z-10 max-w-44 bg-white pr-3 text-left font-semibold whitespace-nowrap"
            >
              <span class="flex items-center gap-2">
                <component
                  :is="LISTING_TYPE_ICONS[row.type]"
                  class="size-3.5 shrink-0 text-brand-600"
                />
                <span class="truncate">{{ row.title }}</span>
                <span class="font-normal text-muted">×{{ row.units }}</span>
              </span>
            </th>
            <td
              v-for="day in dates"
              :key="day"
              class="h-8 rounded-md text-center font-semibold tabular-nums"
              :class="tone(row, day)"
              :title="`${day} : ${sold(row, day)} / ${row.units} vendu(s)`"
            >
              {{ sold(row, day) || '' }}
            </td>
            <td class="pl-2 text-right font-display font-bold tabular-nums">{{ rate(row) }} %</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

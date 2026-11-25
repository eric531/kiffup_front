<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { addDays, daysBetween } from '@/lib/format'
import type { StayRules } from '@/types/catalog'

/**
 * Availability calendar of a listing, one month at a time: free units per day, and selection of
 * arrival / departure (per night) or first / last day (per day). Full days cannot be selected.
 */
const props = defineProps<{
  listingId: number
  rules: StayRules
  unit: 'night' | 'day'
  /** Units wanted: days with fewer free units are shown as full. */
  quantity?: number
}>()
const startsOn = defineModel<string>('startsOn', { default: '' })
const endsOn = defineModel<string>('endsOn', { default: '' })

const nightly = computed(() => props.unit === 'night')
const wanted = computed(() => Math.max(1, props.quantity ?? 1))

const month = ref((startsOn.value || props.rules.default_starts_on).slice(0, 7)) // Y-m
const days = ref<Record<string, number>>({})
const units = ref(0)
const loading = ref(false)
/** Next click sets the end of the stay. */
const pickingEnd = ref(false)
const error = ref<string | null>(null)

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month.value}-01T00:00:00Z`),
  ),
)
const firstMonth = computed(() => props.rules.available_from.slice(0, 7))
const lastMonth = computed(() => props.rules.available_until.slice(0, 7))

function shiftMonth(step: number) {
  const date = new Date(`${month.value}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + step)
  month.value = date.toISOString().slice(0, 7)
}

/** Weeks of the month, Monday first; null = padding cell. */
const grid = computed(() => {
  const first = new Date(`${month.value}-01T00:00:00Z`)
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month.value}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
})

async function load() {
  loading.value = true
  const from = `${month.value}-01`
  const last = grid.value.filter(Boolean).at(-1) as string
  try {
    const data = (
      await api.get<{ data: { units: number; days: Record<string, number> } }>(
        `/api/v1/public/listings/${props.listingId}/availability`,
        { from, to: last },
      )
    ).data
    days.value = data.days
    units.value = data.units
  } catch {
    days.value = {}
  } finally {
    loading.value = false
  }
}
watch(month, load, { immediate: true })
// Dates typed in the booking form: show their month.
watch(startsOn, (day) => {
  if (day && !pickingEnd.value && day.slice(0, 7) !== month.value) month.value = day.slice(0, 7)
})

const outOfWindow = (day: string) =>
  day < props.rules.available_from || day > props.rules.available_until
const free = (day: string) => days.value[day] ?? units.value
/** A night can start on a day only if that day has enough units (departure day itself is not occupied). */
const isFull = (day: string) => free(day) < wanted.value

function stateOf(day: string): 'out' | 'full' | 'low' | 'free' {
  if (outOfWindow(day)) return 'out'
  if (isFull(day)) return 'full'
  return free(day) <= Math.max(2, wanted.value) ? 'low' : 'free'
}

const inRange = (day: string) =>
  !!startsOn.value && !!endsOn.value && day > startsOn.value && day < endsOn.value
const isEdge = (day: string) => day === startsOn.value || day === endsOn.value

function pick(day: string) {
  error.value = null
  if (outOfWindow(day)) return
  if (!pickingEnd.value || day < startsOn.value || (nightly.value && day === startsOn.value)) {
    if (isFull(day)) {
      error.value = 'Complet ce jour-là.'
      return
    }
    startsOn.value = day
    const min = props.rules.min_duration
    endsOn.value = addDays(day, nightly.value ? min : min - 1)
    pickingEnd.value = true
    return
  }
  const duration = daysBetween(startsOn.value, day) + (nightly.value ? 0 : 1)
  const { min_duration: min, max_duration: max } = props.rules
  if (duration < min || (max !== null && duration > max)) {
    const word = nightly.value ? 'nuit' : 'jour'
    error.value =
      duration < min
        ? `Séjour de ${min} ${word}s minimum.`
        : `Séjour de ${max} ${word}${(max ?? 0) > 1 ? 's' : ''} maximum.`
    return
  }
  // Every occupied day of the stay must have enough units: [start, end) per night, [start, end] per day.
  const lastOccupied = nightly.value ? addDays(day, -1) : day
  for (let d = startsOn.value; d <= lastOccupied; d = addDays(d, 1)) {
    if (isFull(d)) {
      error.value = 'Une des dates choisies est complète : choisis une période plus courte.'
      return
    }
  }
  endsOn.value = day
  pickingEnd.value = false
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <button
        type="button"
        class="btn-ghost size-9 p-0"
        :disabled="month <= firstMonth"
        aria-label="Mois précédent"
        @click="shiftMonth(-1)"
      >
        <ChevronLeft class="size-4" />
      </button>
      <p class="font-display font-bold capitalize">{{ monthLabel }}</p>
      <button
        type="button"
        class="btn-ghost size-9 p-0"
        :disabled="month >= lastMonth"
        aria-label="Mois suivant"
        @click="shiftMonth(1)"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted uppercase">
      <span v-for="d in ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']" :key="d">{{ d }}</span>
    </div>
    <div class="grid grid-cols-7 gap-1" :class="{ 'opacity-60': loading }">
      <template v-for="(day, i) in grid" :key="i">
        <span v-if="!day" />
        <button
          v-else
          type="button"
          class="relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition"
          :class="[
            isEdge(day)
              ? 'bg-night-900 font-bold text-white shadow-md'
              : inRange(day)
                ? 'bg-brand-100 text-brand-900'
                : {
                    out: 'cursor-default text-stone-300',
                    full: 'cursor-not-allowed bg-stone-100 text-stone-400 line-through',
                    low: 'bg-amber-50 text-amber-900 hover:bg-amber-100',
                    free: 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
                  }[stateOf(day)],
          ]"
          :disabled="stateOf(day) === 'out'"
          :aria-label="`${day} : ${stateOf(day) === 'full' ? 'complet' : `${free(day)} disponible(s)`}`"
          :aria-pressed="isEdge(day)"
          @click="pick(day)"
        >
          {{ Number(day.slice(8)) }}
          <span
            v-if="stateOf(day) === 'low' && !isEdge(day)"
            class="absolute bottom-1 size-1 rounded-full bg-amber-500"
          />
        </button>
      </template>
    </div>

    <p v-if="error" class="input-error">{{ error }}</p>
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5"
        ><span class="size-3 rounded bg-emerald-100" /> Disponible</span
      >
      <span class="inline-flex items-center gap-1.5"
        ><span class="size-3 rounded bg-amber-100" /> Dernières unités</span
      >
      <span class="inline-flex items-center gap-1.5"
        ><span class="size-3 rounded bg-stone-200" /> Complet</span
      >
      <span class="ml-auto">
        {{
          pickingEnd
            ? nightly
              ? 'Choisis ta date de départ'
              : 'Choisis le dernier jour'
            : nightly
              ? 'Touche ta date d’arrivée'
              : 'Touche le premier jour'
        }}
      </span>
    </div>
  </div>
</template>

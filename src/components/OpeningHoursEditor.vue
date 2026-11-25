<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { formatStayDate } from '@/lib/format'
import { WEEKDAY_LABELS } from '@/lib/sessions'
import type { OpeningRange } from '@/types/catalog'

/**
 * Weekly opening hours (one range per open day) and exceptional closing days (V3, lot F4):
 * customers can only request a session inside them.
 */
const hours = defineModel<OpeningRange[]>('hours', { required: true })
const closedDates = defineModel<string[]>('closedDates', { required: true })
defineProps<{ errors?: Record<string, string[]> }>()

const days = computed(() =>
  WEEKDAY_LABELS.map((label, i) => ({
    day: i + 1,
    label,
    range: hours.value.find((range) => range.day === i + 1) ?? null,
  })),
)

const valueOf = (event: Event) => (event.target as HTMLInputElement).value
const checkedOf = (event: Event) => (event.target as HTMLInputElement).checked

function toggle(day: number, open: boolean) {
  hours.value = open
    ? [...hours.value, { day, opens: '09:00', closes: '19:00' }].sort((a, b) => a.day - b.day)
    : hours.value.filter((range) => range.day !== day)
}

function setTime(day: number, field: 'opens' | 'closes', value: string) {
  hours.value = hours.value.map((range) =>
    range.day === day ? { ...range, [field]: value } : range,
  )
}

const today = new Date().toISOString().slice(0, 10)
const newDate = ref('')
function addDate() {
  if (!newDate.value || closedDates.value.includes(newDate.value)) return
  closedDates.value = [...closedDates.value, newDate.value].sort()
  newDate.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <ul class="divide-y divide-stone-100 rounded-2xl border border-stone-200">
      <li
        v-for="item in days"
        :key="item.day"
        class="flex flex-wrap items-center gap-3 px-4 py-2.5"
      >
        <label class="flex w-32 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            class="size-4 accent-brand-600"
            :checked="item.range !== null"
            @change="toggle(item.day, checkedOf($event))"
          />
          {{ item.label }}
        </label>
        <template v-if="item.range">
          <input
            class="input w-28 px-3 py-1.5"
            type="time"
            step="1800"
            :value="item.range.opens"
            :aria-label="`${item.label} : ouverture`"
            @change="setTime(item.day, 'opens', valueOf($event))"
          />
          <span class="text-muted">à</span>
          <input
            class="input w-28 px-3 py-1.5"
            type="time"
            step="1800"
            :value="item.range.closes"
            :aria-label="`${item.label} : fermeture`"
            @change="setTime(item.day, 'closes', valueOf($event))"
          />
          <span
            v-if="errors?.[`opening_hours.${hours.indexOf(item.range)}.closes`]"
            class="input-error w-full"
          >
            {{ errors[`opening_hours.${hours.indexOf(item.range)}.closes`]?.[0] }}
          </span>
        </template>
        <span v-else class="text-sm text-muted">Fermé</span>
      </li>
    </ul>

    <div class="space-y-2">
      <p class="label">Fermetures exceptionnelles</p>
      <div v-if="closedDates.length" class="flex flex-wrap gap-2">
        <span v-for="date in closedDates" :key="date" class="chip bg-stone-100 text-stone-700">
          {{ formatStayDate(date) }}
          <button
            type="button"
            class="rounded-full p-0.5 hover:bg-stone-200"
            :aria-label="`Retirer le ${formatStayDate(date)}`"
            @click="closedDates = closedDates.filter((d) => d !== date)"
          >
            <X class="size-3.5" />
          </button>
        </span>
      </div>
      <div class="flex gap-2">
        <input
          v-model="newDate"
          class="input w-44 px-3"
          type="date"
          :min="today"
          aria-label="Jour de fermeture"
        />
        <button type="button" class="btn-secondary" :disabled="!newDate" @click="addDate">
          <Plus class="size-4" /> Ajouter
        </button>
      </div>
    </div>
  </div>
</template>

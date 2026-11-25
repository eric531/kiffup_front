<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next'
import { formatShortDate, formatXof } from '@/lib/format'
import type { EventReport } from '@/types/reporting'

defineProps<{ events: EventReport[] }>()

const percent = (permille: number | null) =>
  permille === null
    ? '—'
    : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(permille / 10)} %`
const width = (permille: number | null) => `${Math.min(100, (permille ?? 0) / 10)}%`
</script>

<template>
  <section class="card overflow-hidden p-0">
    <div class="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
      <h2 class="font-display text-lg font-bold">Performances par événement</h2>
      <RouterLink
        :to="{ name: 'admin.events' }"
        class="text-sm font-semibold text-brand-700 hover:underline"
      >
        Tous les événements
      </RouterLink>
    </div>

    <div v-if="events.length === 0" class="px-6 py-12 text-center">
      <span class="mx-auto grid size-12 place-items-center rounded-2xl bg-stone-100 text-muted">
        <CalendarDays class="size-6" />
      </span>
      <p class="mt-3 text-sm text-muted">Aucune vente pour le moment.</p>
    </div>

    <div v-else class="mt-4 overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead
          class="border-y border-stone-200 bg-stone-50/70 text-left text-xs tracking-wide text-muted uppercase"
        >
          <tr>
            <th class="px-5 py-3 font-semibold sm:px-6">Événement</th>
            <th class="px-4 py-3 text-right font-semibold">Commandes</th>
            <th class="px-4 py-3 font-semibold">Remplissage</th>
            <th class="px-4 py-3 text-right font-semibold">Encaissé</th>
            <th class="px-4 py-3 text-right font-semibold">Commission</th>
            <th class="px-4 py-3 text-right font-semibold">Annulées</th>
            <th class="px-5 py-3 font-semibold sm:px-6">Arrivées</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="row in events" :key="row.event.id" class="transition hover:bg-brand-50/40">
            <td class="px-5 py-3.5 sm:px-6">
              <p class="font-semibold">{{ row.event.name }}</p>
              <p class="text-xs text-muted">
                {{ row.event.starts_at ? formatShortDate(row.event.starts_at) : '' }}
              </p>
            </td>
            <td class="px-4 py-3.5 text-right tabular-nums">{{ row.orders }}</td>
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <span class="h-2 w-24 overflow-hidden rounded-full bg-stone-100">
                  <span
                    class="block h-full rounded-full bg-sunset"
                    :style="{ width: width(row.fill_rate_permille) }"
                  />
                </span>
                <span class="text-xs whitespace-nowrap tabular-nums">
                  {{ row.units }}/{{ row.stock_total }} · {{ percent(row.fill_rate_permille) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums">
              {{ formatXof(row.revenue) }}
            </td>
            <td class="px-4 py-3.5 text-right whitespace-nowrap tabular-nums text-emerald-700">
              {{ formatXof(row.commission) }}
            </td>
            <td class="px-4 py-3.5 text-right tabular-nums">{{ row.cancelled }}</td>
            <td class="px-5 py-3.5 sm:px-6">
              <div class="flex items-center gap-3">
                <span class="h-2 w-16 overflow-hidden rounded-full bg-stone-100">
                  <span
                    class="block h-full rounded-full bg-emerald-500"
                    :style="{ width: width(row.check_in_rate_permille) }"
                  />
                </span>
                <span class="text-xs whitespace-nowrap tabular-nums">{{
                  percent(row.check_in_rate_permille)
                }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

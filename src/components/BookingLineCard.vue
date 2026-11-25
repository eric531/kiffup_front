<script setup lang="ts">
import { BedDouble, CalendarDays, Clapperboard, Clock3, Phone } from 'lucide-vue-next'
import { formatEventDate, formatStayRange, formatXof } from '@/lib/format'
import { formatSessionDate } from '@/lib/sessions'
import { durationLabel } from '@/types/catalog'
import type { PartnerBookingLine } from '@/types/partnerArea'

defineProps<{ line: PartnerBookingLine }>()

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start gap-4">
      <span
        class="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-pink-100 font-bold text-brand-800"
      >
        {{ initials(line.customer.name) }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="truncate font-semibold">{{ line.customer.name }}</p>
          <span v-if="line.status === 'requested'" class="badge-info">
            {{ line.session?.proposed_starts_at ? 'Autre heure proposée' : 'Demande à confirmer' }}
          </span>
          <span v-else-if="line.status === 'cancelled'" class="badge-neutral">
            {{ line.session && !line.session.confirmed_at ? 'Demande close' : 'Annulée' }}
          </span>
          <span v-else-if="line.session?.attendance === 'declined'" class="badge-danger">
            Ne viendra pas
          </span>
          <span v-else-if="line.checked_in_at" class="badge-success">
            Arrivé le {{ formatEventDate(line.checked_in_at) }}
          </span>
          <span v-else-if="line.session?.attendance === 'confirmed'" class="badge-success">
            Venue confirmée
          </span>
          <span v-else class="badge-warning">Attendu</span>
        </div>
        <p class="font-mono text-sm font-bold tracking-wide text-stone-500">{{ line.code }}</p>
      </div>
    </div>

    <div class="grid gap-1.5 text-sm">
      <p class="flex flex-wrap items-center gap-2">
        <strong>{{ line.title }}</strong> <span class="text-muted">× {{ line.quantity }}</span>
        <span v-if="line.origin_video_id" class="chip bg-fuchsia-50 text-fuchsia-700">
          <Clapperboard class="size-3.5" /> Venue de Découvrir
        </span>
      </p>
      <p
        v-if="line.stay_starts_on && line.stay_ends_on"
        class="flex w-fit items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 font-semibold text-brand-800"
      >
        <BedDouble class="size-4 shrink-0" />
        {{ formatStayRange(line.stay_starts_on, line.stay_ends_on) }} ·
        {{ durationLabel(line.pricing_unit, line.duration) }}
      </p>
      <p
        v-if="line.session"
        class="flex w-fit items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 font-semibold text-brand-800 first-letter:uppercase"
      >
        <Clock3 class="size-4 shrink-0" />
        {{ formatSessionDate(line.session.starts_at) }} · {{ line.session.minutes }} min
      </p>
      <p
        v-if="line.status === 'cancelled' && line.session?.cancellation_reason"
        class="text-xs text-muted"
      >
        {{ line.session.cancellation_reason }}
      </p>
      <p v-if="line.event" class="flex items-center gap-2 text-muted first-letter:uppercase">
        <CalendarDays class="size-4 shrink-0" /> {{ line.event.name }} ·
        {{ formatEventDate(line.event.starts_at) }}
      </p>
      <a
        :href="`tel:${line.customer.phone}`"
        class="inline-flex w-fit items-center gap-2 font-medium text-brand-700 hover:underline"
      >
        <Phone class="size-4" /> {{ line.customer.phone }}
      </a>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-emerald-50 px-4 py-2.5">
        <p class="text-xs text-emerald-700">
          {{ line.status === 'requested' ? 'Vous recevrez à la confirmation' : 'Vous recevez' }}
        </p>
        <p class="font-display text-lg font-extrabold text-emerald-900">
          {{ formatXof(line.partner_amount) }}
        </p>
      </div>
      <div v-if="line.balance_due_on_site !== null" class="rounded-2xl bg-amber-50 px-4 py-2.5">
        <p class="text-xs text-amber-700">À encaisser sur place</p>
        <p class="font-display text-lg font-extrabold text-amber-900">
          {{ formatXof(line.balance_due_on_site) }}
        </p>
      </div>
    </div>
  </div>
</template>

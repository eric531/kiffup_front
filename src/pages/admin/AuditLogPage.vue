<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/lib/api'
import type { Paginated } from '@/types/identity'
import { AUDIT_ACTION_LABELS, type AuditLog } from '@/types/reporting'
import { ChevronDown, ScrollText } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const logs = ref<AuditLog[]>([])
const loading = ref(true)
const expanded = ref<number | null>(null)
const filters = reactive({ area: '' as '' | 'admin' | 'partner', actor: '', from: '', to: '' })

async function load() {
  loading.value = true
  try {
    logs.value = (
      await api.get<Paginated<AuditLog>>('/api/v1/admin/audit-logs', {
        area: filters.area || undefined,
        actor: filters.actor || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        per_page: 100,
      })
    ).data
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(filters, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 300)
})
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Journal d'audit"
      subtitle="Toutes les modifications faites dans le back-office et l'espace partenaire. Les mots de passe et codes ne sont jamais enregistrés."
      :icon="ScrollText"
    />

    <div class="card grid gap-3 p-4 sm:grid-cols-4">
      <select v-model="filters.area" class="input" aria-label="Espace">
        <option value="">Tous les espaces</option>
        <option value="admin">Back-office</option>
        <option value="partner">Espace partenaire</option>
      </select>
      <input v-model="filters.actor" class="input" type="search" placeholder="Auteur" />
      <input v-model="filters.from" class="input" type="date" aria-label="Du" />
      <input v-model="filters.to" class="input" type="date" aria-label="Au" />
    </div>

    <ListSkeleton v-if="loading" />
    <EmptyState
      v-else-if="logs.length === 0"
      :icon="ScrollText"
      title="Aucune action enregistrée"
    />
    <ol v-else class="card relative space-y-1 p-3 sm:p-4">
      <li v-for="log in logs" :key="log.id" class="relative pl-7">
        <span class="absolute top-0 bottom-0 left-[0.6rem] w-px bg-stone-200" />
        <span
          class="absolute top-4 left-1.5 size-2.5 rounded-full ring-4 ring-white"
          :class="
            log.status >= 400
              ? 'bg-red-500'
              : log.actor.role === 'partner'
                ? 'bg-sky-500'
                : 'bg-brand-500'
          "
        />
        <button
          class="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition hover:bg-stone-50"
          :aria-expanded="expanded === log.id"
          @click="expanded = expanded === log.id ? null : log.id"
        >
          <span class="min-w-0">
            <strong>{{ AUDIT_ACTION_LABELS[log.action] ?? log.action }}</strong>
            <span class="text-muted"> · {{ log.actor.name ?? 'Inconnu' }}</span>
          </span>
          <span class="flex items-center gap-2 text-xs text-muted">
            {{ new Date(log.created_at).toLocaleString('fr-FR') }}
            <ChevronDown class="size-4 transition" :class="{ 'rotate-180': expanded === log.id }" />
          </span>
        </button>
        <div
          v-if="expanded === log.id"
          class="mx-3 mb-2 space-y-1 rounded-2xl bg-night-950 p-4 font-mono text-xs break-all text-white/80"
        >
          <p>
            <span class="text-brand-300">{{ log.method }}</span> {{ log.path }} →
            <span :class="log.status >= 400 ? 'text-red-300' : 'text-emerald-300'">{{
              log.status
            }}</span>
            ·
            {{ log.ip }}
          </p>
          <p v-if="log.subject && Object.keys(log.subject).length">
            <span class="text-white/50">Cible :</span> {{ JSON.stringify(log.subject) }}
          </p>
          <p v-if="log.payload && Object.keys(log.payload).length">
            <span class="text-white/50">Données :</span> {{ JSON.stringify(log.payload) }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

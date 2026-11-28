<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/lib/api'
import { PARTNER_TYPE_LABELS, type Partner } from '@/types/catalog'
import type { Paginated } from '@/types/identity'
import { ChevronRight, Handshake, MapPin, Phone, Plus } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import SearchField from '@/components/SearchField.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const partners = ref<Partner[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get<Paginated<Partner>>('/api/v1/admin/partners', {
      search: search.value || undefined,
      per_page: 100,
    })
    partners.value = response.data
  } catch {
    error.value = 'Impossible de charger les partenaires.'
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
})
onMounted(load)

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Partenaires"
      subtitle="Hôtels, résidences, loueurs et parkings."
      :icon="Handshake"
    >
      <template #actions>
        <RouterLink :to="{ name: 'admin.partners.create' }" class="btn-primary">
          <Plus class="size-4" /> Nouveau partenaire
        </RouterLink>
      </template>
    </PageHeader>

    <SearchField v-model="search" placeholder="Rechercher (nom, ville)" />

    <div v-if="error" class="alert-error">{{ error }}</div>
    <ListSkeleton v-else-if="loading" />
    <EmptyState v-else-if="partners.length === 0" :icon="Handshake" title="Aucun partenaire">
      <RouterLink :to="{ name: 'admin.partners.create' }" class="btn-primary">
        <Plus class="size-4" /> Ajouter un partenaire
      </RouterLink>
    </EmptyState>

    <ul v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <li v-for="(partner, i) in partners" :key="partner.id" v-reveal="(i % 2) * 70">
        <RouterLink
          :to="{ name: 'admin.partners.edit', params: { id: partner.id } }"
          class="group card card-hover flex items-center gap-4 p-4"
          :class="{ 'opacity-70': !partner.is_active }"
        >
          <span
            class="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-pink-100 font-display text-lg font-bold text-brand-800"
          >
            {{ initials(partner.name) }}
          </span>
          <div class="min-w-0 flex-1 space-y-1">
            <p class="truncate font-semibold">{{ partner.name }}</p>
            <p class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
              <span>{{ PARTNER_TYPE_LABELS[partner.type] }}</span>
              <span class="inline-flex items-center gap-1"
                ><MapPin class="size-3.5" /> {{ partner.city ?? 'Ville à compléter' }}</span
              >
              <span class="inline-flex items-center gap-1"
                ><Phone class="size-3.5" /> {{ partner.phone }}</span
              >
            </p>
            <p class="flex flex-wrap gap-1.5 pt-0.5">
              <span :class="partner.accounts.length ? 'badge-success' : 'badge-warning'">
                {{ partner.accounts.length ? 'Compte créé' : 'Sans compte' }}
              </span>
              <span v-if="!partner.is_active" class="badge-neutral">Désactivé</span>
            </p>
          </div>
          <ChevronRight
            class="size-5 shrink-0 text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-500"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

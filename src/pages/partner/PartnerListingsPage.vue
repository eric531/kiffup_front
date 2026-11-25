<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, Package, Plus } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatXof } from '@/lib/format'
import { LISTING_TYPE_ICONS } from '@/lib/icons'
import { usePartnerProfile } from '@/composables/usePartnerProfile'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'
import { LISTING_STATUS_BADGES, LISTING_STATUS_LABELS, type Listing } from '@/types/catalog'

/** The partner's listings; created and changed here when the team allows it (V3, lot F6). */
const { partner, load: loadPartner } = usePartnerProfile()
const listings = ref<Listing[]>([])
const loading = ref(true)
const manages = computed(() => (partner.value?.listings_access ?? 'none') !== 'none')

onMounted(async () => {
  try {
    const [, response] = await Promise.all([
      loadPartner(),
      api.get<{ data: Listing[] }>('/api/v1/partner/listings'),
    ])
    listings.value = response.data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Mes offres"
      :subtitle="
        manages
          ? 'Créez et modifiez vos chambres, locations et séances. Les prix affichés au client comprennent les frais KiffUp.'
          : 'L’équipe KiffUp met à jour vos offres. Demandez-lui si vous souhaitez les gérer vous-même.'
      "
      :icon="Package"
    >
      <template v-if="manages" #actions>
        <RouterLink :to="{ name: 'partner.listings.create' }" class="btn-primary">
          <Plus class="size-4" /> Nouvelle offre
        </RouterLink>
      </template>
    </PageHeader>

    <p v-if="partner?.listings_access === 'review'" class="alert-info">
      Une nouvelle offre est vérifiée par l'équipe KiffUp avant d'être en ligne. Vos modifications
      d'une offre déjà en ligne s'appliquent tout de suite.
    </p>

    <ListSkeleton v-if="loading" />
    <EmptyState v-else-if="listings.length === 0" :icon="Package" title="Aucune offre">
      <RouterLink v-if="manages" :to="{ name: 'partner.listings.create' }" class="btn-primary">
        <Plus class="size-4" /> Créer ma première offre
      </RouterLink>
    </EmptyState>

    <ul v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <li v-for="(listing, i) in listings" :key="listing.id" v-reveal="(i % 2) * 70">
        <RouterLink
          :to="{ name: 'partner.listings.edit', params: { id: listing.id } }"
          class="group card card-hover flex items-start gap-4 p-4"
          :class="{ 'opacity-70': listing.status === 'hidden' }"
        >
          <span
            class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-brand-600"
          >
            <img
              v-if="listing.photos[0]"
              :src="listing.photos[0].url"
              alt=""
              class="size-full object-cover"
            />
            <component :is="LISTING_TYPE_ICONS[listing.type]" v-else class="size-6" />
          </span>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate font-semibold">{{ listing.title }}</p>
              <span :class="LISTING_STATUS_BADGES[listing.status]">
                {{ LISTING_STATUS_LABELS[listing.status] }}
              </span>
            </div>
            <p class="text-sm text-muted">
              {{ listing.units }} unité{{ listing.units > 1 ? 's' : '' }} · vous recevez
              <template v-if="listing.night_amount != null">
                {{ formatXof(listing.night_amount) }} / nuit</template
              ><template v-if="listing.day_amount != null">
                {{ formatXof(listing.day_amount) }} / jour</template
              ><template v-if="listing.session_amount != null">
                {{ formatXof(listing.session_amount) }} / séance</template
              >
            </p>
            <p
              v-if="listing.status === 'rejected' && listing.review_note"
              class="text-sm text-red-700"
            >
              Refusée : {{ listing.review_note }}
            </p>
          </div>
          <ChevronRight
            class="mt-1 size-5 shrink-0 text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-500"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

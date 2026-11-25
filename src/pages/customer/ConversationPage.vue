<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ChatThread from '@/components/messaging/ChatThread.vue'

/**
 * A conversation of the customer (lot F9). ?offre= / ?video= and ?sujet= tell where the customer
 * came from: shown above the first message.
 */
const props = defineProps<{ conversationId: string }>()
const route = useRoute()

const context = computed(() => {
  const listing = Number(route.query.offre) || undefined
  const video = Number(route.query.video) || undefined
  const title = typeof route.query.sujet === 'string' ? route.query.sujet : undefined
  return listing || video ? { listing_id: listing, video_id: video, title } : null
})
const passNeeded = ref(false)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <p v-if="passNeeded" class="alert-error m-2">
      Ton Pass Vitrine est terminé : prends-en un nouveau pour écrire aux lieux Vitrine.
      <RouterLink :to="{ name: 'discover-vitrine' }" class="font-semibold underline">
        Voir les formules
      </RouterLink>
    </p>
    <ChatThread
      class="min-h-0 flex-1"
      side="customer"
      :conversation-id="Number(props.conversationId)"
      :back="{ name: 'customer.messages' }"
      :context="context"
      @pass-required="passNeeded = true"
    />
  </div>
</template>

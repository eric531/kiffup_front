<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagingStore } from '@/stores/messaging'
// Installed app (PWA): listens to the browser's install offer from the first page.
import '@/composables/useInstallApp'

const route = useRoute()

// Messaging (lot F9): a logged-in customer gets its messages in real time and shows "En ligne"
// on every page, Découvrir included. Partners: started by the partner area (PartnerLayout).
const auth = useAuthStore()
const messaging = useMessagingStore()
watch(
  () => (auth.isCustomer ? auth.user?.id : null),
  (id, previous) => {
    if (id) messaging.start('customer', id)
    else if (previous) messaging.stop()
  },
  { immediate: true },
)

useHead({
  title: computed(() => route.meta.title),
  titleTemplate: (title) => (title ? `${title} · KiffUp` : 'KiffUp'),
  meta: [{ name: 'theme-color', content: '#0e0c1d' }],
})
</script>

<template>
  <RouterView />
</template>

<script setup lang="ts">
import MessengerLayout from '@/components/messaging/MessengerLayout.vue'

/**
 * "Messages" of the partner area (lot F9). Full height: on a phone it covers the page padding,
 * on a computer it fills the space next to the menu.
 */
</script>

<template>
  <div class="-mx-4 -my-8 h-[calc(100dvh-4rem)] lg:mx-0 lg:-my-4 lg:h-[calc(100dvh-2rem)]">
    <MessengerLayout
      side="partner"
      title="Messages"
      hint="Le bouton « Écrire » apparaît sur vos vidéos et vos offres : les questions des clients arriveront ici, et vous serez prévenu par WhatsApp."
    />
  </div>
</template>

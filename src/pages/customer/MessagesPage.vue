<script setup lang="ts">
import MessengerLayout from '@/components/messaging/MessengerLayout.vue'

/** "Mes messages" of the customer (lot F9): full height under the header, no footer. */
</script>

<template>
  <div class="mx-auto flex h-dvh max-w-6xl flex-col pt-16 lg:px-6 lg:pt-22 lg:pb-6">
    <MessengerLayout
      side="customer"
      title="Mes messages"
      hint="Touche « Écrire » sur une vidéo de Découvrir ou sur une offre pour poser ta question au lieu."
    >
      <template #empty-action>
        <RouterLink :to="{ name: 'discover' }" class="btn-primary mt-5"
          >Ouvrir Découvrir</RouterLink
        >
      </template>
    </MessengerLayout>
  </div>
</template>

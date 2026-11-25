<script setup lang="ts">
import { MessagesSquare } from 'lucide-vue-next'

/** Right pane of the inbox on a computer, before a conversation is chosen (lot F9). */
</script>

<template>
  <div class="grid h-full place-items-center bg-stone-50 p-8 text-center">
    <div>
      <span class="mx-auto grid size-16 place-items-center rounded-full bg-white shadow-sm">
        <MessagesSquare class="size-8 text-brand-500" />
      </span>
      <p class="mt-4 font-semibold">Choisissez une conversation</p>
      <p class="mt-1 text-sm text-muted">Les messages s’affichent ici.</p>
    </div>
  </div>
</template>

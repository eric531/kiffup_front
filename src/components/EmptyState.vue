<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from 'lucide-vue-next'

defineProps<{ title: string; text?: string; icon?: Component }>()
</script>

<template>
  <div class="card flex flex-col items-center px-6 py-12 text-center">
    <span class="relative grid size-16 place-items-center">
      <span class="absolute inset-0 animate-pulse rounded-3xl bg-brand-100/60" />
      <component :is="icon ?? Inbox" class="relative size-7 text-brand-600" />
    </span>
    <p class="mt-4 font-display text-lg font-bold">{{ title }}</p>
    <p v-if="text" class="mt-1 max-w-sm text-sm text-muted">{{ text }}</p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>

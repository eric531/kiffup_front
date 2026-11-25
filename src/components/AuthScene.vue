<script setup lang="ts">
import type { Component } from 'vue'
import StageBackdrop from '@/components/StageBackdrop.vue'

/** Dark full-height stage with a centred white panel: login, password and checkout screens. */
defineProps<{ title: string; subtitle?: string; icon?: Component; wide?: boolean }>()
</script>

<template>
  <section
    class="relative isolate flex min-h-dvh items-center overflow-hidden px-4 pt-28 pb-16 text-white"
  >
    <StageBackdrop intensity="soft" />
    <div class="relative mx-auto w-full" :class="wide ? 'max-w-lg' : 'max-w-md'">
      <div class="mb-8 animate-fade-up text-center">
        <span
          v-if="icon"
          class="mx-auto mb-5 grid size-14 animate-float place-items-center rounded-2xl bg-sunset shadow-glow"
        >
          <component :is="icon" class="size-6" />
        </span>
        <h1 class="text-3xl font-extrabold sm:text-4xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-2 text-white/70">{{ subtitle }}</p>
      </div>
      <div
        class="animate-fade-up rounded-4xl bg-white p-6 text-ink shadow-2xl ring-1 ring-white/10 [animation-delay:120ms] sm:p-8"
      >
        <slot />
      </div>
      <div class="mt-6 animate-fade-up text-center text-sm text-white/70 [animation-delay:200ms]">
        <slot name="after" />
      </div>
    </div>
  </section>
</template>

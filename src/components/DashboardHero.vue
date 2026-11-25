<script setup lang="ts">
import { computed } from 'vue'

/** Dark welcome banner at the top of the partner and admin dashboards. */
defineProps<{ eyebrow?: string; title: string; subtitle?: string }>()

const today = computed(() =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Abidjan',
  }).format(new Date()),
)
</script>

<template>
  <section
    class="relative isolate overflow-hidden rounded-4xl bg-night-950 px-6 py-7 text-white shadow-lift sm:px-8 sm:py-9"
  >
    <div
      class="pointer-events-none absolute -top-20 -right-16 -z-10 size-72 animate-blob rounded-full bg-flare-500/35 blur-3xl"
    />
    <div
      class="pointer-events-none absolute -bottom-24 left-1/4 -z-10 size-72 animate-blob rounded-full bg-brand-500/30 blur-3xl [animation-delay:-6s]"
    />
    <div
      class="pointer-events-none absolute top-0 left-0 -z-10 size-56 animate-blob rounded-full bg-dusk-600/30 blur-3xl [animation-delay:-12s]"
    />

    <div class="flex flex-wrap items-end justify-between gap-6">
      <div class="animate-fade-up">
        <p
          class="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase first-letter:uppercase"
        >
          {{ eyebrow ?? today }}
        </p>
        <h1 class="mt-2 text-3xl font-extrabold sm:text-4xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-2 max-w-xl text-white/70">{{ subtitle }}</p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex animate-fade-up flex-wrap gap-2 [animation-delay:120ms]"
      >
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.default" class="mt-7 animate-fade-up [animation-delay:200ms]">
      <slot />
    </div>
  </section>
</template>

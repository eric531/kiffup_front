<script setup lang="ts">
import { useId } from 'vue'
/**
 * Concert-stage background for dark heroes: optional photo, drifting colour blobs,
 * sweeping spotlights and a subtle grain. Purely decorative (aria-hidden).
 */
const grainId = `grain-${useId()}`

withDefaults(
  defineProps<{ image?: string | null; spotlights?: boolean; intensity?: 'full' | 'soft' }>(),
  {
    image: null,
    spotlights: true,
    intensity: 'full',
  },
)
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden bg-night-950" aria-hidden="true">
    <img
      v-if="image"
      :src="image"
      alt=""
      class="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-[2px]"
    />
    <!-- Colour blobs -->
    <div
      class="absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-500/45 blur-3xl animate-blob"
    />
    <div
      class="absolute top-10 -right-32 size-[32rem] rounded-full bg-dusk-600/45 blur-3xl animate-blob [animation-delay:-6s]"
    />
    <div
      v-if="intensity === 'full'"
      class="absolute -bottom-40 left-1/3 size-[30rem] rounded-full bg-flare-500/35 blur-3xl animate-blob [animation-delay:-12s]"
    />
    <!-- Spotlights -->
    <template v-if="spotlights">
      <div
        class="absolute -top-10 left-[18%] h-[130%] w-40 origin-top bg-gradient-to-b from-white/25 via-white/5 to-transparent blur-xl animate-spotlight"
      />
      <div
        class="absolute -top-10 right-[22%] h-[130%] w-40 origin-top bg-gradient-to-b from-brand-200/25 via-white/5 to-transparent blur-xl animate-spotlight [animation-delay:-4.5s]"
      />
    </template>
    <!-- Readability: darker at the bottom, grain on top -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-night-950/30 via-night-950/40 to-night-950"
    />
    <svg class="absolute inset-0 size-full opacity-[0.07] mix-blend-overlay">
      <filter :id="grainId">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="3"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" :filter="`url(#${grainId})`" />
    </svg>
  </div>
</template>

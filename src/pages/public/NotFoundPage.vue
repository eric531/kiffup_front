<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import StageBackdrop from '@/components/StageBackdrop.vue'
</script>

<template>
  <div
    class="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center text-white"
  >
    <StageBackdrop />
    <RouterLink :to="{ name: 'home' }" class="absolute top-6 left-1/2 -translate-x-1/2">
      <BrandLogo />
    </RouterLink>
    <p
      class="animate-pop bg-sunset bg-clip-text font-display text-[9rem] leading-none font-extrabold text-transparent sm:text-[13rem]"
    >
      404
    </p>
    <h1 class="mt-2 animate-fade-up text-2xl font-bold sm:text-3xl [animation-delay:120ms]">
      Cette page n'existe pas.
    </h1>
    <p class="mt-2 max-w-md animate-fade-up text-white/70 [animation-delay:200ms]">
      Le lien est peut-être incomplet, ou la scène a changé de place.
    </p>
    <RouterLink
      :to="{ name: 'home' }"
      class="btn-primary mt-8 animate-fade-up px-7 py-3.5 [animation-delay:280ms]"
    >
      <ArrowLeft class="size-4" /> Retour à l'accueil
    </RouterLink>
  </div>
</template>

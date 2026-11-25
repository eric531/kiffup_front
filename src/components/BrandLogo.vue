<script setup lang="ts">
withDefaults(defineProps<{ light?: boolean }>(), { light: true })
</script>

<template>
  <span class="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
    <span class="relative grid size-8 place-items-center rounded-xl bg-sunset shadow-glow">
      <svg
        viewBox="0 0 24 24"
        class="size-4.5 text-white"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        aria-hidden="true"
      >
        <path d="M4 18V9l8-5 8 5v9" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 18v-5h6v5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span :class="light ? 'text-white' : 'text-ink'"
      >Kiff<span class="text-gradient">Up</span></span
    >
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ aspect?: string }>(), { aspect: 'aspect-[4/3]' })
</script>

<template>
  <div
    class="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-card"
    aria-hidden="true"
  >
    <div class="skeleton rounded-none" :class="aspect" />
    <div class="space-y-3 p-5">
      <div class="skeleton h-4 w-3/4" />
      <div class="skeleton h-3 w-1/2" />
      <div class="skeleton h-6 w-1/3" />
    </div>
  </div>
</template>

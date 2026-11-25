<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>

<template>
  <div class="space-y-3" aria-busy="true" aria-label="Chargement">
    <div v-for="n in rows" :key="n" class="card flex items-center gap-4">
      <div class="skeleton size-12 shrink-0 rounded-2xl" />
      <div class="flex-1 space-y-2">
        <div class="skeleton h-4 w-1/3" />
        <div class="skeleton h-3 w-2/3" />
      </div>
      <div class="skeleton h-6 w-20 rounded-full" />
    </div>
  </div>
</template>

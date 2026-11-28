<script setup lang="ts">
/** Placeholder of a form while its record loads (edit pages), instead of an empty form. */
withDefaults(defineProps<{ fields?: number }>(), { fields: 6 })
</script>

<template>
  <div class="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" aria-busy="true" aria-label="Chargement">
    <div v-for="n in fields" :key="n" class="space-y-2">
      <div class="skeleton h-4 w-24" />
      <div class="skeleton h-11 rounded-2xl" />
    </div>
    <div class="skeleton h-11 w-40 rounded-full sm:col-span-2" />
  </div>
</template>

<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

defineProps<{ placeholder?: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="relative w-full sm:max-w-xs">
    <Search
      class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400"
    />
    <input
      v-model="model"
      class="input pr-10 pl-10"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
    />
    <button
      v-if="model"
      type="button"
      class="absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-ink"
      aria-label="Effacer la recherche"
      @click="model = ''"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>

<style scoped>
/* The clear button replaces the browser's own one. */
input::-webkit-search-cancel-button {
  display: none;
}
</style>

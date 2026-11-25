<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Logo of a mobile money wallet. The official files go in public/paiement/<code>.png (square,
 * 128 px or more): wave, orange, mtn, moov, djamo. Until a file is there, a tile in the brand's
 * colour with its initials is shown.
 */
const props = withDefaults(defineProps<{ code: string; size?: 'sm' | 'md' }>(), { size: 'md' })

const TILES: Record<string, { text: string; class: string }> = {
  wave: { text: 'W', class: 'bg-sky-400 text-white' },
  orange: { text: 'OM', class: 'bg-orange-500 text-white' },
  mtn: { text: 'MTN', class: 'bg-yellow-400 text-stone-900' },
  moov: { text: 'Moov', class: 'bg-blue-700 text-white' },
  djamo: { text: 'D', class: 'bg-violet-600 text-white' },
}

const missing = ref(false)
const tile = computed(() => TILES[props.code] ?? { text: '?', class: 'bg-stone-300 text-white' })
const box = computed(() => (props.size === 'sm' ? 'size-6 rounded-md' : 'size-9 rounded-xl'))
</script>

<template>
  <img
    v-if="!missing"
    :src="`/paiement/${code}.png`"
    alt=""
    :class="[box, 'shrink-0 bg-white object-contain ring-1 ring-black/5']"
    @error="missing = true"
  />
  <span
    v-else
    :class="[
      box,
      tile.class,
      size === 'sm' ? 'text-[8px]' : tile.text.length > 2 ? 'text-[10px]' : 'text-xs',
    ]"
    class="grid shrink-0 place-items-center leading-none font-extrabold"
    aria-hidden="true"
    >{{ tile.text }}</span
  >
</template>

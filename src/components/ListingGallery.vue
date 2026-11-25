<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { LISTING_TYPE_GRADIENTS, LISTING_TYPE_ICONS } from '@/lib/icons'
import type { Listing } from '@/types/catalog'

/** Photos of a listing with arrows and thumbnails; a gradient with the type icon when there is none. */
const props = defineProps<{ listing: Listing }>()

const activePhoto = ref(0)
const TypeIcon = computed(() => LISTING_TYPE_ICONS[props.listing.type])
const photoCount = computed(() => props.listing.photos.length)
const go = (step: number) =>
  (activePhoto.value = (activePhoto.value + step + photoCount.value) % photoCount.value)
watch(
  () => props.listing.id,
  () => (activePhoto.value = 0),
)
</script>

<template>
  <div>
    <div v-if="photoCount" class="space-y-3">
      <div class="group relative overflow-hidden rounded-4xl bg-night-900 shadow-lift">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 scale-105"
          leave-active-class="transition duration-200"
          leave-to-class="opacity-0"
        >
          <img
            :key="activePhoto"
            :src="listing.photos[activePhoto]?.url"
            :alt="listing.title"
            class="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
          />
        </Transition>
        <template v-if="photoCount > 1">
          <button
            class="btn-light absolute top-1/2 left-3 size-10 -translate-y-1/2 p-0 opacity-90"
            aria-label="Photo précédente"
            @click="go(-1)"
          >
            <ChevronLeft class="size-5" />
          </button>
          <button
            class="btn-light absolute top-1/2 right-3 size-10 -translate-y-1/2 p-0 opacity-90"
            aria-label="Photo suivante"
            @click="go(1)"
          >
            <ChevronRight class="size-5" />
          </button>
          <span class="chip absolute right-4 bottom-4 bg-night-950/70 text-white"
            >{{ activePhoto + 1 }} / {{ photoCount }}</span
          >
        </template>
      </div>
      <div v-if="photoCount > 1" class="flex gap-2.5 overflow-x-auto pb-1">
        <button
          v-for="(photo, index) in listing.photos"
          :key="photo.id"
          class="size-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-surface transition"
          :class="
            index === activePhoto
              ? 'ring-brand-500'
              : 'opacity-70 ring-transparent hover:opacity-100'
          "
          :aria-label="`Photo ${index + 1}`"
          @click="activePhoto = index"
        >
          <img :src="photo.url" alt="" class="size-full object-cover" />
        </button>
      </div>
    </div>
    <div
      v-else
      class="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-4xl bg-gradient-to-br text-white shadow-lift"
      :class="LISTING_TYPE_GRADIENTS[listing.type]"
    >
      <component
        :is="TypeIcon"
        v-if="TypeIcon"
        class="absolute -right-10 -bottom-10 size-72 rotate-[-12deg] text-white/10"
      />
      <span class="glass grid size-24 animate-float place-items-center rounded-3xl shadow-xl">
        <component :is="TypeIcon" v-if="TypeIcon" class="size-11" />
      </span>
    </div>
  </div>
</template>

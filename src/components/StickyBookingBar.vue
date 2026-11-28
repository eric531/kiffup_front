<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { formatXof } from '@/lib/format'

/**
 * Phones: price and "Réserver" pinned above the tab bar, as in booking apps. The button scrolls to
 * the booking form; the bar steps aside while that form is on screen.
 */
const props = defineProps<{
  /** Lowest price shown ("à partir de"). */
  price: number
  /** "/ nuit", "/ séance"… */
  unit?: string
  /** Id of the booking form on the page. */
  target: string
  label?: string
}>()

const formVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const form = document.getElementById(props.target)
  if (!form || !('IntersectionObserver' in window)) return
  observer = new IntersectionObserver(([entry]) => (formVisible.value = !!entry?.isIntersecting), {
    rootMargin: '0px 0px -30% 0px',
  })
  observer.observe(form)
})
onBeforeUnmount(() => observer?.disconnect())

function goToForm() {
  document.getElementById(props.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="!formVisible"
      class="fixed inset-x-0 bottom-[var(--tabbar)] z-30 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgb(0_0_0_/_0.25)] backdrop-blur lg:hidden"
    >
      <div class="mx-auto flex max-w-lg items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted">À partir de</p>
          <p class="truncate font-display text-lg font-extrabold">
            {{ formatXof(price) }}
            <span v-if="unit" class="text-sm font-medium text-muted">{{ unit }}</span>
          </p>
        </div>
        <button type="button" class="btn-primary px-6 py-3" @click="goToForm">
          {{ label ?? 'Réserver' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Thin bar at the top of the screen while the next page loads (its code is downloaded on the
 * first visit). Shown only when the change takes more than a moment, so it never flickers.
 */
const SHOW_AFTER_MS = 150

const router = useRouter()
const visible = ref(false)
const progress = ref(0)
let showTimer: ReturnType<typeof setTimeout> | undefined
let trickle: ReturnType<typeof setInterval> | undefined

function start() {
  clearTimeout(showTimer)
  clearInterval(trickle)
  showTimer = setTimeout(() => {
    progress.value = 12
    visible.value = true
    // Creeps towards 90 % until the page is there.
    trickle = setInterval(() => (progress.value += (90 - progress.value) * 0.12), 200)
  }, SHOW_AFTER_MS)
}

function done() {
  clearTimeout(showTimer)
  clearInterval(trickle)
  if (!visible.value) return
  progress.value = 100
  setTimeout(() => {
    visible.value = false
    progress.value = 0
  }, 300)
}

const removeBefore = router.beforeEach(() => {
  start()
})
const removeAfter = router.afterEach(() => done())
const removeError = router.onError(() => done())
onBeforeUnmount(() => {
  removeBefore()
  removeAfter()
  removeError()
  done()
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[calc(3px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] transition-opacity duration-300"
    :class="visible ? 'opacity-100' : 'opacity-0'"
    role="progressbar"
    aria-label="Chargement de la page"
    :aria-hidden="!visible"
  >
    <div
      class="h-[3px] rounded-r-full bg-[linear-gradient(90deg,#f97316,#ec4899,#7c3aed)] shadow-[0_0_10px_rgb(236_72_153_/_0.7)] transition-[width] duration-200 ease-out"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>

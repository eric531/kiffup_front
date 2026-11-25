import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * Animated counter for dashboard figures: eases from the previous value to the new one.
 * Integers only (amounts are whole XOF); instant when the user prefers reduced motion.
 */
export function useCountUp(target: Ref<number>, duration = 900): Ref<number> {
  const display = ref(0)
  let frame = 0

  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  watch(
    target,
    (to) => {
      cancelAnimationFrame(frame)
      const from = display.value
      if (reduced || typeof requestAnimationFrame === 'undefined' || from === to) {
        display.value = to
        return
      }
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - (1 - t) ** 3
        display.value = from + Math.trunc((to - from) * eased)
        if (t < 1) frame = requestAnimationFrame(step)
        else display.value = to
      }
      frame = requestAnimationFrame(step)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => cancelAnimationFrame(frame))
  return display
}

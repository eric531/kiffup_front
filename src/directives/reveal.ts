import type { Directive } from 'vue'

/**
 * v-reveal: fades and slides an element in when it enters the viewport (once).
 * v-reveal="120" delays it by 120 ms (stagger lists).
 */
let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // Also reveal elements already scrolled past (a fast scroll can jump over the viewport).
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.setAttribute('data-reveal', 'visible')
          observer?.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  return observer
}

export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const io = getObserver()
    if (!io) return
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    el.setAttribute('data-reveal', 'hidden')
    io.observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}

declare module 'vue' {
  export interface GlobalDirectives {
    vReveal: typeof vReveal
  }
}

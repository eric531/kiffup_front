import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'

import App from './App.vue'
import router from './router'
import { vReveal } from './directives/reveal'

const app = createApp(App)

app.use(createPinia())
app.use(createHead())
app.use(router)
app.directive('reveal', vReveal)

app.mount('#app')

// Launch screen (index.html): fades out once the first page is ready, after a short minimum so it
// does not flash on a fast connection.
const SPLASH_MIN_MS = 600
router.isReady().finally(() => {
  const splash = document.getElementById('splash')
  if (!splash) return
  const wait = Math.max(0, SPLASH_MIN_MS - performance.now())
  setTimeout(() => {
    splash.classList.add('splash-hidden')
    setTimeout(() => splash.remove(), 400)
  }, wait)
})

// Installed app (PWA): the service worker keeps the built files on the phone and shows a
// "no connection" page offline. Never in development (Vite serves files differently).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

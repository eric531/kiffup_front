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

// Installed app (PWA): the service worker keeps the built files on the phone and shows a
// "no connection" page offline. Never in development (Vite serves files differently).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

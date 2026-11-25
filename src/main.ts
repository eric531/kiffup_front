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

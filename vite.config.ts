import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development the Laravel API is proxied, so the SPA and the API share the same origin
  // (Sanctum session cookies, no CORS). In production VITE_API_URL points to api.kiffup.com.
  const apiTarget = env.VITE_DEV_API_PROXY ?? 'http://localhost:8000'
  // Messaging in real time (lot F9): Laravel Reverb, reached on the same origin as the SPA.
  const reverbTarget = env.VITE_DEV_REVERB_PROXY ?? 'http://localhost:8080'

  return {
    // VITE_DEVTOOLS=false hides the Vue devtools button (demos, screenshots).
    plugins: [vue(), tailwindcss(), ...(env.VITE_DEVTOOLS === 'false' ? [] : [vueDevTools()])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Demo through a tunnel (ngrok): any subdomain of these hosts may reach the dev server.
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
      // Docker on Windows/macOS: bind mounts do not propagate file events.
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
        '/auth': { target: apiTarget, changeOrigin: false },
        '/sanctum': { target: apiTarget, changeOrigin: false },
        // Uploaded images (relative URLs, so they also load through a tunnel).
        '/storage': { target: apiTarget, changeOrigin: false },
        // WebSocket of Messaging (/app/<key>).
        '^/app/': { target: reverbTarget, ws: true, changeOrigin: false },
      },
    },
  }
})

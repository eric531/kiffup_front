/*
 * KiffUp — service worker of the installed app (PWA). Deliberately small:
 *  - the API, payments, logins, photos and real time are never touched (always the network);
 *  - built files (/assets/, unique names) are kept on the phone: the app opens fast;
 *  - pages always come from the network (latest version after each deployment), with a
 *    "no connection" page when the network is down.
 */
const SHELL = 'kiffup-shell-v2'
const ASSETS = 'kiffup-assets'
const OFFLINE = '/offline.html'
const MAX_ASSETS = 80

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll([OFFLINE, '/icons/icon-192.png'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('kiffup-shell-') && key !== SHELL)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // The API (api.kiffup.com) and other sites: untouched.
  if (url.origin !== self.location.origin) return
  if (/^\/(api|auth|sanctum|storage|app|og|broadcasting)(\/|$)/.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          await cache.put(request, response.clone())
          trim(cache)
        }
        return response
      }),
    )
  }
})

/** Old versions of the built files go away: the newest MAX_ASSETS stay. */
async function trim(cache) {
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key)
}

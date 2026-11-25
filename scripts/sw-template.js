const prefix = 'memebooth-shell-'
const cacheName = prefix + '__VERSION__'
// The build replaces the string literal with a list of revisioned local assets.
const files = '__FILES__'

/**
 * Strips the `redirected` flag from a fetched Response so Chrome/Edge never
 * reject a cached response on `mode: 'navigate'` (e.g. Cloudflare Pages/Workers
 * redirecting `/index.html` -> `/`).
 */
async function toCleanResponse(response) {
  if (!response.redirected) return response
  const body = await response.arrayBuffer()
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName)
      const rootUrl = new URL('./', self.registration.scope).href
      await Promise.all(
        files.map(async (file) => {
          // Fetch `./` for index.html so hosts with Pretty URLs (307/308) return 200 directly.
          const fetchUrl =
            file === 'index.html'
              ? rootUrl
              : new URL(file, self.registration.scope).href
          const res = await fetch(new Request(fetchUrl, { cache: 'reload' }))
          if (!res.ok) throw new Error('Precache failed: ' + file)
          const clean = await toCleanResponse(res)
          await cache.put(
            new URL(file, self.registration.scope).href,
            clean.clone(),
          )
          if (file === 'index.html') await cache.put(rootUrl, clean)
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(prefix) && name !== cacheName)
          await caches.delete(name)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName)
      if (event.request.mode === 'navigate') {
        const rootUrl = new URL('./', self.registration.scope).href
        const cached =
          (await cache.match(rootUrl, { ignoreVary: true })) ||
          (await cache.match(
            new URL('index.html', self.registration.scope).href,
            { ignoreVary: true },
          ))
        if (cached) return toCleanResponse(cached)
        return fetch(event.request)
      }
      // The cache contains only public, byte-identical build assets. Module
      // requests can carry an Origin header absent from the install request.
      const cached = await cache.match(event.request, { ignoreVary: true })
      if (cached) return toCleanResponse(cached)
      return fetch(event.request)
    })(),
  )
})

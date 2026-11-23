const prefix = 'memebooth-shell-'
const cacheName = prefix + '__VERSION__'
// The build replaces the string literal with a list of revisioned local assets.
const files = '__FILES__'
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName)
      await cache.addAll(
        files.map(
          (file) =>
            new Request(new URL(file, self.registration.scope), {
              cache: 'reload',
            }),
        ),
      )
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
      const resource =
        event.request.mode === 'navigate'
          ? new URL('index.html', self.registration.scope).href
          : event.request
      // The cache contains only public, byte-identical build assets. Module
      // requests can carry an Origin header absent from the install request.
      return (
        (await cache.match(resource, { ignoreVary: true })) ||
        fetch(event.request)
      )
    })(),
  )
})

// literas PWA service worker — network-first, yalnızca statik asset cache
const CACHE = 'literas-static-v1'
const ASSETS = ['/', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Sadece GET + kendi origin'imiz; API ve diğer istekler dokunulmadan geçer
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  // API rotalarını asla cache'leme (RSVP, arama, cron vs. taze olmalı)
  if (new URL(request.url).pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then((res) => {
        // Başarılı yanıtı cache'e kopyala (sonraki offline erişim için)
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy))
        return res
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
  )
})

const CACHE = 'routine-assist-v8'
const CORE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/brand-mark.svg', '/apple-touch-icon.png']
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))))
self.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))), self.clients.claim()])))
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('/'))))
})
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Routine Assist', body: 'Você tem uma nova pendência.' }
  event.waitUntil(self.registration.showNotification(data.title || 'Routine Assist', {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/'
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data || '/'))
})

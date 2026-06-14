/* ══════════════════════════════════════════
   sw.js — Service Worker unique
   Fusionne ton sw.js PWA existant avec
   la gestion des notifications push
   ══════════════════════════════════════════ */

/* ── PWA CACHE (garde ton cache existant) ── */
const CACHE_NAME = 'twenty-three-v1';
const ASSETS = [
  '/', '/index.html', '/app.js', '/style.css',
  '/firebase-messaging.js', '/messaging-patch.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

/* ── NOTIFICATIONS PUSH ── */

/* Reçoit un push envoyé depuis l'autre appareil via postMessage */
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: 'Twenty Three 💌', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(payload.title || 'Twenty Three 💌', {
      body: payload.body || 'Un nouveau message t\'attend…',
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: 'twenty-three-msg',
      renotify: true,
      data: { url: self.location.origin },
    })
  );
});

/* Clic sur la notification → ouvre/focus l'app */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.location.origin);
    })
  );
});

/* Reçoit un message depuis l'app pour afficher une notif
   (utilisé quand on veut notifier depuis le client sans serveur) */
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: 'twenty-three-msg',
      renotify: true,
    });
  }
});

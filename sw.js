/* ══════════════════════════════════════════
   sw.js — Service Worker
   PWA cache + notifications push
   ══════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
importScripts('firebase-config.js');

/* ── PWA CACHE ── */
const CACHE_NAME = 'twenty-three-v7';
const ASSETS = [
  './', './index.html', './app.js', './style.css',
  './firebase-config.js', './profiles.js',
  './firebase-messaging.js', './messaging-patch.js',
  './shared.js', './presence.js', './open-when.js', './daily.js',
  './together.js', './voice.js', './memories.js', './play.js', './extras.js', './logo.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {}))
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

/* Réseau d'abord (les mises à jour arrivent tout de suite),
   cache en secours quand on est hors ligne */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  // Les mp3 sont lus par plages (206) : on les laisse au navigateur
  if (req.destination === 'audio' || req.headers.has('range')) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

/* ══════════════════════════════════════════
   PUSH (Firebase Cloud Messaging)
   Les notifications sont envoyées par la Cloud Function
   (functions/index.js) → elles arrivent même appli fermée
   ══════════════════════════════════════════ */

firebase.initializeApp(self.FIREBASE_CONFIG);

/* Messages « data » uniquement : on construit la notification nous-mêmes */
firebase.messaging().onBackgroundMessage((payload) => {
  const d = payload.data || {};
  return self.registration.showNotification(d.title || "Twenty Three ✦", {
    body:     d.body || "",
    icon:     "logo.svg",
    badge:    "logo.svg",
    tag:      d.tag || "twenty-three",
    renotify: true,
    data:     { url: self.registration.scope },
  });
});

/* ── Notification demandée par l'app (si le push n'est pas configuré) ── */
self.addEventListener("message", (e) => {
  if (e.data?.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(e.data.title, {
      body:     e.data.body,
      icon:     "logo.svg",
      tag:      "twenty-three-msg",
      renotify: true,
    });
  }
});

/* ── Clic sur la notification → ouvre l'app ── */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.registration.scope);
    })
  );
});

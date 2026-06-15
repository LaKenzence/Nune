/* ══════════════════════════════════════════
   sw.js — Service Worker
   PWA cache + écoute Firestore en background
   ══════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');

/* ── PWA CACHE ── */
const CACHE_NAME = 'twenty-three-v2';
const ASSETS = [
  './', './index.html', './app.js', './style.css',
  './firebase-messaging.js', './messaging-patch.js',
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

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

/* ══════════════════════════════════════════
   FIRESTORE EN BACKGROUND
   Le SW écoute les messages même app fermée
   ══════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB8DdHNzhb7GtLAn4q4-qVoxQozOxxwLv8",
  authDomain:        "nune-576b9.firebaseapp.com",
  projectId:         "nune-576b9",
  storageBucket:     "nune-576b9.firebasestorage.app",
  messagingSenderId: "475731736587",
  appId:             "1:475731736587:web:6b03d532fa07a8cfd26f0e",
};

const USERS = {
  kenzo: { name: 'Kenzo', emoji: '✦' },
  nune:  { name: 'Nune',  emoji: '🌙' },
};

let swDb          = null;
let swCurrentUser = null;
let swUnsubscribe = null;
let swSeenIds     = new Set();
let swFirstLoad   = true;

function initSwFirestore(identity) {
  // Déjà init pour ce user → rien à faire
  if (swDb && swCurrentUser === identity) return;

  swCurrentUser = identity;

  if (!self.firebase.apps.length) {
    self.firebase.initializeApp(FIREBASE_CONFIG);
  }
  swDb = self.firebase.firestore();

  startListening();
}

function startListening() {
  if (swUnsubscribe) {
    swUnsubscribe();
    swUnsubscribe = null;
  }

  swFirstLoad = true;

  const q = swDb.collection('messages').orderBy('createdAt', 'asc');

  swUnsubscribe = q.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return;

      const id   = change.doc.id;
      const data = change.doc.data();

      if (swSeenIds.has(id)) return;
      swSeenIds.add(id);

      // Ignore le chargement initial et les messages qu'on a envoyés
      if (!swFirstLoad && data.from && data.from !== swCurrentUser) {
        showSwNotification(data);
      }
    });

    swFirstLoad = false;

  }, (err) => {
    console.error('[SW] Firestore error:', err);
  });
}

function showSwNotification(data) {
  const user  = USERS[data.from] || { name: data.from, emoji: '💌' };
  const title = `${user.emoji} ${user.name} t'a écrit 💌`;
  const body  = data.text
    ? (data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text)
    : '';

  self.registration.showNotification(title, {
    body,
    icon:     '/manifest.json',
    tag:      'twenty-three-msg',
    renotify: true,
    data:     { url: self.location.origin },
  });
}

/* ── Messages reçus depuis l'app ── */
self.addEventListener('message', (e) => {
  // L'app nous dit qui est connecté → on démarre l'écoute Firestore
  if (e.data?.type === 'INIT_IDENTITY') {
    initSwFirestore(e.data.identity);
  }

  // Notification directe (foreground/background depuis l'app)
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title, {
      body:     e.data.body,
      icon:     '/manifest.json',
      tag:      'twenty-three-msg',
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
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.location.origin);
    })
  );
});

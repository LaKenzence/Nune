/* ══════════════════════════════════════════
   firebase-messaging-sw.js
   À placer à la RACINE du projet (même niveau que index.html)
   ══════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

/* 🔧 Même config que firebase-messaging.js */
firebase.initializeApp({
  apiKey: "AIzaSyB8DdHNzhb7GtLAn4q4-qVoxQozOxxwLv8",
  authDomain: "nune-576b9.firebaseapp.com",
  projectId: "nune-576b9",
  storageBucket: "nune-576b9.firebasestorage.app",
  messagingSenderId: "475731736587",
  appId: "1:475731736587:web:6b03d532fa07a8cfd26f0e",
  measurementId: "G-DWPNRS0QGT"
});

vapidKey: window.VAPID_KEY || "BGLQD9cyqPQNfUJpaSZ0uZcu1czgO1cx4cic0cAD8WzoyjvluYvB7ebKdNM5IKw0Ujf13n4l-EdhTlaFcUBqmgM"

const messaging = firebase.messaging();

/* Notification reçue en background (app fermée / en arrière-plan) */
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Twenty Three 💌", {
    body: body || "Un nouveau signal t'attend…",
    icon: "/logo.svg",
    badge: "/logo.svg",
    tag: "twenty-three-msg",       // Remplace la notif précédente au lieu d'empiler
    renotify: true,
    data: { url: self.location.origin },
  });
});

/* Clic sur la notification → ouvre l'app */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.location.origin);
    })
  );
});

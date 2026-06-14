/* ══════════════════════════════════════════
   firebase-messaging.js
   À inclure AVANT app.js dans index.html :
   <script type="module" src="firebase-messaging.js"></script>
   ══════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* ─────────────────────────────────────────
   🔧 CONFIGURATION — à remplacer par tes
   vraies valeurs Firebase (voir GUIDE.md)
───────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyB8DdHNzhb7GtLAn4q4-qVoxQozOxxwLv8",
  authDomain: "nune-576b9.firebaseapp.com",
  projectId: "nune-576b9",
  storageBucket: "nune-576b9.firebasestorage.app",
  messagingSenderId: "475731736587",
  appId: "1:475731736587:web:6b03d532fa07a8cfd26f0e",
  measurementId: "G-DWPNRS0QGT"
};

/* VAPID key — Firebase Console > Cloud Messaging > Web Push certificates */
const VAPID_KEY = "BGLQD9cyqPQNfUJpaSZ0uZcu1czgO1cx4cic0cAD8WzoyjvluYvB7ebKdNM5IKw0Ujf13n4l-EdhTlaFcUBqmgM";

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);
const messaging   = getMessaging(firebaseApp);

/* Expose sur window pour que app.js puisse les utiliser */
window._fb = { db, messaging, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getToken, onMessage };

/* ─────────────────────────────────────────
   ÉCOUTE DES MESSAGES EN FOREGROUND
   (quand l'app est ouverte)
───────────────────────────────────────── */
onMessage(messaging, (payload) => {
  const { title, body } = payload.notification || {};
  if (window.showToast) window.showToast(`💌 ${body || title}`);
  if (window.appendIncomingMessage) window.appendIncomingMessage(body || title);
});

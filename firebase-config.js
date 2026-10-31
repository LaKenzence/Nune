/* ══════════════════════════════════════════
   firebase-config.js — config partagée
   Lue par la page (firebase-messaging.js) et par le service worker (sw.js).
   ══════════════════════════════════════════ */
self.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB8DdHNzhb7GtLAn4q4-qVoxQozOxxwLv8",
  authDomain:        "nune-576b9.firebaseapp.com",
  projectId:         "nune-576b9",
  storageBucket:     "nune-576b9.firebasestorage.app",
  messagingSenderId: "475731736587",
  appId:             "1:475731736587:web:6b03d532fa07a8cfd26f0e",
};

/* 🔧 Clé VAPID : console Firebase → Paramètres du projet → Cloud Messaging
   → « Certificats Web Push » → Générer. Colle la clé publique ici.
   Tant qu'elle est vide, les notifications push sont désactivées. */
self.FIREBASE_VAPID_KEY = "";

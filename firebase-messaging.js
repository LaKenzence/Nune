/* ══════════════════════════════════════════
   firebase-messaging.js
   ══════════════════════════════════════════ */
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, addDoc, setDoc, getDoc, deleteDoc, onSnapshot,
  query, orderBy, limitToLast, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken, isSupported }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* 🔧 Ta config Firebase */
const firebaseConfig = {
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
const VAPID_KEY = "";

/* Init */
const firebaseApp = initializeApp(firebaseConfig);

/* Cache local persistant : l'appli s'ouvre instantanément et marche hors ligne
   (photos et messages ne sont plus re-téléchargés à chaque ouverture) */
let db;
try {
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  db = initializeFirestore(firebaseApp, { localCache: memoryLocalCache() });
}

/* Récupère le jeton push de cet appareil (null si non supporté / pas configuré) */
async function getPushToken(serviceWorkerRegistration) {
  if (!VAPID_KEY) return null;
  if (!(await isSupported())) return null;
  const messaging = getMessaging(firebaseApp);
  return getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
}

/* Expose sur window pour que messaging-patch.js puisse l'utiliser */
window._fb = {
  db,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limitToLast,
  serverTimestamp,
  getPushToken,
};

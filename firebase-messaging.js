/* ══════════════════════════════════════════
   firebase-messaging.js
   ══════════════════════════════════════════ */
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limitToLast, where, getDocs, getCountFromServer, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken, isSupported }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import { getAuth, onAuthStateChanged, signInAnonymously }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* Config et clé VAPID : firebase-config.js (partagé avec sw.js) */
const firebaseConfig = window.FIREBASE_CONFIG;
const VAPID_KEY      = window.FIREBASE_VAPID_KEY;

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

/* Connexion anonyme : chaque appareil a un identifiant stable,
   que les règles Firestore relient au code secret du couple (members/{uid}).
   Si la connexion anonyme n'est pas activée, l'appli continue sans. */
const auth = getAuth(firebaseApp);
async function signIn() {
  const user = await new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (u) => { stop(); resolve(u); });
  });
  if (user) return user;
  return (await signInAnonymously(auth)).user;
}
try {
  await Promise.race([signIn(), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000))]);
} catch (e) {
  console.warn("Connexion anonyme indisponible :", e.code || e.message);
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
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limitToLast,
  where,
  getDocs,
  getCountFromServer,
  writeBatch,
  serverTimestamp,
  getPushToken,
  get uid() { return auth.currentUser?.uid || null; },
};

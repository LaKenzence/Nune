/* ══════════════════════════════════════════
   firebase-messaging.js
   ══════════════════════════════════════════ */
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log('Firebase prêt, _fb exposé');
/* 🔧 Ta config Firebase */
const firebaseConfig = {
  apiKey:            "AIzaSyB8DdHNzhb7GtLAn4q4-qVoxQozOxxwLv8",
  authDomain:        "nune-576b9.firebaseapp.com",
  projectId:         "nune-576b9",
  storageBucket:     "nune-576b9.firebasestorage.app",
  messagingSenderId: "475731736587",
  appId:             "1:475731736587:web:6b03d532fa07a8cfd26f0e",
};

/* Init */
const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);

/* Expose sur window pour que messaging-patch.js puisse l'utiliser */
window._fb = {
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
};

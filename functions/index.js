/* ══════════════════════════════════════════
   functions/index.js — notifications push
   Chaque nouveau document Firestore (message, réaction, humeur,
   signal, photo) envoie une notification à l'autre personne,
   même quand l'appli est fermée.
   Déploiement : firebase deploy --only functions
   ══════════════════════════════════════════ */
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule }        = require("firebase-functions/v2/scheduler");
const { setGlobalOptions }  = require("firebase-functions/v2");
const { initializeApp }     = require("firebase-admin/app");
const { getFirestore }      = require("firebase-admin/firestore");
const { getMessaging }      = require("firebase-admin/messaging");

/* 🔧 Doit correspondre à l'emplacement de ta base Firestore
   (console Firebase → Firestore → onglet « Données », en haut).
   eur3 → "europe-west1" · nam5 → "us-central1" */
const REGION = "europe-west1";

setGlobalOptions({ region: REGION, maxInstances: 2 });
initializeApp();

const db = getFirestore();

/* Même liste que profiles.js (le serveur ne peut pas charger le fichier du site) */
const USERS = {
  kenzo: { name: "Kenzo", emoji: "✦" },
  nune:  { name: "Nune",  emoji: "🌙" },
};

const other = (u) => (u === "kenzo" ? "nune" : "kenzo");
const who   = (u) => USERS[u] || { name: u, emoji: "💌" };
const short = (t, n = 120) => (t && t.length > n ? t.slice(0, n) + "…" : t || "");

/* Envoie une notification à tous les appareils d'un utilisateur */
async function sendTo(user, { title, body, tag }) {
  const snap = await db.collection("push_tokens").where("user", "==", user).get();
  const tokens = snap.docs.map((d) => d.id);
  if (!tokens.length) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    // Message « data » : le service worker construit la notification
    data: { title, body, tag: tag || "twenty-three" },
    webpush: { headers: { Urgency: "high", TTL: "86400" } },
  });

  // Nettoie les jetons morts (appli désinstallée, permission retirée…)
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error?.code;
    if (code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token") {
      dead.push(db.collection("push_tokens").doc(tokens[i]).delete());
    }
  });
  await Promise.all(dead);
}

exports.onMessage = onDocumentCreated("messages/{id}", async (event) => {
  const m = event.data?.data();
  if (!m?.from) return;
  const u = who(m.from);
  await sendTo(other(m.from), {
    title: `${u.emoji} ${u.name} t'a écrit`,
    body:  short(m.text) || "✦",
    tag:   "msg",
  });
});

exports.onReaction = onDocumentCreated("reactions/{id}", async (event) => {
  const r = event.data?.data();
  if (!r?.from) return;
  const u = who(r.from);
  await sendTo(other(r.from), {
    title: `${u.emoji} ${u.name} a réagi ${r.emoji}`,
    body:  "à ton message",
    tag:   "reaction",
  });
});

exports.onMood = onDocumentCreated("moods/{id}", async (event) => {
  const m = event.data?.data();
  if (!m?.from) return;
  const u = who(m.from);
  await sendTo(other(m.from), {
    title: `${m.emoji} Humeur de ${u.name}`,
    body:  `${u.name} est ${m.label} aujourd'hui`,
    tag:   "mood",
  });
});

exports.onSharedSignal = onDocumentCreated("shared_signals/{id}", async (event) => {
  const s = event.data?.data();
  if (!s?.from) return;
  const u = who(s.from);
  await sendTo(other(s.from), {
    title: `${u.emoji} ${u.name} pense à toi`,
    body:  "Envoie ✦ dans les 5 minutes pour une connexion simultanée 💫",
    tag:   "signal",
  });
});

exports.onPhoto = onDocumentCreated("photos/{id}", async (event) => {
  const p = event.data?.data();
  if (!p?.from) return;
  const u = who(p.from);
  await sendTo(other(p.from), {
    title: `🌸 ${u.name} a ajouté un souvenir`,
    body:  short(p.caption) || "Viens voir la galerie ✦",
    tag:   "photo",
  });
});

exports.onOpenWhenLetter = onDocumentCreated("open_when/{id}", async (event) => {
  const l = event.data?.data();
  if (!l?.from || !l?.to) return;
  const u = who(l.from);
  await sendTo(l.to, {
    title: `💌 ${u.name} t'a laissé une lettre`,
    body:  `À ouvrir quand ${short(l.label, 60)}`,
    tag:   "open-when",
  });
});

/* Prévient l'auteur·e quand sa lettre est ouverte */
exports.onOpenWhenOpened = onDocumentUpdated("open_when/{id}", async (event) => {
  const before = event.data?.before.data();
  const after  = event.data?.after.data();
  if (!after || before?.openedAt || !after.openedAt) return;
  const u = who(after.to);
  await sendTo(after.from, {
    title: `✨ ${u.name} a ouvert ta lettre`,
    body:  `« ouvre quand ${short(after.label, 60)} »`,
    tag:   "open-when",
  });
});

exports.onMoment = onDocumentCreated("moments/{id}", async (event) => {
  const m = event.data?.data();
  if (!m?.from || event.params.id.startsWith("seed-")) return;
  const u = who(m.from);
  await sendTo(other(m.from), {
    title: `🗓 ${u.name} a ajouté une date`,
    body:  short(m.name, 80),
    tag:   "moment",
  });
});

/* Le signal du jour, tous les matins à 10 h (heure de Paris) */
const DAILY = [
  (n) => `Je pense à toi. ✦`,
  (n) => `Un signal t'attend, ${n}. 💫`,
  (n) => `Le 23 se souvient de toi. 🌙`,
  (n) => `Quelqu'un t'envoie de la douceur. 💖`,
  (n) => `Bonne journée ${n}. ✨`,
];

exports.dailySignal = onSchedule(
  { schedule: "0 10 * * *", timeZone: "Europe/Paris" },
  async () => {
    await Promise.all(Object.keys(USERS).map((u) => {
      const pick = DAILY[Math.floor(Math.random() * DAILY.length)];
      return sendTo(u, { title: "Twenty Three 💌", body: pick(USERS[u].name), tag: "daily" });
    }));
  }
);

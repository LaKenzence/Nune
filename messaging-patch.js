/* ════════════════════════════════════════
   messaging-patch.js
   Messagerie temps réel via Firestore
   + réactions, signal partagé, humeur du jour
   + reset identité
════════════════════════════════════════ */

/* Qui est qui : profiles.js (PROFILES, Identity) */
const getCurrentUser = () => Identity.get();
const getOtherUser   = (me) => Identity.other(me);

/* ════════════════════════════════════════
   CHOIX D'IDENTITÉ
   L'onboarding (app.js) choisit le profil ; cet overlay ne sert que
   si l'onboarding est déjà fait mais que le profil a été perdu.
════════════════════════════════════════ */
function initIdentityPicker() {
  if (getCurrentUser()) {
    initMessaging();
    return;
  }
  if (localStorage.getItem('onboarding-done')) {
    document.getElementById('identity-overlay')?.classList.add('active');
  }
  // Sinon l'onboarding appellera _initMessagingAfterOnboarding
}

function chooseIdentity(userId) {
  // Garde un prénom personnalisé déjà saisi (ex. « Ma chérie »)
  const current = localStorage.getItem('user-name');
  const custom = current && !Object.values(PROFILES).some(p => p.name === current) ? current : '';
  Identity.set(userId, custom);
  const overlay = document.getElementById('identity-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s ease';
    setTimeout(() => overlay.classList.remove('active'), 400);
  }
  const p = Identity.profile(userId);
  showToast(`Bienvenue ${p.name} ${p.emoji}`);
  if (typeof renderGreeting === 'function') renderGreeting();
  initMessaging();
}

// Appelé depuis l'onboarding (app.js)
window._initMessagingAfterOnboarding = function() {
  if (getCurrentUser()) initMessaging();
};

/* ════════════════════════════════════════
   RESET IDENTITÉ
════════════════════════════════════════ */
function resetIdentity() {
  if (!confirm('Changer de profil ?')) return;
  Identity.clear();
  localStorage.removeItem('onboarding-done');
  window.location.reload();
}
window.resetIdentity = resetIdentity;

/* ════════════════════════════════════════
   CODE DU COUPLE (voir firestore.rules)
   Chaque appareil, connecté en anonyme, devient membre en donnant
   le code secret une fois. Tant que les règles ne sont pas déployées,
   rien n'est demandé.
════════════════════════════════════════ */

/* Pour les autres modules : lance fn quand la messagerie est prête */
function onNuneReady(fn) {
  if (window._nuneReady) fn();
  else window.addEventListener('nune:ready', fn, { once: true });
}
window.onNuneReady = onNuneReady;

async function ensureMembership() {
  const fb = window._fb;
  const me = getCurrentUser();
  if (!fb?.uid || !me) return; // pas de connexion anonyme → règles ouvertes
  const ref = fb.doc(fb.db, 'members', fb.uid);
  try {
    const snap = await fb.getDoc(ref);
    if (snap.exists() && snap.data().profile === me) return;
  } catch (e) { /* hors ligne : on retentera au prochain lancement */ return; }

  // Déjà membre avec un autre profil, ou code déjà connu sur ce téléphone
  const code = localStorage.getItem('pair-code');
  if (!code) return;
  try {
    await fb.setDoc(ref, { code, profile: me, joinedAt: fb.serverTimestamp() });
  } catch (e) {
    if (e.code === 'permission-denied') localStorage.removeItem('pair-code');
  }
}

/* Toute lecture refusée = ce téléphone n'a pas encore donné le code */
function onFirestoreError(err) {
  if (err?.code === 'permission-denied') showPairingPrompt();
  else console.error('Firestore :', err);
}
window.onFirestoreError = onFirestoreError;

function showPairingPrompt() {
  if (document.getElementById('pairing-prompt')) return;
  const overlay = document.createElement('div');
  overlay.id = 'pairing-prompt';
  overlay.className = 'mood-prompt-overlay pairing-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Code secret du couple');
  overlay.innerHTML = `
    <div class="mood-prompt-card">
      <div class="pairing-lock" aria-hidden="true">🔐</div>
      <div class="mood-prompt-title">Votre code secret</div>
      <div class="pairing-text">Pour que vos messages et vos photos restent à vous deux, entre le code que vous avez choisi.</div>
      <input class="form-input pairing-input" id="pairing-code" type="password"
        autocomplete="off" placeholder="code du couple…" aria-label="Code du couple"
        onkeydown="if(event.key==='Enter')submitPairingCode()">
      <div class="pairing-error" id="pairing-error" role="alert"></div>
      <button class="btn-add pairing-btn" id="pairing-btn" onclick="submitPairingCode()">Entrer ✦</button>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('pairing-code')?.focus(), 300);
}

async function submitPairingCode() {
  const fb = window._fb;
  const input = document.getElementById('pairing-code');
  const errEl = document.getElementById('pairing-error');
  const btn = document.getElementById('pairing-btn');
  const code = input?.value.trim();
  if (!code) return;
  if (!fb?.uid) {
    errEl.textContent = "La connexion anonyme n'est pas activée dans Firebase.";
    return;
  }
  btn.disabled = true;
  errEl.textContent = '';
  try {
    await fb.setDoc(fb.doc(fb.db, 'members', fb.uid), {
      code, profile: getCurrentUser(), joinedAt: fb.serverTimestamp(),
    });
    localStorage.setItem('pair-code', code);
    showToast('Bienvenue chez vous 🔐✨');
    setTimeout(() => location.reload(), 600);
  } catch (e) {
    errEl.textContent = e.code === 'permission-denied' ? 'Code incorrect 🙁' : 'Connexion impossible, réessaie.';
    btn.disabled = false;
    input.select();
    vibrate([40, 30, 40]);
  }
}
window.submitPairingCode = submitPairingCode;

/* ════════════════════════════════════════
   MESSAGING
════════════════════════════════════════ */
let unsubscribeMessages = null;
let swRegistration      = null;
let messagingStarted    = false;

async function initMessaging() {
  if (!window._fb) {
    console.warn('Firebase non chargé');
    return;
  }

  const me = getCurrentUser();
  if (!me) return;

  // Peut être appelé par l'onboarding ET au chargement : une seule fois
  if (messagingStarted) return;
  messagingStarted = true;

  await ensureMembership();

  // Les abonnements d'abord : ils ne doivent pas dépendre du service worker
  subscribeToMessages();
  subscribeToReactions();
  subscribeToSharedSignal();
  subscribeToMood();
  updateInputPlaceholder();
  checkMoodPrompt();

  // Les autres modules (presence.js, open-when.js, moments) démarrent ici
  window._nuneReady = true;
  window.dispatchEvent(new Event('nune:ready'));

  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch (e) {
      console.warn('SW non disponible :', e);
    }
  }

  // La permission est demandée via la bannière (iOS exige un geste utilisateur) ;
  // si elle est déjà accordée on rafraîchit le jeton push de cet appareil
  if ('Notification' in window && Notification.permission === 'granted') registerPush();
}

/* ════════════════════════════════════════
   PUSH (FCM) — les notifications arrivent même appli fermée
   Le jeton de cet appareil est rangé dans push_tokens/{token} ;
   la Cloud Function (functions/index.js) envoie les notifications.
════════════════════════════════════════ */
async function registerPush() {
  const me = getCurrentUser();
  if (!me || !window._fb?.getPushToken) return false;
  try {
    const reg = swRegistration || await navigator.serviceWorker.ready;
    const token = await window._fb.getPushToken(reg);
    if (!token) return false;
    const { db, doc, setDoc, serverTimestamp } = window._fb;
    await setDoc(doc(db, 'push_tokens', token), {
      user: me,
      updatedAt: serverTimestamp(),
    });
    localStorage.setItem('push-enabled', '1');
    return true;
  } catch (e) {
    console.warn('Push indisponible :', e);
    return false;
  }
}
window.registerPush = registerPush;

/* ── Écoute messages ── */
function subscribeToMessages() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy, limitToLast } = window._fb;

  if (unsubscribeMessages) unsubscribeMessages();

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"), limitToLast(50));

  let isFirstLoad = true;
  const seenIds   = new Set();

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const msgId = change.doc.id;
      const data  = change.doc.data();

      if (change.type === "modified") { updateMessageTime(data, msgId); return; }
      if (change.type !== "added") return;

      if (seenIds.has(msgId)) return;
      seenIds.add(msgId);

      renderMessage(data, msgId, !isFirstLoad);

      if (!isFirstLoad && data.from !== getCurrentUser()) {
        notifyNewMessage(data);
        bumpUnread();
      }
    });

    if (isFirstLoad) scrollChatToBottom();
    isFirstLoad = false;

  }, onFirestoreError);
}

/* ════════════════════════════════════════
   RÉACTIONS AUX MESSAGES
════════════════════════════════════════ */
const REACTION_EMOJIS = ['❤️', '😍', '🥺', '✨', '😂', '🫂'];

/* msgId → Set d'emojis, pour réafficher les bonnes réactions quand le message change */
const reactionsByMsg = new Map();

function subscribeToReactions() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy, limitToLast } = window._fb;

  const q = query(collection(db, "reactions"), orderBy("createdAt", "asc"), limitToLast(100));
  let isFirstLoad = true;

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'removed') return;
      const data = change.doc.data();
      const msgId = data.msgId;
      updateReactionDisplay(msgId, data.emoji, data.from);

      // Notif si c'est une réaction à mon message (pas au chargement initial)
      if (!isFirstLoad && change.type === 'added' && data.from !== getCurrentUser()) {
        if (messagesById.get(data.msgId)?.from === getCurrentUser()) {
          const user = Identity.profile(data.from);
          notifyEvent(`${user.emoji} ${user.name} a réagi ${data.emoji} à ton message`);
        }
      }
    });
    isFirstLoad = false;
  }, onFirestoreError);
}

function updateReactionDisplay(msgId, emoji, from) {
  if (!reactionsByMsg.has(msgId)) reactionsByMsg.set(msgId, new Set());
  reactionsByMsg.get(msgId).add(emoji);

  const el = document.querySelector(`[data-msg-id="${msgId}"] .bubble-reactions`);
  if (!el) return;
  const badge = addReactionBadge(el, emoji);
  badge.classList.remove('msg-reaction-pop');
  void badge.offsetWidth;
  badge.classList.add('msg-reaction-pop');
}

function addReactionBadge(el, emoji) {
  let badge = el.querySelector(`[data-emoji="${emoji}"]`);
  if (!badge) {
    badge = document.createElement('span');
    badge.dataset.emoji = emoji;
    badge.className = 'msg-reaction-badge';
    badge.textContent = emoji;
    el.appendChild(badge);
  }
  return badge;
}

function showReactionPicker(msgId) {
  // Ferme l'ancien picker si ouvert
  document.querySelectorAll('.reaction-picker').forEach(p => p.remove());

  const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) return;

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', 'Choisir une réaction');

  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.className = 'reaction-emoji-btn';
    btn.setAttribute('aria-label', `Réagir avec ${emoji}`);
    btn.onclick = (e) => {
      e.stopPropagation();
      sendReaction(msgId, emoji);
      updateReactionDisplay(msgId, emoji, getCurrentUser());
      picker.remove();
    };
    picker.appendChild(btn);
  });

  // Fermer en cliquant ailleurs
  setTimeout(() => {
    document.addEventListener('click', () => picker.remove(), { once: true });
  }, 50);

  msgEl.appendChild(picker);
}

async function sendReaction(msgId, emoji) {
  if (!window._fb) return;
  const me = getCurrentUser();
  const { db, collection, addDoc } = window._fb;
  try {
    await addDoc(collection(db, "reactions"), {
      msgId,
      emoji,
      from: me,
      createdAt: window._fb.serverTimestamp(),
    });
    vibrate([15]);
  } catch (err) {
    console.error('Erreur réaction :', err);
  }
}

/* ════════════════════════════════════════
   SIGNAL PARTAGÉ — "Je pense à toi"
════════════════════════════════════════ */
let sharedSignalUnsubscribe = null;

const SHARED_SIGNAL_WINDOW = 5 * 60 * 1000;
const lastSignalAt = {};   // user → timestamp (ms) de son dernier signal
let lastMatchAt = 0;

function subscribeToSharedSignal() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy, limitToLast } = window._fb;

  const q = query(collection(db, "shared_signals"), orderBy("createdAt", "asc"), limitToLast(20));
  let isFirstLoad = true;

  sharedSignalUnsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return;
      const data = change.doc.data();
      // createdAt est null tant que l'écriture locale n'est pas confirmée
      const at = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
      lastSignalAt[data.from] = at;

      // Au chargement initial on mémorise seulement, sans déclencher de match
      if (!isFirstLoad) checkSharedSignalMatch(data.from, at);
    });
    isFirstLoad = false;
  }, onFirestoreError);
}

async function sendSharedSignal() {
  if (!window._fb) return;
  const me = getCurrentUser();
  if (!me) return;

  const { db, collection, addDoc, serverTimestamp } = window._fb;

  try {
    await addDoc(collection(db, "shared_signals"), {
      from: me,
      createdAt: serverTimestamp(),
    });
    vibrate([20, 10, 20]);
    showToast("Signal envoyé… ✦ En attente de l'autre 💫");

    const btn = document.getElementById('shared-signal-btn');
    if (btn) {
      btn.textContent = '💫';
      btn.disabled = true;
      btn.style.borderColor = 'rgba(240,98,146,0.5)';
      setTimeout(() => {
        btn.textContent = '✦';
        btn.disabled = false;
        btn.style.borderColor = '';
      }, 5 * 60 * 1000);
    }
  } catch (err) {
    console.error('Erreur signal partagé :', err);
  }
}
window.sendSharedSignal = sendSharedSignal;

/* Un nouveau signal vient d'arriver (de moi ou de l'autre) :
   si l'autre personne en a envoyé un dans les 5 min, c'est un match — des deux côtés */
function checkSharedSignalMatch(from, at) {
  const partner = from === 'kenzo' ? 'nune' : 'kenzo';
  const partnerAt = lastSignalAt[partner];
  if (!partnerAt) return;
  if (Math.abs(at - partnerAt) > SHARED_SIGNAL_WINDOW) return;
  // Évite de célébrer deux fois le même match
  if (Date.now() - lastMatchAt < SHARED_SIGNAL_WINDOW) return;
  lastMatchAt = Date.now();
  triggerSharedSignalMatch();
}

function triggerSharedSignalMatch() {
  vibrate([50, 30, 50, 30, 100]);

  // Overlay de match
  const overlay = document.createElement('div');
  overlay.className = 'shared-signal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Signal partagé !');
  overlay.innerHTML = `
    <div class="shared-signal-card">
      <div class="shared-signal-emoji">💫</div>
      <div class="shared-signal-title">Connexion simultanée</div>
      <div class="shared-signal-text">Vous pensiez l'un à l'autre<br>au même moment ✦</div>
      <button class="shared-signal-close" onclick="this.closest('.shared-signal-overlay').remove()">Fermer ✨</button>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  if (typeof spawnConfetti === 'function') spawnConfetti(60);

  // Notif
  notifyEvent('💫 Connexion simultanée ! Vous pensiez l\'un à l\'autre au même moment ✦');
}

/* ════════════════════════════════════════
   HUMEUR DU JOUR
════════════════════════════════════════ */
const MOODS = [
  { emoji: '🌟', label: { nune: 'Rayonnante', kenzo: 'Rayonnant' } },
  { emoji: '😴', label: { nune: 'Fatiguée',   kenzo: 'Fatigué' } },
  { emoji: '🥰', label: { nune: 'Amoureuse',  kenzo: 'Amoureux' } },
  { emoji: '😤', label: { nune: 'Énervée',    kenzo: 'Énervé' } },
  { emoji: '🌧️', label: { nune: 'Mélancolique', kenzo: 'Mélancolique' } },
  { emoji: '✨', label: { nune: 'Bien',       kenzo: 'Bien' } },
];

function subscribeToMood() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy, limitToLast } = window._fb;

  const q = query(collection(db, "moods"), orderBy("createdAt", "asc"), limitToLast(10));
  let isFirstLoad = true;

  onSnapshot(q, (snapshot) => {
    const me = getCurrentUser();
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return;
      const data = change.doc.data();
      if (data.from === me) return;

      // Ordre chronologique → la dernière humeur de l'autre gagne
      renderOtherMood(data);
      if (!isFirstLoad) {
        const user = Identity.profile(data.from);
        notifyEvent(`${user.emoji} ${user.name} est ${data.label} ${data.emoji} aujourd'hui`);
      }
    });
    isFirstLoad = false;
  }, onFirestoreError);
}

/* L'humeur de l'autre s'affiche sous son nom, dans l'en-tête du chat */
function renderOtherMood(data) {
  const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
  const isToday = date.toDateString() === new Date().toDateString();
  const when = isToday
    ? "aujourd'hui"
    : `le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;

  const avatar = document.getElementById('msg-screen-avatar');
  if (!avatar) return;
  let badge = document.getElementById('avatar-mood');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'avatar-mood';
    badge.className = 'avatar-mood';
    avatar.appendChild(badge);
  }
  const who = Identity.profile(data.from).name;
  const text = `${who} ${isToday ? 'est' : 'était'} ${(data.label || '').toLowerCase()} ${when}`;
  badge.textContent = data.emoji;
  badge.title = text;
  avatar.onclick = () => showToast(`${data.emoji} ${text}`);
  avatar.setAttribute('aria-label', text);
}

function checkMoodPrompt() {
  const today = new Date().toDateString();
  const lastMood = localStorage.getItem('my-mood-date');
  if (lastMood === today) return;

  // Affiche la popup d'humeur après 2s
  setTimeout(() => showMoodPrompt(), 2000);
}

function showMoodPrompt() {
  // Ne pas afficher si déjà visible
  if (document.getElementById('mood-prompt')) return;

  const overlay = document.createElement('div');
  overlay.id = 'mood-prompt';
  overlay.className = 'mood-prompt-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Ton humeur du jour');

  const me = getCurrentUser();
  const user = me ? Identity.profile(me) : null;

  overlay.innerHTML = `
    <div class="mood-prompt-card">
      <div class="mood-prompt-title">Comment tu vas aujourd'hui ?</div>
      <div class="mood-prompt-sub">${user ? user.name : ''} ${user ? user.emoji : ''}</div>
      <div class="mood-grid">
        ${MOODS.map(m => {
          const label = m.label[me] || m.label.nune;
          return `
          <button class="mood-option" onclick="submitMood('${m.emoji}', '${label}')" aria-label="${label}">
            <span class="mood-opt-emoji">${m.emoji}</span>
            <span class="mood-opt-label">${label}</span>
          </button>
        `;
        }).join('')}
      </div>
      <button class="mood-skip" onclick="document.getElementById('mood-prompt').remove()">Plus tard</button>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
window.showMoodPrompt = showMoodPrompt;

async function submitMood(emoji, label) {
  const overlay = document.getElementById('mood-prompt');
  if (overlay) overlay.remove();

  if (!window._fb) return;
  const me = getCurrentUser();
  if (!me) return;

  const { db, collection, addDoc, serverTimestamp } = window._fb;
  try {
    await addDoc(collection(db, "moods"), {
      from: me,
      emoji,
      label,
      createdAt: serverTimestamp(),
    });
    localStorage.setItem('my-mood-date', new Date().toDateString());
    showToast(`Humeur partagée ${emoji}`);
    vibrate([15]);
  } catch (err) {
    console.error('Erreur humeur :', err);
  }
}
window.submitMood = submitMood;

/* ════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════ */
function notifyNewMessage(data) {
  const user  = Identity.profile(data.from);
  const me    = getCurrentUser();
  const other = me ? Identity.profile(me) : null;

  const intros = [
    `${user.emoji} un mot de ${user.name}`,
    `${user.emoji} ${user.name} pense à toi`,
    `${user.emoji} nouveau signal de ${user.name}`,
    `${user.emoji} ${user.name} t'a écrit`,
  ];
  const title = intros[Math.floor(Math.random() * intros.length)];
  const body  = data.text
    ? (data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text)
    : '✦';

  vibrate([30, 20, 30]);

  if (document.visibilityState === 'visible') {
    showToast(`${user.emoji} ${user.name} : ${body}`);
    return;
  }

  // Le serveur envoie déjà la notification push → pas de doublon
  if (localStorage.getItem('push-enabled')) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notifOptions = {
    body,
    tag:      'twenty-three-msg',
    renotify: true,
    silent:   false,
  };

  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
  } else if (swRegistration) {
    swRegistration.showNotification(title, notifOptions);
  }
}

function notifyEvent(message) {
  vibrate([20, 10, 20]);

  if (document.visibilityState === 'visible') {
    showToast(message);
    return;
  }

  if (localStorage.getItem('push-enabled')) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = 'Twenty Three ✦';
  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body: message });
  }
}

/* ════════════════════════════════════════
   ENVOI D'UN MESSAGE
════════════════════════════════════════ */
function getActiveInput() {
  return document.getElementById('chat-input');
}

async function sendChatMessage() {
  const me    = getCurrentUser();
  const input = getActiveInput();
  const text  = input?.value.trim();
  if (!text) return;

  input.value = "";
  vibrate([15]);

  if (!window._fb) return;

  try {
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    await addDoc(collection(db, "messages"), {
      from:      me,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Erreur envoi :', err);
    showToast("Erreur d'envoi 🙁");
    if (input) input.value = text;
  }
}

/* ════════════════════════════════════════
   RENDU DES MESSAGES — fil de conversation
════════════════════════════════════════ */
const messagesById = new Map();   // msgId → data
let lastRendered   = null;        // { from, at, dayKey } du dernier message affiché
let unreadCount    = 0;

function msgDate(data) {
  return data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
}

function formatTime(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

function scrollChatToBottom(smooth = false) {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;
  thread.scrollTo({ top: thread.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function renderMessage(data, msgId, animate = false) {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;
  messagesById.set(msgId, data);
  document.getElementById('msg-empty-state')?.remove();

  const me   = getCurrentUser();
  const isMe = data.from === me;
  const date = msgDate(data);
  const dayKey = date.toDateString();
  const stick = isNearBottom(thread);

  // Séparateur de jour
  if (!lastRendered || lastRendered.dayKey !== dayKey) {
    const sep = document.createElement('div');
    sep.className = 'chat-day';
    sep.textContent = formatDay(date);
    thread.appendChild(sep);
  }

  // Messages rapprochés du même auteur → regroupés
  const grouped = lastRendered && lastRendered.from === data.from &&
    lastRendered.dayKey === dayKey && (date - lastRendered.at) < 3 * 60 * 1000;
  if (grouped) thread.lastElementChild?.classList.add('has-next');

  const row = document.createElement('div');
  row.className = `bubble-row ${isMe ? 'me' : 'them'}${grouped ? ' grouped' : ''}${animate ? ' pop' : ''}`;
  row.dataset.msgId = msgId;
  // Pas d'espace entre les balises : la bulle est en white-space: pre-wrap
  row.innerHTML =
    `<div class="bubble"><span class="bubble-text"></span>` +
    `<span class="bubble-time">${data.createdAt ? formatTime(date) : '•••'}</span></div>` +
    `<div class="bubble-reactions"></div>`;
  row.querySelector('.bubble-text').textContent = data.text || '';
  row.querySelector('.bubble').addEventListener('click', (e) => {
    e.stopPropagation();
    showReactionPicker(msgId);
  });
  thread.appendChild(row);
  renderMsgReactions(msgId);

  lastRendered = { from: data.from, at: date, dayKey };
  if (isMe || stick) scrollChatToBottom(animate);
  window.dispatchEvent(new CustomEvent('nune:message', { detail: { msgId, data } }));
}

/* L'heure arrive quand le serveur confirme l'envoi */
function updateMessageTime(data, msgId) {
  messagesById.set(msgId, data);
  const timeEl = document.querySelector(`[data-msg-id="${msgId}"] .bubble-time`);
  if (timeEl && data.createdAt) timeEl.textContent = formatTime(msgDate(data));
  window.dispatchEvent(new CustomEvent('nune:message', { detail: { msgId, data } }));
}

function renderMsgReactions(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .bubble-reactions`);
  if (!el) return;
  el.innerHTML = '';
  (reactionsByMsg.get(msgId) || []).forEach(emoji => addReactionBadge(el, emoji));
}

/* Pastille de messages non lus sur l'onglet */
function bumpUnread() {
  if (typeof currentTabIndex !== 'undefined' && currentTabIndex === 1) return;
  unreadCount++;
  const tab = document.getElementById('tab-chat');
  if (!tab) return;
  let dot = tab.querySelector('.tab-badge');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'tab-badge';
    tab.appendChild(dot);
  }
  dot.textContent = unreadCount > 9 ? '9+' : unreadCount;
}

function clearUnread() {
  unreadCount = 0;
  document.querySelector('#tab-chat .tab-badge')?.remove();
}

/* Appelé par switchTab('chat') */
window.onChatOpened = function() {
  clearUnread();
  requestAnimationFrame(() => scrollChatToBottom());
  window.dispatchEvent(new Event('nune:chat-opened'));
};

function updateInputPlaceholder() {
  const me    = getCurrentUser();
  const other = me ? Identity.profile(getOtherUser(me)) : null;
  if (!other) return;
  const input = document.getElementById('chat-input');
  if (input) input.placeholder = `écris à ${other.name}…`;
  updateChatHeader();
}

function updateChatHeader() {
  const me    = getCurrentUser();
  const other = me ? Identity.profile(getOtherUser(me)) : null;
  if (!other) return;
  const nameEl   = document.getElementById('msg-screen-name');
  const avatarEl = document.getElementById('msg-screen-avatar');
  if (nameEl)   nameEl.textContent   = other.name;
  if (avatarEl) avatarEl.textContent = other.emoji;
}

function onThinkBtnClick() {
  sendSharedSignal();
}
window.onThinkBtnClick = onThinkBtnClick;

/* ════════════════════════════════════════
   OVERRIDE DE send()
════════════════════════════════════════ */
window.send = function() {
  const me = getCurrentUser();
  if (!me) {
    const overlay = document.getElementById('identity-overlay');
    if (overlay) overlay.classList.add('active');
    return;
  }
  sendChatMessage();
};

/* ════════════════════════════════════════
   INIT — attend que Firebase soit prêt
════════════════════════════════════════ */
function waitForFirebase(callback, tries = 0) {
  if (window._fb) {
    callback();
  } else if (tries < 150) {
    setTimeout(() => waitForFirebase(callback, tries + 1), 100);
  } else {
    console.warn('Firebase non disponible après 15 s');
  }
}

waitForFirebase(() => {
  initIdentityPicker();
});

/* ════════════════════════════════════════
   messaging-patch.js
   Messagerie temps réel via Firestore
   + réactions, signal partagé, humeur du jour
   + reset identité
════════════════════════════════════════ */

const USERS = {
  kenzo: { name: "Kenzo", emoji: "✦",  color: "#f06292" },
  nune:  { name: "Nune",  emoji: "🌙", color: "#ce93d8" },
};

console.log('patch chargé, _fb =', window._fb);

/* ── Fix clé localStorage : supporte user-name ET chat-identity ── */
function getCurrentUser() {
  const v = localStorage.getItem('chat-identity') || localStorage.getItem('user-name');
  return v ? v.toLowerCase() : null;
}

function getOtherUser(me) {
  return me === 'kenzo' ? 'nune' : 'kenzo';
}

/* ════════════════════════════════════════
   CHOIX D'IDENTITÉ
════════════════════════════════════════ */
function initIdentityPicker() {
  if (getCurrentUser()) {
    initMessaging();
    return;
  }
  // Onboarding pas encore terminé → il gérera l'identité
  // On attend sans afficher l'overlay
  const waitForIdentity = setInterval(() => {
    if (getCurrentUser()) {
      clearInterval(waitForIdentity);
      initMessaging();
    }
  }, 300);
  // Fallback : si onboarding déjà fait mais identité perdue → overlay legacy
  if (localStorage.getItem('onboarding-done')) {
    clearInterval(waitForIdentity);
    const overlay = document.getElementById('identity-overlay');
    if (overlay) overlay.classList.add('active');
  }
}

function chooseIdentity(userId) {
  localStorage.setItem('chat-identity', userId);
  localStorage.setItem('user-name', userId.charAt(0).toUpperCase() + userId.slice(1));
  const overlay = document.getElementById('identity-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s ease';
    setTimeout(() => overlay.classList.remove('active'), 400);
  }
  showToast(`Bienvenue ${USERS[userId].name} ${USERS[userId].emoji}`);
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
  localStorage.removeItem('chat-identity');
  localStorage.removeItem('user-name');
  localStorage.removeItem('onboarding-done');
  window.location.reload();
}
window.resetIdentity = resetIdentity;

/* ════════════════════════════════════════
   MESSAGING
════════════════════════════════════════ */
let unsubscribeMessages = null;
let swRegistration      = null;

async function initMessaging() {
  if (!window._fb) {
    console.warn('Firebase non chargé');
    return;
  }

  const me = getCurrentUser();
  if (!me) return;

  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.ready;
      if (swRegistration.active) {
        swRegistration.active.postMessage({ type: 'INIT_IDENTITY', identity: me });
      }
    } catch (e) {
      console.warn('SW non disponible :', e);
    }
  }

  await requestNotificationPermission();
  subscribeToMessages();
  subscribeToReactions();
  subscribeToSharedSignal();
  subscribeToMood();
  updateInputPlaceholder();
  checkMoodPrompt();
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showToast("Notifications activées 💌");
      if (swRegistration?.active) {
        swRegistration.active.postMessage({
          type: 'INIT_IDENTITY',
          identity: getCurrentUser()
        });
      }
    }
  }
}

/* ── Écoute messages ── */
function subscribeToMessages() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy } = window._fb;

  if (unsubscribeMessages) unsubscribeMessages();

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

  let isFirstLoad = true;
  const seenIds   = new Set();

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;

      const msgId = change.doc.id;
      const data  = change.doc.data();

      if (seenIds.has(msgId)) return;
      seenIds.add(msgId);

      renderMessage(data, msgId);

      if (!isFirstLoad && data.from !== getCurrentUser()) {
        notifyNewMessage(data);
      }
    });

    isFirstLoad = false;
    scrollChatToBottom();

  }, (err) => console.error('Firestore error :', err));
}

/* ════════════════════════════════════════
   RÉACTIONS AUX MESSAGES
════════════════════════════════════════ */
const REACTION_EMOJIS = ['❤️', '😍', '🥺', '✨', '😂', '🫂'];

function subscribeToReactions() {
  if (!window._fb) return;
  const { db, collection, onSnapshot } = window._fb;

  onSnapshot(collection(db, "reactions"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const msgId = data.msgId;
      updateReactionDisplay(msgId, data.emoji, data.from);

      // Notif si c'est une réaction à mon message
      if (change.type === 'added' && data.from !== getCurrentUser()) {
        if (_lastMyMsg && _lastMyMsg.msgId === data.msgId) {
          const user = USERS[data.from] || { name: data.from, emoji: '💌' };
          notifyEvent(`${user.emoji} ${user.name} a réagi ${data.emoji} à ton message`);
        }
      }
    });
  });
}

function updateReactionDisplay(msgId, emoji, from) {
  // Nouveau layout : on affiche sur la carte si c'est le message courant
  const card = document.getElementById('msg-card');
  if (!card || card.dataset.msgId !== msgId) return;

  const el = document.getElementById('msg-reactions');
  if (!el) return;

  let badge = el.querySelector(`[data-emoji="${emoji}"]`);
  if (!badge) {
    badge = document.createElement('span');
    badge.dataset.emoji = emoji;
    badge.className = 'msg-reaction-badge';
    el.appendChild(badge);
  }
  badge.textContent = emoji;
  badge.classList.remove('msg-reaction-pop');
  void badge.offsetWidth;
  badge.classList.add('msg-reaction-pop');
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
    btn.onclick = () => {
      sendReaction(msgId, emoji);
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

function subscribeToSharedSignal() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy } = window._fb;

  const q = query(collection(db, "shared_signals"), orderBy("createdAt", "desc"));

  sharedSignalUnsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return;
      const data = change.doc.data();
      const me = getCurrentUser();

      // L'autre vient d'envoyer un signal → vérifie si on a aussi envoyé récemment
      if (data.from !== me) {
        checkSharedSignalMatch(data);
      }
    });
  });
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

async function checkSharedSignalMatch(otherSignal) {
  if (!window._fb) return;
  const me = getCurrentUser();
  const { db, collection, query, orderBy } = window._fb;
  // Vérifie si j'ai envoyé un signal dans les 5 dernières minutes
  // On lit les derniers signaux de l'utilisateur courant
  // Simple check : si le timestamp de l'autre est proche du dernier "envoyé" stocké localement
  const myLastSignal = localStorage.getItem('my-last-shared-signal');
  if (!myLastSignal) return;

  const diff = Date.now() - parseInt(myLastSignal);
  if (diff < 5 * 60 * 1000) {
    // MATCH !
    triggerSharedSignalMatch();
  }
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
  document.body.appendChild(overlay);
  if (typeof spawnConfetti === 'function') spawnConfetti(60);

  // Notif
  notifyEvent('💫 Connexion simultanée ! Vous pensiez l\'un à l\'autre au même moment ✦');
}

/* ════════════════════════════════════════
   HUMEUR DU JOUR
════════════════════════════════════════ */
const MOODS = [
  { emoji: '🌟', label: 'Rayonnante' },
  { emoji: '😴', label: 'Fatiguée' },
  { emoji: '🥰', label: 'Amoureuse' },
  { emoji: '😤', label: 'Énervée' },
  { emoji: '🌧️', label: 'Mélancolique' },
  { emoji: '✨', label: 'Bien' },
];

function subscribeToMood() {
  if (!window._fb) return;
  const { db, collection, onSnapshot } = window._fb;

  onSnapshot(collection(db, "moods"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const me = getCurrentUser();

      if (data.from !== me) {
        // Humeur de l'autre → l'afficher dans l'UI
        renderOtherMood(data);
        if (change.type === 'added') {
          const user = USERS[data.from] || { name: data.from, emoji: '💌' };
          notifyEvent(`${user.emoji} ${user.name} est ${data.label} ${data.emoji} aujourd'hui`);
        }
      }
    });
  });
}

function renderOtherMood(data) {
  const user = USERS[data.from] || { name: data.from, emoji: '💌' };
  let el = document.getElementById('other-mood-display');
  if (!el) {
    el = document.createElement('div');
    el.id = 'other-mood-display';
    el.className = 'other-mood-display';
    const area = getChatContainer();
    if (area) area.insertBefore(el, area.firstChild);
  }
  el.innerHTML = `<span class="other-mood-emoji">${data.emoji}</span><span>${user.name} est <strong>${data.label}</strong> aujourd'hui</span>`;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'fadeSlideIn 0.4s ease';
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
  const user = me ? USERS[me] : null;

  overlay.innerHTML = `
    <div class="mood-prompt-card">
      <div class="mood-prompt-title">Comment tu vas aujourd'hui ?</div>
      <div class="mood-prompt-sub">${user ? user.name : ''} ${user ? user.emoji : ''}</div>
      <div class="mood-grid">
        ${MOODS.map(m => `
          <button class="mood-option" onclick="submitMood('${m.emoji}', '${m.label}')" aria-label="${m.label}">
            <span class="mood-opt-emoji">${m.emoji}</span>
            <span class="mood-opt-label">${m.label}</span>
          </button>
        `).join('')}
      </div>
      <button class="mood-skip" onclick="document.getElementById('mood-prompt').remove()">Plus tard</button>
    </div>
  `;
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
  const user  = USERS[data.from] || { name: data.from, emoji: '💌' };
  const me    = getCurrentUser();
  const other = me ? USERS[me] : null;

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

  if (Notification.permission !== 'granted') return;

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

  if (Notification.permission !== 'granted') return;
  const title = 'Twenty Three ✦';
  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body: message });
  }
}

/* ════════════════════════════════════════
   ENVOI D'UN MESSAGE
════════════════════════════════════════ */
function getActiveInput() {
  // Retourne l'input visible : onglet chat en priorité
  const chatInput = document.getElementById('chat-input');
  if (chatInput && chatInput.offsetParent !== null) return chatInput;
  return document.getElementById('input');
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
   RENDU DES MESSAGES
════════════════════════════════════════ */
function getChatContainer() {
  return document.getElementById('chat-messages-area');
}

function scrollChatToBottom() { /* no-op */ }

/* ── État local des derniers messages ── */
let _lastTheirMsg  = null; // { data, msgId }
let _lastMyMsg     = null;

function renderMessage(data, msgId) {
  const me   = getCurrentUser();
  const isMe = data.from === me;

  if (isMe) {
    _lastMyMsg = { data, msgId };
    renderMyLast();
  } else {
    _lastTheirMsg = { data, msgId };
    renderTheirLast();
  }
}

function renderTheirLast() {
  if (!_lastTheirMsg) return;
  const { data, msgId } = _lastTheirMsg;
  const user = USERS[data.from] || { name: data.from, emoji: '💌' };
  const time = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const empty = document.getElementById('msg-empty-state');
  const card  = document.getElementById('msg-card');
  if (empty) empty.style.display = 'none';
  if (card)  card.style.display  = '';

  const fromEl = document.getElementById('msg-card-from');
  const textEl = document.getElementById('msg-card-text');
  const timeEl = document.getElementById('msg-card-time');
  if (fromEl) fromEl.textContent = `${user.emoji} ${user.name}`;
  if (textEl) textEl.textContent = data.text || '';
  if (timeEl) timeEl.textContent = time;

  card.dataset.msgId = msgId;
  renderMsgReactions(msgId);
}

function renderMyLast() {
  if (!_lastMyMsg) return;
  const { data } = _lastMyMsg;
  const time = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const wrap   = document.getElementById('msg-my-last');
  const textEl = document.getElementById('msg-my-text');
  const timeEl = document.getElementById('msg-my-time');
  if (wrap)   wrap.style.display   = '';
  if (textEl) textEl.textContent   = data.text || '';
  if (timeEl) timeEl.textContent   = time;
}

function renderMsgReactions(msgId) {
  const el = document.getElementById('msg-reactions');
  if (!el) return;
  // les réactions existantes seront mises à jour via listenReactions
}

function toggleMsgReactPicker() {
  const picker = document.getElementById('msg-react-picker');
  if (!picker) return;
  picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
}
window.toggleMsgReactPicker = toggleMsgReactPicker;

function pickMsgReaction(emoji) {
  const card = document.getElementById('msg-card');
  if (!card?.dataset.msgId) return;
  sendReaction(card.dataset.msgId, emoji);
  const picker = document.getElementById('msg-react-picker');
  if (picker) picker.style.display = 'none';
  // Feedback visuel immédiat
  const el = document.getElementById('msg-reactions');
  if (el) {
    let span = el.querySelector(`[data-emoji="${emoji}"]`);
    if (!span) {
      span = document.createElement('span');
      span.dataset.emoji = emoji;
      span.className = 'msg-reaction-badge';
      el.appendChild(span);
    }
    span.textContent = emoji;
    span.classList.add('msg-reaction-pop');
    setTimeout(() => span.classList.remove('msg-reaction-pop'), 400);
  }
}
window.pickMsgReaction = pickMsgReaction;

function updateInputPlaceholder() {
  const me    = getCurrentUser();
  const other = me ? USERS[getOtherUser(me)] : null;
  if (!other) return;
  const input = document.getElementById('chat-input');
  if (input) input.placeholder = `écris à ${other.name}…`;
  updateChatHeader();
}

function updateChatHeader() {
  const me    = getCurrentUser();
  const other = me ? USERS[getOtherUser(me)] : null;
  if (!other) return;
  const nameEl   = document.getElementById('msg-screen-name');
  const avatarEl = document.getElementById('msg-screen-avatar');
  if (nameEl)   nameEl.textContent   = other.name;
  if (avatarEl) avatarEl.textContent = other.emoji;
}

function onThinkBtnClick() {
  localStorage.setItem('my-last-shared-signal', Date.now().toString());
  sendSharedSignal();
}
window.onThinkBtnClick = onThinkBtnClick;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
    console.log('_fb trouvé après', tries * 100, 'ms');
    callback();
  } else if (tries < 30) {
    setTimeout(() => waitForFirebase(callback, tries + 1), 100);
  } else {
    console.warn('Firebase non disponible après 3s');
  }
}

waitForFirebase(() => {
  initIdentityPicker();
});

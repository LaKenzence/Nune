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
  const overlay = document.getElementById('identity-overlay');
  if (overlay) overlay.classList.add('active');
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
        const me = getCurrentUser();
        const myMsg = document.querySelector(`[data-msg-id="${msgId}"].chat-msg--me`);
        if (myMsg) {
          const user = USERS[data.from] || { name: data.from, emoji: '💌' };
          notifyEvent(`${user.emoji} ${user.name} a réagi ${data.emoji} à ton message`);
        }
      }
    });
  });
}

function updateReactionDisplay(msgId, emoji, from) {
  const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) return;

  let reactionEl = msgEl.querySelector('.chat-reaction');
  if (!reactionEl) {
    reactionEl = document.createElement('div');
    reactionEl.className = 'chat-reaction';
    msgEl.querySelector('.chat-bubble').appendChild(reactionEl);
  }
  reactionEl.textContent = emoji;
  reactionEl.style.animation = 'none';
  void reactionEl.offsetWidth;
  reactionEl.style.animation = 'reactionPop 0.4s ease';
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

    // Bouton feedback
    const btn = document.getElementById('shared-signal-btn');
    if (btn) {
      btn.textContent = '💫 Signal envoyé…';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✦ Je pense à toi';
        btn.disabled = false;
      }, 5 * 60 * 1000); // réactivé après 5min
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
    const area = document.getElementById('chat-messages');
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
  const user  = USERS[data.from] || { name: data.from, emoji: "💌" };
  const title = `${user.emoji} ${user.name} t'a écrit 💌`;
  const body  = data.text
    ? (data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text)
    : '';

  vibrate([30, 20, 30]);

  if (document.visibilityState === 'visible') {
    showToast(`${user.emoji} ${user.name} : ${body}`);
    return;
  }

  if (Notification.permission !== 'granted') return;

  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
  } else if (swRegistration) {
    swRegistration.showNotification(title, {
      body,
      tag:      'twenty-three-msg',
      renotify: true,
    });
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
async function sendChatMessage() {
  const me    = getCurrentUser();
  const input = document.getElementById('input');
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
function renderMessage(data, msgId) {
  const me       = getCurrentUser();
  const isMe     = data.from === me;
  const user     = USERS[data.from] || { name: data.from };
  const chatList = document.getElementById('chat-messages');
  if (!chatList) return;
  if (document.querySelector(`[data-msg-id="${msgId}"]`)) return;

  const time = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const div = document.createElement('div');
  div.className   = `chat-msg ${isMe ? 'chat-msg--me' : 'chat-msg--them'}`;
  div.dataset.msgId = msgId;
  div.setAttribute('role', 'article');
  div.setAttribute('aria-label', `${user.name} : ${data.text}`);
  div.innerHTML = `
    <div class="chat-bubble">
      <span class="chat-bubble-text">${escapeHtml(data.text)}</span>
      <span class="chat-bubble-time" aria-hidden="true">${time}</span>
    </div>
  `;

  // Long press → réactions
  let pressTimer;
  div.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => showReactionPicker(msgId), 500);
  }, { passive: true });
  div.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
  div.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });
  // Clic droit sur desktop
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showReactionPicker(msgId);
  });

  chatList.appendChild(div);
}

function scrollChatToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function updateInputPlaceholder() {
  const me    = getCurrentUser();
  const other = me ? USERS[getOtherUser(me)] : null;
  const input = document.getElementById('input');
  if (input && other) {
    input.placeholder = `Écris à ${other.name}…`;
    input.setAttribute('aria-label', `Message pour ${other.name}`);
  }
  updateChatHeader();
}

function updateChatHeader() {
  const me    = getCurrentUser();
  const other = me ? USERS[getOtherUser(me)] : null;
  if (!other) return;
  const nameEl   = document.getElementById('chat-header-name');
  const avatarEl = document.getElementById('chat-header-avatar');
  if (nameEl)   nameEl.textContent  = other.name;
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

/* ════════════════════════════════════════
   IDENTITÉ UTILISATEUR
════════════════════════════════════════ */
const USERS = {
  kenzo: { name: "Kenzo", emoji: "✦", color: "#f06292" },
  nune:  { name: "Nune",  emoji: "🌙", color: "#ce93d8" },
};
console.log('patch chargé, _fb =', window._fb);
function getCurrentUser() {
  return localStorage.getItem('chat-identity') || null;
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
   MESSAGING
   Firestore pour les messages (temps réel)
   Service Worker pour les notifications
════════════════════════════════════════ */
let unsubscribeMessages = null;
let swRegistration = null;

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
    } catch (e) {
      console.warn('SW non disponible :', e);
    }
  }

  await requestNotificationPermission();
  subscribeToMessages();
  updateInputPlaceholder();
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') showToast("Notifications activées 💌");
  }
}

/* ── Écoute Firestore en temps réel ── */
function subscribeToMessages() {
  if (!window._fb) return;
  const { db, collection, onSnapshot, query, orderBy } = window._fb;

  if (unsubscribeMessages) unsubscribeMessages();

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

  let isFirstLoad = true;
  const seenIds = new Set();

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

/* ── Notification via Service Worker (sans serveur) ── */
function notifyNewMessage(data) {
  const user  = USERS[data.from] || { name: data.from, emoji: "💌" };
  const title = `${user.emoji} ${user.name}`;
  const body  = data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text;

  vibrate([30, 20, 30]);

  // App en foreground → toast suffit
  if (document.visibilityState === 'visible') {
    showToast(`${title} : ${body}`);
    return;
  }

  // App en background → notification système
  if (Notification.permission !== 'granted') return;

  if (swRegistration) {
    swRegistration.showNotification(`${title} t'a écrit 💌`, {
      body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: 'twenty-three-msg',
      renotify: true,
    });
  } else {
    new Notification(`${title} t'a écrit 💌`, { body, icon: '/logo.svg' });
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

  console.log('envoi message...', { me, text, fb: window._fb });
   
  input.value = "";
  vibrate([15]);

  if (!window._fb) return;

  try {
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    await addDoc(collection(db, "messages"), {
      from: me,
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
  const me      = getCurrentUser();
  const isMe    = data.from === me;
  const user    = USERS[data.from] || { name: data.from };
  const chatList = document.getElementById('chat-messages');
  if (!chatList) return;
  if (document.querySelector(`[data-msg-id="${msgId}"]`)) return;

  const time = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const div = document.createElement('div');
  div.className = `chat-msg ${isMe ? 'chat-msg--me' : 'chat-msg--them'}`;
  div.dataset.msgId = msgId;
  div.setAttribute('role', 'article');
  div.setAttribute('aria-label', `${user.name} : ${data.text}`);
  div.innerHTML = `
    <div class="chat-bubble">
      <span class="chat-bubble-text">${escapeHtml(data.text)}</span>
      <span class="chat-bubble-time" aria-hidden="true">${time}</span>
    </div>
  `;
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
    input.placeholder = `Envoie quelque chose à ${other.name}…`;
    input.setAttribute('aria-label', `Message pour ${other.name}`);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
   INIT
════════════════════════════════════════ */
function waitForFirebase(callback, tries = 0) {
  if (window._fb) {
    console.log('_fb trouvé après', tries * 100, 'ms');
    callback();
  } else if (tries < 20) {
    setTimeout(() => waitForFirebase(callback, tries + 1), 100);
  } else {
    console.warn('Firebase non disponible après 2s');
  }
}

waitForFirebase(() => {
  initIdentityPicker();
});

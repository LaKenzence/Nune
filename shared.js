/* ══════════════════════════════════════════
   shared.js — petits outils communs aux modules
   (question.js, together.js, memories.js, play.js, voice.js, extras.js)
   Chargé après messaging-patch.js.
   ══════════════════════════════════════════ */
const Nune = {
  /* "2026-11-03" en heure locale */
  dayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /* Numéro de jour stable pour tirer « la question du jour » identique sur les deux téléphones */
  dayNumber(d = new Date()) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  },

  /* Semaine ISO : "2026-W45" */
  weekKey(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  },

  toDate(ts) {
    return ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
  },

  fmtDate(ts, opts = { day: 'numeric', month: 'long' }) {
    const d = Nune.toDate(ts);
    return d ? d.toLocaleDateString('fr-FR', opts) : '';
  },

  fmtTime(ts) {
    const d = Nune.toDate(ts);
    return d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  },

  me()        { return Identity.get(); },
  other()     { return Identity.other(); },
  otherName() { return Identity.profile(Identity.other()).name; },
  nameOf(id)  { return Identity.profile(id).name; },

  isOpen(screen) {
    return !!document.getElementById('screen-' + screen)?.classList.contains('slide-in');
  },

  /* Écoute une collection triée par date.
     cb(docs, changes, isFirstLoad) — changes = docChanges() du snapshot */
  live(name, cb, { order = 'createdAt', last = 300 } = {}) {
    const { db, collection, onSnapshot, query, orderBy, limitToLast } = window._fb;
    let first = true;
    return onSnapshot(
      query(collection(db, name), orderBy(order, 'asc'), limitToLast(last)),
      (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() })), snap.docChanges(), first);
        first = false;
      },
      (err) => window.onFirestoreError && window.onFirestoreError(err)
    );
  },

  /* Ajoute un document signé (from + createdAt) */
  add(name, data) {
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    return addDoc(collection(db, name), { ...data, from: Nune.me(), createdAt: serverTimestamp() });
  },

  /* Écrit un document à identifiant connu (from + createdAt ajoutés) */
  put(name, id, data) {
    const { db, doc, setDoc, serverTimestamp } = window._fb;
    return setDoc(doc(db, name, id), { ...data, from: Nune.me(), createdAt: serverTimestamp() });
  },

  remove(name, id) {
    const { db, doc, deleteDoc } = window._fb;
    return deleteDoc(doc(db, name, id));
  },

  /* Prévient de quelque chose qui vient de l'autre (toast si l'appli est ouverte) */
  notify(message) {
    if (typeof notifyEvent === 'function') notifyEvent(message);
    else showToast(message);
  },

  /* Puces de l'accueil (question du jour, distance, souvenir du jour…).
     chip(key, { icon, text, order, hot, onClick }) — null pour retirer */
  _chips: {},
  chip(key, opts) {
    if (opts) Nune._chips[key] = opts; else delete Nune._chips[key];
    const el = document.getElementById('home-chips');
    if (!el) return;
    const list = Object.entries(Nune._chips).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    el.innerHTML = list.map(([k, c]) => `
      <button class="home-chip${c.hot ? ' hot' : ''}" data-chip="${k}">
        <span class="home-chip-icon" aria-hidden="true">${c.icon}</span>${escapeHtml(c.text)}
      </button>`).join('');
    el.querySelectorAll('.home-chip').forEach(b => {
      b.onclick = () => Nune._chips[b.dataset.chip]?.onClick?.();
    });
  },

  /* Une pluie de petits emojis qui s'envolent (bisous, cœurs…) */
  burst(emojis = ['💋', '❤️', '💕'], count = 18) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const p = document.createElement('div');
        p.className = 'float-heart';
        p.setAttribute('aria-hidden', 'true');
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = (10 + Math.random() * 80) + 'vw';
        p.style.fontSize = (20 + Math.random() * 22) + 'px';
        p.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 4200);
      }, i * 70);
    }
  },
};

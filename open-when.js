/* ══════════════════════════════════════════
   open-when.js — lettres « ouvre quand… »
   On écrit une lettre scellée pour l'autre ; elle l'ouvre quand le
   moment est venu, et l'auteur·e est prévenu·e.
   open_when/{id} : { from, to, label, text, createdAt, openedAt }
   ══════════════════════════════════════════ */
(function () {
  const PRESETS = [
    'tu es triste',
    'je te manque',
    "tu n'arrives pas à dormir",
    'tu doutes de toi',
    'tu as besoin de rire',
    'tu as besoin de courage',
    "c'est ton anniversaire",
    'tu as eu une super journée',
  ];

  let letters = [];
  let loaded = false;
  let draftLabel = PRESETS[0];

  const fmtDate = (ts) => ts?.toDate
    ? ts.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : '';

  function subscribe() {
    const { db, collection, onSnapshot, query, orderBy } = window._fb;
    onSnapshot(query(collection(db, 'open_when'), orderBy('createdAt', 'desc')), (snap) => {
      letters = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded = true;
      renderTile();
      if (document.getElementById('screen-openwhen')?.classList.contains('slide-in')) render();
    }, (err) => window.onFirestoreError && window.onFirestoreError(err));
  }

  /* ── Tuile du hub ── */
  function renderTile() {
    const sub = document.getElementById('tile-openwhen-sub');
    const badge = document.getElementById('tile-openwhen-badge');
    if (!sub) return;
    const me = Identity.get();
    const sealed = letters.filter(l => l.to === me && !l.openedAt).length;
    sub.textContent = sealed
      ? `${sealed} lettre${sealed > 1 ? 's' : ''} scellée${sealed > 1 ? 's' : ''} pour toi`
      : `écris-en une pour ${Identity.profile(Identity.other()).name}`;
    if (badge) {
      badge.textContent = sealed;
      badge.style.display = sealed ? '' : 'none';
    }
  }

  /* ── Sous-écran ── */
  function render() {
    const el = document.getElementById('openwhen-content');
    if (!el) return;
    if (!loaded) { el.innerHTML = '<div class="gallery-loading">Chargement des lettres…</div>'; return; }

    const me = Identity.get();
    const other = Identity.profile(Identity.other());
    const forMe = letters.filter(l => l.to === me);
    const mine  = letters.filter(l => l.from === me);

    const envelope = (l) => `
      <button class="ow-envelope${l.openedAt ? ' opened' : ''}" onclick="openWhenOpen('${l.id}')">
        <span class="ow-seal" aria-hidden="true">${l.openedAt ? '💌' : '✉️'}</span>
        <span class="ow-body">
          <span class="ow-label">ouvre quand ${escapeHtml(l.label)}</span>
          <span class="ow-meta">de ${escapeHtml(Identity.profile(l.from).name)}${l.openedAt ? ` · ouverte le ${fmtDate(l.openedAt)}` : ' · scellée'}</span>
        </span>
      </button>`;

    el.innerHTML = `
      <div class="section-label">pour toi</div>
      <div class="ow-list">
        ${forMe.length ? forMe.map(envelope).join('') : `<div class="ow-empty">Pas encore de lettre…<br>${escapeHtml(other.name)} peut t'en écrire une ✦</div>`}
      </div>

      <div class="section-label">écrire à ${escapeHtml(other.name)}</div>
      <div class="ow-compose">
        <div class="ow-chips" role="radiogroup" aria-label="Quand ouvrir la lettre">
          ${PRESETS.map(p => `<button class="ow-chip${p === draftLabel ? ' active' : ''}" role="radio" aria-checked="${p === draftLabel}" onclick="openWhenPick(this)" data-label="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
        </div>
        <input class="form-input" id="ow-custom" type="text" maxlength="60"
          placeholder="…ou ton propre moment (ex. tu rates ton train)" oninput="openWhenCustom(this.value)">
        <textarea class="form-input ow-text" id="ow-text" maxlength="8000" rows="6"
          placeholder="Ta lettre… elle restera scellée jusqu'à ce qu'elle l'ouvre."></textarea>
        <button class="btn-add" id="ow-send" onclick="openWhenSend()">Sceller la lettre 💌</button>
      </div>

      ${mine.length ? `
        <div class="section-label">tes lettres</div>
        <div class="ow-list">
          ${mine.map(l => `
            <div class="ow-sent">
              <span class="ow-seal" aria-hidden="true">${l.openedAt ? '💌' : '✉️'}</span>
              <span class="ow-body">
                <span class="ow-label">ouvre quand ${escapeHtml(l.label)}</span>
                <span class="ow-meta">${l.openedAt ? `ouverte le ${fmtDate(l.openedAt)} ✨` : 'pas encore ouverte'}</span>
              </span>
              <button class="countdown-delete" onclick="openWhenDelete('${l.id}')" aria-label="Supprimer cette lettre">✕</button>
            </div>`).join('')}
        </div>` : ''}
    `;
  }

  function pick(btn) {
    draftLabel = btn.dataset.label;
    document.querySelectorAll('.ow-chip').forEach(c => {
      const on = c === btn;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', on);
    });
    const custom = document.getElementById('ow-custom');
    if (custom) custom.value = '';
  }

  function custom(value) {
    const v = value.trim();
    if (v) {
      draftLabel = v.replace(/^ouvre quand\s*/i, '');
      document.querySelectorAll('.ow-chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-checked', false); });
    }
  }

  async function send() {
    const textEl = document.getElementById('ow-text');
    const text = textEl?.value.trim();
    if (!text) { showToast('Écris quelque chose dans ta lettre ✦'); return; }
    if (!draftLabel) return;
    const btn = document.getElementById('ow-send');
    btn.disabled = true;
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    try {
      await addDoc(collection(db, 'open_when'), {
        from: Identity.get(),
        to: Identity.other(),
        label: draftLabel,
        text,
        createdAt: serverTimestamp(),
        openedAt: null,
      });
      textEl.value = '';
      showToast(`Lettre scellée pour ${Identity.profile(Identity.other()).name} 💌`);
      if (typeof spawnConfetti === 'function') spawnConfetti(30);
      vibrate([20, 10, 20]);
    } catch (e) {
      console.error('Lettre :', e);
      showToast("La lettre n'a pas pu partir 🙁");
    } finally {
      btn.disabled = false;
    }
  }

  async function remove(id) {
    if (!confirm('Supprimer cette lettre ?')) return;
    const { db, doc, deleteDoc } = window._fb;
    try { await deleteDoc(doc(db, 'open_when', id)); showToast('Lettre supprimée 🌙'); }
    catch (e) { showToast('Suppression impossible 🙁'); }
  }

  /* Ouvrir une lettre : confirmation si elle est encore scellée */
  async function open(id) {
    const l = letters.find(x => x.id === id);
    if (!l) return;
    if (!l.openedAt) {
      if (!confirm(`Ouvrir maintenant la lettre « ouvre quand ${l.label} » ?`)) return;
      const { db, doc, updateDoc, serverTimestamp } = window._fb;
      updateDoc(doc(db, 'open_when', id), { openedAt: serverTimestamp() }).catch(() => {});
      vibrate([30, 20, 60]);
    }
    showReader(l);
  }

  function showReader(l) {
    const overlay = document.createElement('div');
    overlay.className = 'ow-reader';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', `Lettre : ouvre quand ${l.label}`);
    overlay.innerHTML = `
      <div class="ow-reader-card letter-card">
        <div class="ow-reader-label">ouvre quand ${escapeHtml(l.label)}</div>
        <div class="letter-body"></div>
        <div class="letter-signature">${escapeHtml(Identity.profile(l.from).name)} ${Identity.profile(l.from).emoji}</div>
      </div>
      <button class="ow-reader-close" aria-label="Fermer la lettre">fermer ✦</button>
    `;
    overlay.querySelector('.letter-body').textContent = l.text;
    const close = () => overlay.remove();
    overlay.querySelector('.ow-reader-close').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    document.body.appendChild(overlay);
    if (!l.openedAt && typeof spawnConfetti === 'function') spawnConfetti(40);
  }

  window.renderOpenWhen = render;
  window.openWhenPick   = pick;
  window.openWhenCustom = custom;
  window.openWhenSend   = send;
  window.openWhenDelete = remove;
  window.openWhenOpen   = open;

  if (window.onNuneReady) window.onNuneReady(subscribe);
})();

/* ══════════════════════════════════════════
   memories.js — les souvenirs qui reviennent
   - « Un jour dans le passé » : une photo ou un mot du bocal de la même
     date, il y a un an (ou un mois), en puce sur l'accueil
   - Album du mois : photos, chiffres, humeurs, message le plus aimé
   - Le bocal : des petits mots qu'on glisse et qu'on pioche (jar/{id})
   ══════════════════════════════════════════ */
(function () {
  let jar = [];
  let recapOffset = 0;      // 0 = ce mois-ci, -1 = le mois dernier…
  let pickedId = null;

  /* ════════ UN JOUR DANS LE PASSÉ ════════ */
  function onThisDay() {
    const now = new Date();
    const sameDay = (d, monthsBack) => {
      const target = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth() && d.getDate() === target.getDate();
    };
    const items = [
      ...(typeof sharedPhotos !== 'undefined' ? sharedPhotos : []).map(p => ({ kind: 'photo', item: p, date: Nune.toDate(p.createdAt) })),
      ...jar.map(j => ({ kind: 'jar', item: j, date: Nune.toDate(j.createdAt) })),
    ].filter(x => x.date);

    // D'abord les années passées, sinon le mois dernier
    for (let years = 5; years >= 1; years--) {
      const hit = items.find(x => sameDay(x.date, years * 12));
      if (hit) return { ...hit, label: `il y a ${years} an${years > 1 ? 's' : ''}` };
    }
    const month = items.find(x => sameDay(x.date, 1));
    return month ? { ...month, label: 'il y a un mois' } : null;
  }

  function refreshOnThisDay() {
    const m = onThisDay();
    Nune.chip('onthisday', m ? {
      order: 2,
      icon: m.kind === 'photo' ? '📸' : '🫙',
      text: m.label + ' aujourd\'hui',
      hot: true,
      onClick: () => m.kind === 'photo' ? openSharedPhoto(m.item.id) : (pushScreen('jar'), setTimeout(() => showJarNote(m.item), 400)),
    } : null);
  }

  /* ════════ LE BOCAL ════════ */
  function refreshJar() {
    const sub = document.getElementById('tile-jar-sub');
    if (sub) sub.textContent = jar.length ? `${jar.length} souvenir${jar.length > 1 ? 's' : ''} dedans` : 'glisse-y un premier souvenir';
    if (Nune.isOpen('jar')) renderJar();
    refreshOnThisDay();
  }

  function renderJar() {
    const el = document.getElementById('jar-content');
    if (!el) return;
    const picked = jar.find(j => j.id === pickedId);
    const fill = Math.min(100, 12 + jar.length * 4);
    el.innerHTML = `
      <div class="jar-visual" onclick="jarPick()" role="button" tabindex="0" aria-label="Piocher un souvenir">
        <div class="jar-glass">
          <div class="jar-fill" style="height:${fill}%"></div>
          <div class="jar-notes" aria-hidden="true">${'✦ 💌 🌸 ✨ 💛 🌙 '.repeat(Math.ceil(jar.length / 6)).split(' ').slice(0, jar.length).join(' ')}</div>
        </div>
        <div class="jar-lid"></div>
      </div>
      <div class="jar-count">${jar.length} souvenir${jar.length > 1 ? 's' : ''} dans le bocal</div>
      <button class="btn-add jar-pick" onclick="jarPick()" ${jar.length ? '' : 'disabled'}>Piocher un souvenir ✨</button>

      <div id="jar-picked">${picked ? noteHtml(picked) : ''}</div>

      <div class="section-label">glisser un souvenir</div>
      <div class="fw-compose">
        <textarea class="form-input" id="jar-text" maxlength="500" rows="3"
          placeholder="Un petit moment à garder… (le chocolat chaud raté, tes araignées…)"></textarea>
        <button class="btn-add" onclick="jarAdd()">Glisser dans le bocal 🫙</button>
      </div>

      ${jar.length ? `
        <details class="fw-details">
          <summary>voir tous les souvenirs</summary>
          <div class="fw-list">
            ${[...jar].reverse().map(j => `
              <div class="jar-row">
                <div class="jar-row-text">${escapeHtml(j.text)}</div>
                <div class="jar-row-meta">${escapeHtml(Nune.nameOf(j.from))} · ${Nune.fmtDate(j.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                  <button class="countdown-delete" onclick="jarDelete('${j.id}')" aria-label="Retirer ce souvenir">✕</button>
                </div>
              </div>`).join('')}
          </div>
        </details>` : ''}
    `;
  }

  const noteHtml = (j) => `
    <div class="jar-note">
      <div class="jar-note-text">${escapeHtml(j.text)}</div>
      <div class="jar-note-meta">glissé par ${escapeHtml(Nune.nameOf(j.from))} · ${Nune.fmtDate(j.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>`;

  function showJarNote(j) {
    pickedId = j.id;
    renderJar();
  }

  function pick() {
    if (!jar.length) return;
    let next;
    do { next = jar[Math.floor(Math.random() * jar.length)]; } while (jar.length > 1 && next.id === pickedId);
    pickedId = next.id;
    vibrate([15, 30, 15]);
    renderJar();
    document.getElementById('jar-picked')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function add() {
    const input = document.getElementById('jar-text');
    const text = input?.value.trim();
    if (!text) { showToast('Écris ton souvenir ✦'); return; }
    try {
      await Nune.add('jar', { text });
      input.value = '';
      showToast('Souvenir glissé dans le bocal 🫙');
      Nune.burst(['✨', '💛', '🌸'], 8);
    } catch (e) { showToast("Le souvenir n'a pas pu être ajouté 🙁"); }
  }

  async function remove(id) {
    if (!(await Nune.confirm({ icon: '🫙', title: 'Retirer ce souvenir ?', ok: 'Retirer', danger: true }))) return;
    try { await Nune.remove('jar', id); } catch (e) { showToast('Suppression impossible 🙁'); }
  }

  /* ════════ ALBUM DU MOIS ════════ */
  function monthRange(offset) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return { start, end, label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  }

  async function inMonth(name, start, end) {
    const { db, collection, query, where, getDocs } = window._fb;
    const snap = await getDocs(query(collection(db, name), where('createdAt', '>=', start), where('createdAt', '<', end)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function countInMonth(name, start, end) {
    const { db, collection, query, where, getCountFromServer } = window._fb;
    const snap = await getCountFromServer(query(collection(db, name), where('createdAt', '>=', start), where('createdAt', '<', end)));
    return snap.data().count;
  }

  const topEmoji = (list) => {
    const counts = {};
    list.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  };

  async function renderRecap() {
    const el = document.getElementById('recap-content');
    if (!el) return;
    const { start, end, label } = monthRange(recapOffset);
    const nav = `
      <div class="recap-nav">
        <button class="back-btn" onclick="recapMove(-1)" aria-label="Mois précédent">‹</button>
        <div class="recap-month">${label}</div>
        <button class="back-btn" onclick="recapMove(1)" aria-label="Mois suivant" ${recapOffset >= 0 ? 'disabled' : ''}>›</button>
      </div>`;
    el.innerHTML = nav + '<div class="gallery-loading">On rassemble votre mois…</div>';

    try {
      const [messages, kisses, answers, moods, reactions] = await Promise.all([
        countInMonth('messages', start, end),
        countInMonth('kisses', start, end),
        countInMonth('answers', start, end),
        inMonth('moods', start, end),
        inMonth('reactions', start, end),
      ]);
      const photos = (typeof sharedPhotos !== 'undefined' ? sharedPhotos : [])
        .filter(p => { const d = Nune.toDate(p.createdAt); return d && d >= start && d < end; });

      // Le message qui a reçu le plus de réactions
      const perMsg = {};
      reactions.forEach(r => { perMsg[r.msgId] = (perMsg[r.msgId] || 0) + 1; });
      const [bestId, bestCount] = Object.entries(perMsg).sort((a, b) => b[1] - a[1])[0] || [];
      let best = null;
      if (bestId) {
        const { db, doc, getDoc } = window._fb;
        const snap = await getDoc(doc(db, 'messages', bestId)).catch(() => null);
        if (snap?.exists()) best = snap.data();
      }

      const moodOf = (who) => topEmoji(moods.filter(m => m.from === who).map(m => m.emoji));
      const stat = (n, label) => `<div class="nous-stat"><strong>${n}</strong><span>${label}</span></div>`;

      el.innerHTML = nav + `
        <div class="recap-stats">
          ${stat(messages, 'messages')}
          ${stat(kisses, 'bisous')}
          ${stat(photos.length, 'photos')}
          ${stat(answers, 'réponses du jour')}
        </div>

        ${moodOf('kenzo') || moodOf('nune') ? `
          <div class="section-label">vos humeurs</div>
          <div class="recap-moods">
            ${['kenzo', 'nune'].map(w => `
              <div class="recap-mood"><span class="recap-mood-emoji">${moodOf(w) || '·'}</span><span>${escapeHtml(Nune.nameOf(w))}</span></div>`).join('')}
          </div>` : ''}

        ${best ? `
          <div class="section-label">le message le plus aimé</div>
          <div class="jar-note">
            <div class="jar-note-text">${best.voiceId ? '🎤 un message vocal' : escapeHtml(best.text || '')}</div>
            <div class="jar-note-meta">${escapeHtml(Nune.nameOf(best.from))} · ${bestCount} réaction${bestCount > 1 ? 's' : ''}</div>
          </div>` : ''}

        ${photos.length ? `
          <div class="section-label">les photos du mois</div>
          <div class="gallery-grid recap-photos">
            ${photos.map(p => `<button class="gallery-item" onclick="openSharedPhoto('${p.id}')" aria-label="${escapeHtml(p.caption || 'Photo')}"><img src="${p.thumb}" alt="" loading="lazy"></button>`).join('')}
          </div>` : ''}

        ${!messages && !photos.length && !kisses ? '<div class="ow-empty">Rien encore ce mois-ci… à vous de le remplir ✦</div>' : ''}
      `;
    } catch (e) {
      console.error('Album :', e);
      el.innerHTML = nav + '<div class="ow-empty">Impossible de charger ce mois 🙁</div>';
    }
  }

  function move(step) {
    recapOffset = Math.min(0, recapOffset + step);
    renderRecap();
  }

  /* ════════ DÉMARRAGE ════════ */
  window.jarPick = pick;
  window.jarAdd = add;
  window.jarDelete = remove;
  window.recapMove = move;
  registerScreen('jar', renderJar);
  registerScreen('recap', () => { if (typeof subscribeToPhotos === 'function') subscribeToPhotos(); renderRecap(); });

  const recapSub = document.getElementById('tile-recap-sub');
  if (recapSub) recapSub.textContent = monthRange(0).label;

  window.addEventListener('nune:photos', refreshOnThisDay);
  onNuneReady(() => {
    if (typeof subscribeToPhotos === 'function') subscribeToPhotos();
    Nune.live('jar', (docs) => { jar = docs; refreshJar(); }, { last: 500 });
  });
})();

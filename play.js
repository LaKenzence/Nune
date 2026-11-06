/* ══════════════════════════════════════════
   play.js — jouer ensemble
   - Défi de la semaine : chacun le relève avec une photo + un mot
     (challenges/{semaine}_{profil})
   - Quiz « tu me connais ? » : on pose des questions sur soi, l'autre
     devine (quiz/{id})
   - Dessin à deux : un tableau partagé, trait par trait (drawing/{id})
   ══════════════════════════════════════════ */
(function () {
  /* ════════════════ DÉFI DE LA SEMAINE ════════════════ */
  const CHALLENGES = [
    "Envoie une photo de ton ciel ce soir 🌌",
    "Photographie quelque chose qui te fait penser à moi",
    "Montre-moi ton petit-déjeuner de ce matin",
    "Une photo de ta vue préférée cette semaine",
    "Dessine-moi quelque chose (même mal !) et prends-le en photo",
    "Un selfie avec ta tête la plus drôle",
    "Trouve quelque chose de rose et photographie-le",
    "Montre-moi ce que tu lis ou regardes en ce moment",
    "Une photo d'un endroit où tu aimerais m'emmener",
    "Photographie ton coin préféré chez toi",
    "Une photo de tes chaussures du jour 👟",
    "Trouve un cœur caché dans la ville (une forme, une tache…)",
    "Ta tasse de café ou de thé du jour ☕",
    "Une photo d'un coucher (ou lever) de soleil",
    "Montre-moi quelque chose qui t'a fait rire cette semaine",
    "Photographie le chiffre 23 quelque part dans la vraie vie",
    "Un objet qui raconte une histoire sur toi",
    "Une fleur, une plante ou un arbre que tu trouves beau",
    "Ta tenue préférée de la semaine",
    "Une photo floue mais pleine d'ambiance",
    "Ce que tu vois par ta fenêtre en ce moment",
    "Un truc que tu as cuisiné toi-même",
    "Une photo en noir et blanc de ton choix",
    "Ton reflet quelque part (vitre, flaque, miroir…)",
    "Quelque chose de minuscule vu de très près",
    "Une photo de ta main qui fait un cœur 🫶",
  ];

  let challenges = [];
  const week = () => Nune.weekKey();
  const challengeFor = (w) => CHALLENGES[parseInt(w.replace(/\D/g, ''), 10) % CHALLENGES.length];
  const entryOf = (w, who) => challenges.find(c => c.week === w && c.from === who);

  function refreshChallenge() {
    const sub = document.getElementById('tile-challenge-sub');
    const mine = entryOf(week(), Nune.me());
    const theirs = entryOf(week(), Nune.other());
    if (sub) sub.textContent = mine && theirs ? 'relevé à deux ✓' : mine ? `en attente de ${Nune.otherName()}` : challengeFor(week());
    if (Nune.isOpen('challenge')) renderChallenge();
  }

  function entryHtml(e, who) {
    const name = who === Nune.me() ? 'toi' : Nune.nameOf(who);
    if (!e) return `<div class="ch-entry empty"><div class="ch-who">${escapeHtml(name)}</div><div class="ch-wait">pas encore relevé…</div></div>`;
    return `
      <div class="ch-entry">
        <button class="ch-photo" onclick="openLightbox(this.querySelector('img').src, '')">
          <img src="${e.photo}" alt="">
        </button>
        <div class="ch-who">${escapeHtml(name)}</div>
        ${e.text ? `<div class="ch-text">${escapeHtml(e.text)}</div>` : ''}
      </div>`;
  }

  function renderChallenge() {
    const el = document.getElementById('challenge-content');
    if (!el) return;
    const w = week();
    const mine = entryOf(w, Nune.me());
    const past = [...new Set(challenges.map(c => c.week))].filter(x => x !== w).sort().reverse();
    el.innerHTML = `
      <div class="q-card">
        <div class="q-date">cette semaine</div>
        <div class="q-question">${escapeHtml(challengeFor(w))}</div>
      </div>
      <div class="ch-pair">
        ${entryHtml(mine, Nune.me())}
        ${entryHtml(entryOf(w, Nune.other()), Nune.other())}
      </div>
      <div class="fw-compose">
        <input class="form-input" id="ch-text" maxlength="200" placeholder="Un petit mot avec ta photo (optionnel)…" value="${mine?.text ? escapeHtml(mine.text) : ''}">
        <label class="gallery-upload" for="ch-file" id="ch-upload">${mine ? '↻ changer ma photo' : '📷 relever le défi'}</label>
        <input type="file" id="ch-file" accept="image/*" style="display:none" onchange="playChallengeUpload(event)">
      </div>
      ${past.length ? `
        <div class="section-label">les défis d'avant</div>
        ${past.map(pw => `
          <details class="q-past-item">
            <summary><span class="q-past-date">${pw.replace('-W', ' · sem. ')}</span><span class="q-past-q">${escapeHtml(challengeFor(pw))}</span></summary>
            <div class="ch-pair">${entryHtml(entryOf(pw, Nune.me()), Nune.me())}${entryHtml(entryOf(pw, Nune.other()), Nune.other())}</div>
          </details>`).join('')}` : ''}
    `;
  }

  async function uploadChallenge(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const label = document.getElementById('ch-upload');
    if (label) { label.textContent = 'Envoi…'; label.classList.add('uploading'); }
    try {
      const photo = await compressToFit(file, 1000);
      const text = document.getElementById('ch-text')?.value.trim() || '';
      await Nune.put('challenges', `${week()}_${Nune.me()}`, { week: week(), photo, text });
      showToast('Défi relevé 🎯');
      Nune.burst(['🎯', '✨', '📸'], 10);
    } catch (e) {
      console.error('Défi :', e);
      showToast("La photo n'a pas pu partir 🙁");
      if (label) { label.textContent = '📷 relever le défi'; label.classList.remove('uploading'); }
    }
  }

  /* ════════════════ QUIZ ════════════════ */
  let quiz = [];

  function quizScore(guesser) {
    const asked = quiz.filter(q => q.from !== guesser && q.answer !== null && q.answer !== undefined);
    return { right: asked.filter(q => q.answer === q.correct).length, total: asked.length };
  }

  function refreshQuiz() {
    const sub = document.getElementById('tile-quiz-sub');
    const todo = quiz.filter(q => q.from === Nune.other() && (q.answer === null || q.answer === undefined)).length;
    if (sub) sub.textContent = todo ? `${todo} question${todo > 1 ? 's' : ''} à deviner` : 'pose une question sur toi';
    if (Nune.isOpen('quiz')) renderQuiz();
  }

  function renderQuiz() {
    const el = document.getElementById('quiz-content');
    if (!el) return;
    const me = Nune.me(), other = Nune.other();
    const todo = quiz.filter(q => q.from === other && (q.answer === null || q.answer === undefined));
    const done = quiz.filter(q => q.from === other && q.answer !== null && q.answer !== undefined).reverse();
    const mine = quiz.filter(q => q.from === me).reverse();
    const sMe = quizScore(me), sOther = quizScore(other);

    const options = (q, reveal) => q.options.map((o, i) => {
      const cls = reveal ? (i === q.correct ? ' right' : i === q.answer ? ' wrong' : '') : '';
      return reveal
        ? `<div class="quiz-opt${cls}">${escapeHtml(o)}</div>`
        : `<button class="quiz-opt" onclick="playQuizAnswer('${q.id}', ${i})">${escapeHtml(o)}</button>`;
    }).join('');

    el.innerHTML = `
      <div class="nous-stats">
        <div class="nous-stat"><strong>${sMe.right}/${sMe.total}</strong><span>tes bonnes réponses</span></div>
        <div class="nous-stat"><strong>${sOther.right}/${sOther.total}</strong><span>celles de ${escapeHtml(Nune.otherName())}</span></div>
      </div>

      <div class="section-label">à deviner</div>
      ${todo.length ? todo.map(q => `
        <div class="quiz-card">
          <div class="quiz-q">${escapeHtml(q.question)}</div>
          <div class="quiz-opts">${options(q, false)}</div>
        </div>`).join('') : `<div class="ow-empty">Rien à deviner pour l'instant…<br>${escapeHtml(Nune.otherName())} peut te poser une question ✦</div>`}

      <div class="section-label">pose une question sur toi</div>
      <div class="fw-compose">
        <input class="form-input" id="quiz-question" maxlength="140" placeholder="Ex. Mon plat préféré ?">
        ${[0, 1, 2, 3].map(i => `
          <label class="quiz-new-opt">
            <input type="radio" name="quiz-correct" value="${i}" ${i === 0 ? 'checked' : ''} aria-label="Bonne réponse ${i + 1}">
            <input class="form-input" id="quiz-opt-${i}" maxlength="60" placeholder="Réponse ${i + 1}${i === 0 ? ' (coche la bonne)' : ''}">
          </label>`).join('')}
        <button class="btn-add" onclick="playQuizAdd()">Poser la question 🧠</button>
      </div>

      ${mine.length ? `
        <div class="section-label">tes questions</div>
        ${mine.map(q => {
          const answered = q.answer !== null && q.answer !== undefined;
          return `
          <div class="quiz-card mini">
            <div class="quiz-q">${escapeHtml(q.question)}</div>
            <div class="quiz-status">${!answered ? `en attente de ${escapeHtml(Nune.otherName())}…`
              : q.answer === q.correct ? `✅ ${escapeHtml(Nune.otherName())} a trouvé`
              : `❌ ${escapeHtml(Nune.otherName())} a répondu « ${escapeHtml(q.options[q.answer])} »`}</div>
            <button class="countdown-delete" onclick="playQuizDelete('${q.id}')" aria-label="Supprimer la question">✕</button>
          </div>`; }).join('')}` : ''}

      ${done.length ? `
        <details class="fw-details">
          <summary>tes réponses passées</summary>
          ${done.map(q => `<div class="quiz-card mini"><div class="quiz-q">${escapeHtml(q.question)}</div><div class="quiz-opts">${options(q, true)}</div></div>`).join('')}
        </details>` : ''}
    `;
  }

  async function quizAdd() {
    const question = document.getElementById('quiz-question')?.value.trim();
    const opts = [0, 1, 2, 3].map(i => document.getElementById(`quiz-opt-${i}`)?.value.trim() || '');
    const correct = parseInt(document.querySelector('input[name="quiz-correct"]:checked')?.value || '0', 10);
    const filled = opts.map((o, i) => ({ o, i })).filter(x => x.o);
    if (!question || filled.length < 2) { showToast('Une question et au moins 2 réponses ✦'); return; }
    if (!opts[correct]) { showToast('Coche une réponse remplie comme bonne réponse ✦'); return; }
    const options = filled.map(x => x.o);
    try {
      await Nune.add('quiz', { question, options, correct: filled.findIndex(x => x.i === correct), answer: null, answeredAt: null });
      showToast(`Question envoyée à ${Nune.otherName()} 🧠`);
    } catch (e) { showToast("La question n'a pas pu partir 🙁"); }
  }

  async function quizAnswer(id, i) {
    const q = quiz.find(x => x.id === id);
    if (!q) return;
    const { db, doc, updateDoc, serverTimestamp } = window._fb;
    try {
      await updateDoc(doc(db, 'quiz', id), { answer: i, answeredAt: serverTimestamp() });
      if (i === q.correct) { Nune.burst(['✅', '🎉', '💕'], 12); showToast('Bonne réponse ! 🎉'); }
      else { vibrate([40, 30, 40]); showToast(`Raté… c'était « ${q.options[q.correct]} »`); }
    } catch (e) { showToast("La réponse n'a pas pu partir 🙁"); }
  }

  async function quizDelete(id) {
    if (!(await Nune.confirm({ icon: '🧠', title: 'Supprimer cette question ?', ok: 'Supprimer', danger: true }))) return;
    try { await Nune.remove('quiz', id); } catch (e) { showToast('Suppression impossible 🙁'); }
  }

  function onQuiz(docs, changes, first) {
    quiz = docs;
    if (!first) changes.forEach(c => {
      const q = c.doc.data();
      if (c.type === 'added' && q.from !== Nune.me()) Nune.notify(`🧠 ${Nune.nameOf(q.from)} te pose une question`);
      if (c.type === 'modified' && q.from === Nune.me() && q.answer !== null) {
        Nune.notify(q.answer === q.correct ? `✅ ${Nune.otherName()} a trouvé ta question` : `❌ ${Nune.otherName()} s'est trompé·e sur ta question`);
      }
    });
    refreshQuiz();
  }

  /* ════════════════ DESSIN À DEUX ════════════════ */
  const COLORS = ['#f8bbd0', '#f06292', '#ce93d8', '#ffd54f', '#80cbc4', '#fff8f5'];
  let strokes = [];
  let color = COLORS[1];
  let drawingNow = null;   // points du trait en cours

  function canvasEl() { return document.getElementById('draw-canvas'); }

  function sizeCanvas() {
    const c = canvasEl();
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    c.width = w * dpr;
    c.height = w * dpr;
    redraw();
  }

  function drawStroke(ctx, s, W) {
    const p = s.points;
    if (!p || p.length < 2) return;
    ctx.strokeStyle = s.color || '#fff';
    ctx.lineWidth = (s.width || 0.008) * W;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0] * W, p[1] * W);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * W, p[i + 1] * W);
    if (p.length === 2) ctx.lineTo(p[0] * W + 0.1, p[1] * W);
    ctx.stroke();
  }

  function redraw() {
    const c = canvasEl();
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    strokes.forEach(s => drawStroke(ctx, s, c.width));
    if (drawingNow) drawStroke(ctx, { points: drawingNow, color, width: 0.008 }, c.width);
  }

  function renderDraw() {
    const el = document.getElementById('draw-content');
    if (!el) return;
    el.innerHTML = `
      <div class="draw-hint">dessine ici — ${escapeHtml(Nune.otherName())} voit chaque trait arriver ✦</div>
      <canvas class="draw-canvas" id="draw-canvas" aria-label="Tableau à dessin partagé"></canvas>
      <div class="draw-tools">
        <div class="draw-colors">
          ${COLORS.map(c => `<button class="draw-color${c === color ? ' active' : ''}" style="background:${c}" data-color="${c}" aria-label="Couleur ${c}"></button>`).join('')}
        </div>
        <button class="profile-link" onclick="playDrawClear()">tout effacer</button>
      </div>
    `;
    el.querySelectorAll('.draw-color').forEach(b => b.onclick = () => {
      color = b.dataset.color;
      el.querySelectorAll('.draw-color').forEach(x => x.classList.toggle('active', x === b));
    });
    const c = canvasEl();
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [+((e.clientX - r.left) / r.width).toFixed(3), +((e.clientY - r.top) / r.width).toFixed(3)];
    };
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      drawingNow = pos(e);
      redraw();
    });
    c.addEventListener('pointermove', (e) => {
      if (!drawingNow || drawingNow.length >= 1998) return;
      drawingNow.push(...pos(e));
      redraw();
    });
    const end = () => {
      if (!drawingNow) return;
      const points = drawingNow;
      drawingNow = null;
      // Affichage immédiat, puis le snapshot remplace par la version enregistrée
      strokes.push({ points, color, width: 0.008, pending: true });
      redraw();
      Nune.add('drawing', { points, color, width: 0.008 }).catch(() => showToast("Le trait n'a pas pu partir 🙁"));
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    requestAnimationFrame(sizeCanvas);
  }

  async function clearDrawing() {
    if (!(await Nune.confirm({ icon: '🎨', title: 'Tout effacer ?', text: 'Le tableau sera vidé pour vous deux.', ok: 'Effacer', danger: true }))) return;
    const { db, doc, writeBatch } = window._fb;
    const batch = writeBatch(db);
    strokes.filter(s => s.id).slice(0, 500).forEach(s => batch.delete(doc(db, 'drawing', s.id)));
    try { await batch.commit(); showToast('Tableau effacé 🎨'); } catch (e) { showToast('Effacement impossible 🙁'); }
  }

  function onDrawing(docs) {
    strokes = docs;
    redraw();
  }

  /* ════════ DÉMARRAGE ════════ */
  window.playChallengeUpload = uploadChallenge;
  window.playQuizAdd = quizAdd;
  window.playQuizAnswer = quizAnswer;
  window.playQuizDelete = quizDelete;
  window.playDrawClear = clearDrawing;
  registerScreen('challenge', renderChallenge);
  registerScreen('quiz', renderQuiz);
  registerScreen('draw', renderDraw);
  window.addEventListener('resize', () => { if (Nune.isOpen('draw')) sizeCanvas(); });

  onNuneReady(() => {
    Nune.live('challenges', (docs) => { challenges = docs; refreshChallenge(); }, { last: 80 });
    Nune.live('quiz', onQuiz, { last: 200 });
    Nune.live('drawing', onDrawing, { last: 500 });
    refreshChallenge();
  });
})();

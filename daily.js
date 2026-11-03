/* ══════════════════════════════════════════
   daily.js — le quotidien à deux
   - Question du jour : la même pour vous deux, on voit la réponse
     de l'autre une fois qu'on a répondu   (answers/{jour}_{profil})
   - Bonjour / bonne nuit : un bouton, et le premier « bonjour » du
     matin part tout seul                  (rituals/{id})
   ══════════════════════════════════════════ */
(function () {
  const QUESTIONS = [
    "Quel est ton plus beau souvenir de nous ?",
    "Si on pouvait se téléporter ce soir, on irait où ?",
    "Qu'est-ce qui t'a fait sourire aujourd'hui ?",
    "Quelle chanson te fait penser à moi ?",
    "Qu'est-ce que tu as remarqué chez moi en premier ?",
    "Quel petit geste de moi te fait du bien ?",
    "Qu'est-ce que tu aimerais qu'on fasse la prochaine fois qu'on se voit ?",
    "Quel est ton rêve le plus fou pour nous deux ?",
    "Un plat qu'on devrait cuisiner ensemble ?",
    "Qu'est-ce qui te manque le plus quand on est loin ?",
    "Décris notre journée parfaite.",
    "Quel surnom tu aimerais que je te donne ?",
    "Qu'est-ce que tu n'as jamais osé me dire ?",
    "Un film qu'on doit absolument regarder ensemble ?",
    "Quelle est la chose la plus drôle qu'on ait vécue ?",
    "Si on avait une maison, à quoi elle ressemblerait ?",
    "Qu'est-ce qui te rend fier·e de toi en ce moment ?",
    "Un pays qu'on visitera ensemble un jour ?",
    "Qu'est-ce que tu as appris grâce à moi ?",
    "Ton moment préféré de la journée, et pourquoi ?",
    "Trois mots pour décrire notre couple ?",
    "Qu'est-ce qui t'inquiète en ce moment ? Je suis là.",
    "Quelle tradition on pourrait créer, juste à nous ?",
    "Quel est ton souvenir d'enfance préféré ?",
    "Si on écrivait un livre sur nous, quel serait le titre ?",
    "Qu'est-ce que tu fais quand je te manque ?",
    "Une chose que tu veux que je sache sur toi ?",
    "Le meilleur câlin qu'on se soit fait, c'était quand ?",
    "Qu'est-ce qui te fait te sentir aimé·e ?",
    "Un défi qu'on pourrait relever ensemble cette année ?",
    "Ta saison préférée pour être avec moi ?",
    "Quel super-pouvoir tu voudrais pour nous deux ?",
    "Si tu pouvais revivre une journée avec moi, laquelle ?",
    "Qu'est-ce qui te fait rire chez moi ?",
    "Une odeur qui te rappelle nous ?",
    "Comment tu imagines nous dans 10 ans ?",
    "Qu'est-ce que tu as envie de me dire là, tout de suite ?",
    "Ton rendez-vous idéal, sans limite de budget ?",
    "Qu'est-ce qui t'a le plus surpris·e chez moi ?",
    "Une habitude à moi que tu trouves mignonne ?",
    "La première chose que tu fais en arrivant chez moi ?",
    "Quel est le plus beau compliment qu'on t'ait fait ?",
    "Qu'est-ce qui te donne de l'énergie en ce moment ?",
    "Une photo de nous que tu adores, et pourquoi ?",
    "Si on avait un animal, ce serait quoi et comment il s'appellerait ?",
    "Qu'est-ce qu'on fait de mieux ensemble ?",
    "Un mot que tu associes à notre histoire ?",
    "Ce que tu aimerais me dire si je partais loin longtemps ?",
    "Ta façon préférée de recevoir de l'amour ?",
    "Un endroit où tu te sens chez toi ?",
    "Qu'est-ce qui rend notre distance plus facile ?",
    "Ton souvenir préféré de notre premier mois ?",
    "Qu'est-ce qui t'a fait craquer pour moi ?",
    "Une promesse que tu veux qu'on se fasse ?",
    "Le dernier rêve où j'étais là ?",
    "Ton petit plaisir du dimanche ?",
    "Qu'est-ce que tu aimerais qu'on apprenne ensemble ?",
    "Quel est ton endroit préféré dans ma ville ?",
    "Si tu devais résumer aujourd'hui en un emoji ?",
    "Qu'est-ce que tu veux qu'on se souvienne de cette année ?",
  ];

  let answers = [];   // tous les documents answers récents
  let rituals = [];

  const today = () => Nune.dayKey();
  const questionFor = (day) => {
    const [y, m, d] = day.split('-').map(Number);
    return QUESTIONS[Nune.dayNumber(new Date(y, m - 1, d)) % QUESTIONS.length];
  };
  const answerOf = (day, who) => answers.find(a => a.day === day && a.from === who);

  /* ════════ QUESTION DU JOUR ════════ */
  function refreshQuestion() {
    const mine = answerOf(today(), Nune.me());
    const theirs = answerOf(today(), Nune.other());

    const sub = document.getElementById('tile-question-sub');
    const badge = document.getElementById('tile-question-badge');
    if (sub) sub.textContent = questionFor(today());
    if (badge) badge.style.display = mine ? 'none' : '';

    Nune.chip('question', {
      order: 1,
      icon: mine && theirs ? '💬' : '❓',
      text: !mine ? 'question du jour' : theirs ? `${Nune.otherName()} a répondu` : 'en attente de sa réponse',
      hot: !mine || (mine && theirs && !localStorage.getItem('q-seen-' + today())),
      onClick: () => pushScreen('question'),
    });

    if (Nune.isOpen('question')) renderQuestion();
  }

  function answerBlock(day, who) {
    const a = answerOf(day, who);
    const name = who === Nune.me() ? 'toi' : Nune.nameOf(who);
    return `
      <div class="q-answer${who === Nune.me() ? ' mine' : ''}">
        <div class="q-who">${escapeHtml(name)}</div>
        <div class="q-text">${a ? escapeHtml(a.text) : '<span class="q-waiting">pas encore répondu…</span>'}</div>
      </div>`;
  }

  function renderQuestion() {
    const el = document.getElementById('question-content');
    if (!el) return;
    const day = today();
    const mine = answerOf(day, Nune.me());
    const theirs = answerOf(day, Nune.other());
    if (mine && theirs) localStorage.setItem('q-seen-' + day, '1');

    const past = [...new Set(answers.map(a => a.day))]
      .filter(d => d !== day)
      .sort().reverse().slice(0, 21);

    el.innerHTML = `
      <div class="q-card">
        <div class="q-date">${Nune.fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div class="q-question">${escapeHtml(questionFor(day))}</div>
      </div>

      ${mine ? `
        <div class="q-answers">
          ${answerBlock(day, Nune.me())}
          ${theirs
            ? answerBlock(day, Nune.other())
            : `<div class="q-answer locked"><div class="q-who">${escapeHtml(Nune.otherName())}</div><div class="q-text"><span class="q-waiting">🔒 pas encore répondu</span></div></div>`}
        </div>
        <button class="profile-link q-edit" onclick="dailyEditAnswer()">modifier ma réponse</button>
      ` : `
        <textarea class="form-input q-input" id="q-input" maxlength="2000" rows="4"
          placeholder="Ta réponse… ${escapeHtml(Nune.otherName())} la verra quand tu auras répondu."></textarea>
        <button class="btn-add" id="q-send" onclick="dailyAnswer()">Répondre ✦</button>
        ${theirs ? `<div class="q-hint">🔒 ${escapeHtml(Nune.otherName())} a déjà répondu — réponds pour découvrir sa réponse</div>` : ''}
      `}

      ${past.length ? `
        <div class="section-label q-past-label">les jours d'avant</div>
        <div class="q-past">
          ${past.map(d => `
            <details class="q-past-item">
              <summary>
                <span class="q-past-date">${Nune.fmtDate(new Date(d + 'T12:00:00'), { day: 'numeric', month: 'short' })}</span>
                <span class="q-past-q">${escapeHtml(questionFor(d))}</span>
              </summary>
              ${answerBlock(d, Nune.me())}
              ${answerBlock(d, Nune.other())}
            </details>`).join('')}
        </div>` : ''}
    `;
  }

  async function answer() {
    const input = document.getElementById('q-input');
    const text = input?.value.trim();
    if (!text) { showToast('Écris ta réponse ✦'); return; }
    const btn = document.getElementById('q-send');
    btn.disabled = true;
    try {
      await Nune.put('answers', `${today()}_${Nune.me()}`, { day: today(), text });
      vibrate([20]);
      if (answerOf(today(), Nune.other())) Nune.burst(['💬', '✨', '💕'], 10);
    } catch (e) {
      console.error('Réponse :', e);
      showToast("Ta réponse n'a pas pu partir 🙁");
      btn.disabled = false;
    }
  }

  function editAnswer() {
    const mine = answerOf(today(), Nune.me());
    // On retire localement la réponse pour réafficher le champ
    answers = answers.filter(a => a !== mine);
    renderQuestion();
    const input = document.getElementById('q-input');
    if (input && mine) input.value = mine.text;
  }

  /* ════════ BONJOUR / BONNE NUIT ════════ */
  const isNightTime = () => { const h = new Date().getHours(); return h >= 18 || h < 5; };
  const isMorning   = () => { const h = new Date().getHours(); return h >= 5 && h < 12; };

  function refreshRitualButton() {
    const btn = document.getElementById('ritual-btn');
    if (!btn) return;
    const night = !isMorning();
    btn.textContent = night ? '🌙' : '☀️';
    btn.setAttribute('aria-label', night ? 'Dire bonne nuit' : 'Dire bonjour');
    btn.title = night ? 'bonne nuit' : 'bonjour';
  }

  async function sendRitual(type = isMorning() ? 'morning' : 'night', auto = false) {
    try {
      await Nune.add('rituals', { type, day: today() });
      localStorage.setItem(`ritual-${type}`, today());
      if (!auto) {
        showToast(type === 'night'
          ? `Bonne nuit envoyée à ${Nune.otherName()} 🌙`
          : `Bonjour envoyé à ${Nune.otherName()} ☀️`);
        Nune.burst(type === 'night' ? ['🌙', '✨', '⭐'] : ['☀️', '🌸', '✨'], 10);
        vibrate([20]);
      }
    } catch (e) {
      if (!auto) showToast("Ça n'a pas pu partir 🙁");
    }
  }

  /* Le premier « bonjour » du matin part tout seul, une fois par jour */
  function autoMorning() {
    if (!isMorning()) return;
    if (localStorage.getItem('ritual-morning') === today()) return;
    sendRitual('morning', true);
  }

  function onRituals(docs, changes, first) {
    rituals = docs;
    if (first) return;
    changes.forEach(c => {
      if (c.type !== 'added') return;
      const r = c.doc.data();
      if (r.from === Nune.me()) return;
      const name = Nune.nameOf(r.from);
      Nune.notify(r.type === 'night' ? `🌙 ${name} va dormir — bonne nuit` : `☀️ ${name} te dit bonjour`);
      Nune.burst(r.type === 'night' ? ['🌙', '⭐', '✨'] : ['☀️', '🌸', '💛'], 12);
      vibrate([30, 40, 30]);
    });
    window.dispatchEvent(new Event('nune:rituals'));
  }

  /* Dernier rituel de l'autre : utilisé par presence.js (« dort depuis 23:40 ») */
  window.lastRitualOf = (who) => {
    for (let i = rituals.length - 1; i >= 0; i--) if (rituals[i].from === who) return rituals[i];
    return null;
  };

  /* ════════ DÉMARRAGE ════════ */
  window.dailyAnswer = answer;
  window.dailyEditAnswer = editAnswer;
  window.sendRitual = () => sendRitual();
  registerScreen('question', renderQuestion);

  refreshRitualButton();
  setInterval(refreshRitualButton, 5 * 60 * 1000);

  onNuneReady(() => {
    Nune.live('answers', (docs, changes, first) => {
      answers = docs;
      if (!first) changes.forEach(c => {
        const a = c.doc.data();
        if (c.type === 'added' && a.from !== Nune.me() && a.day === today()) {
          Nune.notify(`💬 ${Nune.nameOf(a.from)} a répondu à la question du jour`);
        }
      });
      refreshQuestion();
    }, { last: 120 });
    Nune.live('rituals', onRituals, { last: 40 });
    autoMorning();
    refreshQuestion();
  });
})();

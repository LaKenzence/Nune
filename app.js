/* ══════════════════════════════════════════
   app.js — Twenty Three · Signaux pour Nune
   ══════════════════════════════════════════ */

/* ── STATE ── */
let count = parseInt(localStorage.getItem('signal-count') || '0');
let musicPlaying = false;
let secretModeCount = 0;
let typingInterval = null;
let currentAmbiance = null;
let ambianceAudio = null;
let selectedMoodEmoji = null;
let selectedMapEmoji = '📍';
let currentCitationIdx = 0;
const CIRCUMFERENCE = 2 * Math.PI * 22;

/* ══════════════════════════════════════════
   SIGNALS
══════════════════════════════════════════ */
const signals = [
  { emoji: "🌙", text: "Quelque chose de doux s'aligne ce soir.", mood: "calme" },
  { emoji: "✨", text: "23 est là, dans l'espace entre deux pensées.", mood: "mystère" },
  { emoji: "💫", text: "Tu remarques les coïncidences parce qu'elles t'appartiennent.", mood: "magie" },
  { emoji: "🌸", text: "Un moment ordinaire vient de devenir rare.", mood: "douceur" },
  { emoji: "🔮", text: "Ce n'est pas le hasard. Rien de tout ça ne l'est.", mood: "destin" },
  { emoji: "💖", text: "Quelqu'un pense fort à toi en ce moment.", mood: "amour" },
  { emoji: "🌿", text: "Respire. Ce signal t'a trouvée.", mood: "sérénité" },
  { emoji: "⭐", text: "Les étoiles ont de la mémoire. Et tu y es écrite.", mood: "cosmos" },
  { emoji: "🕊️", text: "La légèreté. C'est ce que tu mérites.", mood: "paix" },
  { emoji: "🌊", text: "Les vagues ne choisissent pas où elles arrivent, et pourtant…", mood: "hasard" },
  { emoji: "🦋", text: "Une transformation silencieuse est en cours.", mood: "éveil" },
  { emoji: "🌙", text: "Ce soir, le ciel a quelque chose de réservé pour toi.", mood: "nuit" },
  { emoji: "💛", text: "Tu es exactement là où tu dois être.", mood: "confiance" },
  { emoji: "🎴", text: "Chapitre 2 : le système commence à te reconnaître…", mood: "mystère" },
  { emoji: "🌺", text: "Chaque signal est la preuve que tu es vue.", mood: "présence" },
  { emoji: "✦", text: "Quelque chose d'invisible tient ta main.", mood: "connexion" },
  { emoji: "🌙", text: "La nuit apporte la sagesse, et toi tu portes la lumière.", mood: "lumière" },
  { emoji: "💌", text: "Un message a voyagé loin pour te rejoindre.", mood: "amour" },
  { emoji: "🫧", text: "Légèreté totale. Tout ce qui est lourd peut partir.", mood: "libération" },
  { emoji: "🌟", text: "Approche finale… le 23 est tout près.", mood: "anticipation" },
  { emoji: "🔮", text: "Ce n'était pas 23 taps.", mood: "révélation" },
  { emoji: "💫", text: "C'était quelqu'un qui faisait attention.", mood: "amour" },
  { emoji: "🌹", text: "Dans le silence entre nous, quelque chose parle.", mood: "intimité" },
  { emoji: "💎", text: "Tu brilles même quand tu ne le sens pas.", mood: "force" },
  { emoji: "🌅", text: "Chaque matin tu te lèves est une petite victoire.", mood: "courage" },
  { emoji: "🎵", text: "Il y a une mélodie qui ne joue que pour toi.", mood: "douceur" },
  { emoji: "🏡", text: "Tu es le foyer de quelqu'un.", mood: "appartenance" },
  { emoji: "🫀", text: "Ce battement-là, c'est à cause de toi.", mood: "amour" },
];

/* ══════════════════════════════════════════
   MESSAGES PERSONNALISÉS CACHÉS
   → Remplace ces textes par tes vrais souvenirs
══════════════════════════════════════════ */
const personalSignals = {
  3:  { emoji: "🌙", text: "Tu te souviens du soir où on a regardé le ciel ensemble ?\nMoi oui. Tout le temps.", mood: "souvenir" },
  7:  { emoji: "💌", text: "Ce moment précis où j'ai su.\nTu portais ce sourire-là.", mood: "révélation" },
  11: { emoji: "🌹", text: "11 est notre chiffre silencieux.\nCelui que personne d'autre ne voit.", mood: "secret" },
  15: { emoji: "✨", text: "Je pense à toi exactement comme ça.\nDouce, lumineuse, réelle.", mood: "amour" },
  19: { emoji: "🫀", text: "Quatre signaux avant la fin.\nMon cœur bat déjà plus fort.", mood: "anticipation" },
};

const unlockMessages = [
  `Nune…\n\nchaque signal était une façon de te dire quelque chose\nsans le dire tout à fait.\n\nMaintenant tu sais. 💖`,
  `Tu es arrivée au signal 23.\n\nEt moi j'ai arrêté de compter depuis longtemps,\nparce que chaque moment avec toi\nn'a pas besoin de chiffre.`,
  `23 signaux.\n\nEt chacun d'eux portait le même message :\nje suis là, je pense à toi,\net tu comptes énormément. 🌙`,
];

const chatResponses = {
  "hello|salut|hey|bonjour|coucou": { emoji: "💖", text: "Bonjour Nune… le signal t'attendait.", mood: "présence" },
  "23": { emoji: "🔮", text: "Tu le remarques encore. Ce n'est pas anodin.", mood: "mystère" },
  "amour|love|je t'aime|t'aime": { emoji: "💌", text: "Ce mot porte un signal très fort.", mood: "amour" },
  "qui|who": { emoji: "✦", text: "Juste un système doux construit pour toi.", mood: "mystère" },
  "triste|sad|mal|déprimée": { emoji: "🌙", text: "Ce n'est que temporaire. Tu es plus forte que ce soir.", mood: "sérénité" },
  "belle|beautiful|jolie": { emoji: "🌸", text: "Le signal confirme : absolument.", mood: "douceur" },
  "merci|thank": { emoji: "💛", text: "C'est toi le signal le plus fort ici.", mood: "lumière" },
  "secret": { emoji: "🔒", text: "Tu as trouvé le mot. Tape ✦ pour aller plus loin.", mood: "mystère" },
  "fatiguée|tired|épuisée": { emoji: "🌿", text: "Pose-toi. Tu as le droit de souffler.", mood: "repos" },
  "manque|miss": { emoji: "💫", text: "La distance ne change rien à ce qui est réel.", mood: "connexion" },
};

/* ══════════════════════════════════════════
   CITATIONS CACHÉES
   → Remplace/ajoute tes propres citations pour elle
══════════════════════════════════════════ */
const citations = [
  { text: "Il y a des gens qui éclairent la vie rien qu'en étant là.", author: "— pour toi" },
  { text: "Tu mérites un amour qui n'a pas peur de lui-même.", author: "— R. H. Sin" },
  { text: "Dans un champ d'étoiles, tu es celle qu'on choisit de regarder.", author: "— pour toi" },
  { text: "Être vue. Être choisie. Être aimée pour ce qu'on est vraiment.", author: "— pour toi" },
  { text: "La douceur est une forme de courage que peu de gens reconnaissent.", author: "— pour toi" },
  { text: "Tu n'as pas à mériter ta place. Elle a toujours été là.", author: "— pour toi" },
  { text: "Les vraies choses n'ont pas besoin d'être expliquées.", author: "— pour toi" },
  { text: "Quelque part, quelqu'un pense à toi et sourit sans raison.", author: "— pour toi" },
  { text: "Tu es la pensée qui revient toujours.", author: "— pour toi" },
  { text: "Ce qui compte ne se compte pas.", author: "— Antoine de Saint-Exupéry" },
];

/* ══════════════════════════════════════════
   LETTRE INTIME
   → Remplace ce texte par ta vraie lettre
══════════════════════════════════════════ */
const LETTER = {
  salutation: "Nune,",
  body: `Il y a des choses qu'on ne dit pas facilement.
Pas parce qu'elles ne sont pas vraies,
mais parce qu'elles sont trop vraies.

J'ai construit ces signaux pour toi.
Chaque tap, chaque message — c'est moi qui pense à toi
dans le silence de quelque chose que les mots n'atteignent pas tout à fait.

Tu mérites d'être vue.
Tu mérites d'être choisie.
Tu mérites que quelqu'un remarque
les petits détails qui font que tu es toi.

Alors voilà.
Je les remarque.`,
  signature: "— toujours, quelqu'un qui fait attention ✦",
  date: "Pour toi, pour toujours."
};

/* ══════════════════════════════════════════
   AMBIANCES MUSICALES
   → Remplace les src par tes vrais fichiers audio
══════════════════════════════════════════ */
const ambiances = [
  { id: "lofi",   icon: "🌙", name: "Lo-fi",   sub: "doux & calme",  src: "lofi.mp3" },
  { id: "piano",  icon: "🎹", name: "Piano",   sub: "mélancolique",  src: "piano.mp3" },
  { id: "rain",   icon: "🌧️", name: "Pluie",   sub: "cocooning",     src: "rain.mp3" },
  { id: "cafe",   icon: "☕", name: "Café",    sub: "chaleureux",    src: "cafe.mp3" },
];

/* ══════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════ */
const ONBOARDING_STEPS = [
  {
    visual: "✨",
    title: "Bienvenue dans\nTwenty Three",
    text: "Un espace construit spécialement pour toi.\nDes signaux, des souvenirs, des moments."
  },
  {
    visual: "💌",
    title: "Des signaux qui\nvoyagent vers toi",
    text: "Chaque tap sur la carte t'envoie un message.\nCertains sont cachés, uniquement pour toi."
  },
  {
    visual: "🌙",
    title: "Ton espace,\ntes souvenirs",
    text: "Photos, dates importantes, capsules du futur…\nTout est là, rien ne disparaît."
  },
  {
    visual: "💖",
    title: "Comment tu\nveux qu'on t'appelle ?",
    text: "Pour que les signaux soient vraiment pour toi.",
    hasInput: true
  }
];

let onboardingStep = 0;

function checkOnboarding() {
  if (!localStorage.getItem('onboarding-done')) {
    document.getElementById('onboarding').classList.add('active');
    renderOnboardingStep(0);
  }
}

function renderOnboardingStep(idx) {
  onboardingStep = idx;
  const step = ONBOARDING_STEPS[idx];
  const container = document.getElementById('onboarding-steps');

  container.innerHTML = `
    <div class="onboarding-step active">
      <div class="onboarding-visual">${step.visual}</div>
      <div class="onboarding-title">${step.title.replace(/\n/g,'<br>')}</div>
      <div class="onboarding-text">${step.text.replace(/\n/g,'<br>')}</div>
      ${step.hasInput ? `<input class="onboarding-name-input" id="onboarding-name" type="text" placeholder="ton prénom…" maxlength="20" autocomplete="off">` : ''}
      <button class="btn-onboarding" onclick="nextOnboardingStep()">
        ${idx < ONBOARDING_STEPS.length - 1 ? 'Continuer →' : 'Commencer ✦'}
      </button>
      ${idx > 0 ? `<button class="btn-onboarding ghost" onclick="renderOnboardingStep(${idx-1})">← Retour</button>` : ''}
    </div>
  `;

  // update dots
  document.querySelectorAll('.onboarding-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

function nextOnboardingStep() {
  if (onboardingStep === ONBOARDING_STEPS.length - 1) {
    // last step — save name if entered
    const nameInput = document.getElementById('onboarding-name');
    if (nameInput && nameInput.value.trim()) {
      localStorage.setItem('user-name', nameInput.value.trim());
    }
    finishOnboarding();
  } else {
    renderOnboardingStep(onboardingStep + 1);
  }
}

function finishOnboarding() {
  localStorage.setItem('onboarding-done', '1');
  const ob = document.getElementById('onboarding');
  ob.style.opacity = '0';
  ob.style.transition = 'opacity 0.5s ease';
  setTimeout(() => {
    ob.classList.remove('active');
    ob.style.opacity = '';
    ob.style.transition = '';
    spawnConfetti(50);
    const name = localStorage.getItem('user-name') || 'Nune';
    showToast(`Bienvenue ${name} ✨`);
  }, 500);
}

/* ══════════════════════════════════════════
   DAILY SIGNAL
══════════════════════════════════════════ */
function getDailySignal() {
  const today = new Date().toDateString();
  const saved = localStorage.getItem('daily-signal-date');
  if (saved === today) {
    const idx = parseInt(localStorage.getItem('daily-signal-idx') || '0');
    return signals[idx % signals.length];
  }
  const idx = Math.floor(Math.random() * signals.length);
  localStorage.setItem('daily-signal-date', today);
  localStorage.setItem('daily-signal-idx', idx.toString());
  return signals[idx];
}

/* ══════════════════════════════════════════
   STARS CANVAS
══════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('stars-canvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3, alpha: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 0.3 + 0.05, drift: (Math.random() - 0.5) * 0.2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.twinkle += 0.02;
      const a = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,240,${a})`; ctx.fill();
      s.y -= s.speed; s.x += s.drift;
      if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }
      if (s.x < -5) s.x = canvas.width + 5;
      if (s.x > canvas.width + 5) s.x = -5;
    });
    requestAnimationFrame(draw);
  }
  resize(); initStars(); draw();
  window.addEventListener('resize', () => { resize(); initStars(); });
})();

/* ══════════════════════════════════════════
   RING
══════════════════════════════════════════ */
function updateRing() {
  const fill = document.getElementById('ring-fill');
  const progress = Math.min(count / 23, 1);
  fill.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  document.getElementById('count-display').textContent = count;
}

/* ══════════════════════════════════════════
   TYPING — BUG FIX
══════════════════════════════════════════ */
function typeText(text, el, speed = 22) {
  if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }
  el.innerHTML = "";
  let i = 0;
  typingInterval = setInterval(() => {
    el.innerHTML += text[i] === '\n' ? '<br>' : text[i];
    i++;
    if (i >= text.length) { clearInterval(typingInterval); typingInterval = null; }
  }, speed);
}

/* ══════════════════════════════════════════
   TIME / DATE MESSAGES
══════════════════════════════════════════ */
function getTimeMessage() {
  const h = new Date().getHours();
  const name = localStorage.getItem('user-name') || 'Nune';
  if (h < 6)  return { emoji: "🌙", text: `Tu es encore debout… Le signal veille avec toi, ${name}.`, mood: "nuit" };
  if (h < 12) return { emoji: "☀️", text: `Bon matin ${name}. Une belle journée commence.`, mood: "douceur" };
  if (h < 18) return { emoji: "🌤️", text: `Bel après-midi. Le soleil t'a vue, ${name}.`, mood: "lumière" };
  return { emoji: "🌙", text: `Bonne soirée ${name}. Tu mérites une belle nuit.`, mood: "calme" };
}

function getDateMessage() {
  const d = new Date(); const day = d.getDate(), month = d.getMonth() + 1;
  if (day === 23) return { emoji: "🎯", text: "Aujourd'hui c'est le 23. Le signal est au maximum.", mood: "mystère" };
  if (day === 14 && month === 2) return { emoji: "💝", text: "La Saint-Valentin. Tous les signaux convergent vers toi.", mood: "amour" };
  return null;
}

/* ══════════════════════════════════════════
   PARTICLES + CONFETTI
══════════════════════════════════════════ */
const PARTICLES = ["💫", "✨", "🌸", "⭐", "💖", "✦", "🫧", "💛"];
function spawnParticles(x, y) {
  const n = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = PARTICLES[Math.floor(Math.random() * PARTICLES.length)];
      p.style.left = (x + (Math.random() - 0.5) * 80) + 'px';
      p.style.top  = (y + (Math.random() - 0.5) * 40) + 'px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }, i * 60);
  }
}

function spawnConfetti(total = 60) {
  const colors = ['#f06292','#ce93d8','#ffd54f','#80cbc4','#ff8a65','#fff8f5'];
  for (let i = 0; i < total; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetti-piece';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.width  = (6 + Math.random() * 8) + 'px';
      c.style.height = (6 + Math.random() * 8) + 'px';
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      const dur = 2.5 + Math.random() * 2;
      c.style.animationDuration = dur + 's';
      c.style.animationDelay = (Math.random() * 0.8) + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), (dur + 1) * 1000);
    }, i * 20);
  }
}

/* ══════════════════════════════════════════
   RIPPLE + TOAST + VIBRATE
══════════════════════════════════════════ */
function spawnRipple(e, card) {
  const rect = card.getBoundingClientRect();
  const x = (e?.clientX ?? rect.left + rect.width/2) - rect.left;
  const y = (e?.clientY ?? rect.top + rect.height/2) - rect.top;
  const rip = document.createElement('span');
  rip.className = 'ripple';
  rip.style.left = x + 'px'; rip.style.top = y + 'px';
  rip.style.width = rip.style.height = '60px';
  rip.style.marginLeft = rip.style.marginTop = '-30px';
  card.appendChild(rip);
  setTimeout(() => rip.remove(), 800);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function vibrate(pattern = [30]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function setCard(sig) {
  document.getElementById('card-emoji').textContent = sig.emoji;
  typeText(sig.text, document.getElementById('card-text'));
  const tag = document.getElementById('mood-tag');
  tag.textContent = sig.mood;
  tag.classList.add('visible');
}

/* ══════════════════════════════════════════
   HISTORY
══════════════════════════════════════════ */
function getHistory() { try { return JSON.parse(localStorage.getItem('signal-history') || '[]'); } catch { return []; } }
function saveHistory() { localStorage.setItem('signal-history', JSON.stringify(signalHistory)); }
let signalHistory = getHistory();

function addToHistory(sig) {
  signalHistory.unshift({
    emoji: sig.emoji, text: sig.text, mood: sig.mood,
    time: new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  });
  if (signalHistory.length > 50) signalHistory.pop();
  saveHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!signalHistory.length) {
    list.innerHTML = '<div class="history-empty">Aucun signal encore reçu.<br>Commence à taper sur la carte ✦</div>';
    return;
  }
  list.innerHTML = signalHistory.map(s => `
    <div class="history-item">
      <div class="history-emoji">${s.emoji}</div>
      <div class="history-body">
        <div class="history-text">${s.text}</div>
        <div class="history-meta">${s.mood} · ${s.time}</div>
      </div>
    </div>
  `).join('');
}

function clearHistory() { signalHistory = []; saveHistory(); renderHistory(); showToast("Historique effacé 🌙"); }

/* ══════════════════════════════════════════
   TAP
══════════════════════════════════════════ */
function tap(e) {
  count++;
  localStorage.setItem('signal-count', count.toString());
  vibrate([20, 10, 20]);
  updateRing();

  const card = document.getElementById('card');
  if (e) spawnRipple(e, card);
  const rect = card.getBoundingClientRect();
  spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2);

  let sig;
  const dateMsg = getDateMessage();

  if (personalSignals[count]) {
    sig = personalSignals[count];
  } else if (count === 5) {
    sig = getTimeMessage();
  } else if (count === 10 && dateMsg) {
    sig = dateMsg;
  } else if (count === 23) {
    sig = { emoji: "💌", text: "Signal 23 atteint…", mood: "révélation" };
    setTimeout(() => {
      const msg = unlockMessages[Math.floor(Math.random() * unlockMessages.length)];
      document.getElementById('unlock-msg').innerHTML = msg.replace(/\n/g, '<br>');
      const photos = getPhotos();
      const photoContainer = document.getElementById('unlock-photo-container');
      if (photos.length > 0) {
        const surprise = photos[Math.floor(Math.random() * photos.length)];
        document.getElementById('unlock-photo-img').src = surprise.src;
        photoContainer.classList.add('has-photo');
      } else {
        photoContainer.classList.remove('has-photo');
      }
      document.getElementById('unlock-screen').classList.add('active');
      vibrate([50, 30, 50, 30, 100]);
      spawnConfetti(80);
    }, 800);
  } else {
    const pool = signals.filter((_, i) => i !== (count - 2));
    sig = pool[Math.floor(Math.random() * pool.length)];
  }

  if (sig) { setCard(sig); addToHistory(sig); }

  if (!personalSignals[count]) {
    if (count === 7)  showToast("7 signaux… tu es dans le rythme ✨");
    if (count === 11) showToast("Onze. Un nombre oublié, mais pas ce soir.");
    if (count === 17) showToast("17 signaux. Le 23 approche…");
  }
}

function closeUnlock() {
  document.getElementById('unlock-screen').classList.remove('active');
  count = 0;
  localStorage.setItem('signal-count', '0');
  updateRing();
  showToast("Le cycle recommence… 🌙");
}

/* ══════════════════════════════════════════
   SEND (chat)
══════════════════════════════════════════ */
function send() {
  const val = document.getElementById('input').value.trim().toLowerCase();
  if (!val) return;
  vibrate([15]);
  let match = null;
  for (const [pattern, response] of Object.entries(chatResponses)) {
    if (new RegExp(pattern).test(val)) { match = response; break; }
  }
  if (!match) match = { emoji: "🌙", text: "Je reçois ton signal… il voyage.", mood: "écoute" };
  setCard(match);
  addToHistory(match);
  document.getElementById('input').value = "";
}

/* ══════════════════════════════════════════
   AMBIANCES MUSICALES
══════════════════════════════════════════ */
function renderAmbiancePanel() {
  const el = document.getElementById('ambiance-grid');
  if (!el) return;
  el.innerHTML = ambiances.map(a => `
    <button class="ambiance-btn ${currentAmbiance === a.id ? 'playing' : ''}" onclick="playAmbiance('${a.id}')">
      <div class="ambiance-icon">${a.icon}</div>
      <div class="ambiance-name">${a.name}</div>
      <div class="ambiance-sub">${currentAmbiance === a.id ? '▶ en cours' : a.sub}</div>
    </button>
  `).join('');
}

function playAmbiance(id) {
  if (ambianceAudio) { ambianceAudio.pause(); ambianceAudio = null; }
  if (currentAmbiance === id) {
    currentAmbiance = null;
    renderAmbiancePanel();
    updateMusicBars(false);
    return;
  }
  const a = ambiances.find(x => x.id === id);
  if (!a) return;
  ambianceAudio = new Audio(a.src);
  ambianceAudio.loop = true;
  ambianceAudio.volume = 0.35;
  ambianceAudio.play().catch(() => showToast(`Ajoute le fichier ${a.src} 🎵`));
  currentAmbiance = id;
  renderAmbiancePanel();
  updateMusicBars(true);
  showToast(`${a.icon} ${a.name} — en cours`);
}

// Legacy music button still works, plays lofi
function toggleMusic() {
  if (currentAmbiance) {
    playAmbiance(currentAmbiance); // stops it
  } else {
    playAmbiance('lofi');
  }
}

function updateMusicBars(playing) {
  const bars = document.getElementById('music-bars');
  const icon = document.getElementById('music-icon');
  if (playing) { bars.classList.add('playing'); icon.textContent = '⏸'; }
  else { bars.classList.remove('playing'); icon.textContent = '🎵'; }
}

/* ══════════════════════════════════════════
   SECRET MODE
══════════════════════════════════════════ */
function secretMode() {
  secretModeCount++;
  if (secretModeCount === 3) {
    showToast("Mode secret activé 🔮");
    setCard({ emoji: "🔮", text: "Tu as trouvé le signal caché.\nCelui-là, personne ne le voit sauf toi.", mood: "secret" });
    secretModeCount = 0;
  } else {
    showToast(["Un signal…", "Encore un…"][secretModeCount - 1] || "");
  }
}

/* ══════════════════════════════════════════
   TABS
══════════════════════════════════════════ */
// Screens accessible from "Plus" tab — keep "Plus" highlighted when inside them
const MORE_CHILDREN = ['gallery', 'letter', 'countdown', 'history'];

function switchTab(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const screenEl = document.getElementById('screen-' + name);
  if (screenEl) screenEl.classList.add('active');

  // Highlight the right tab
  const tabEl = document.getElementById('tab-' + name);
  if (tabEl) {
    tabEl.classList.add('active');
  } else if (MORE_CHILDREN.includes(name)) {
    // Sub-screens of "Plus" → keep Plus tab highlighted
    document.getElementById('tab-more').classList.add('active');
  }

  if (name === 'history')   renderHistory();
  if (name === 'countdown') renderCountdowns();
  if (name === 'gallery')   renderGallery();
  if (name === 'letter')    renderLetter();
  if (name === 'mood')      renderMoodScreen();
  if (name === 'capsule')   renderCapsules();
  if (name === 'map')       renderMap();
  if (name === 'more')      renderMoreScreen();
}

/* ══════════════════════════════════════════
   MORE SCREEN (ambiances + citations)
══════════════════════════════════════════ */
function renderMoreScreen() {
  renderAmbiancePanel();
  renderCitation();
}

/* ══════════════════════════════════════════
   CITATIONS
══════════════════════════════════════════ */
function renderCitation() {
  const el = document.getElementById('citation-text-el');
  const au = document.getElementById('citation-author-el');
  if (!el) return;
  const c = citations[currentCitationIdx];
  el.style.opacity = '0';
  setTimeout(() => {
    el.innerHTML = c.text;
    au.textContent = c.author;
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '1';
  }, 200);
}

function nextCitation() {
  currentCitationIdx = (currentCitationIdx + 1) % citations.length;
  renderCitation();
}

function getDailyCitation() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return citations[dayOfYear % citations.length];
}

/* ══════════════════════════════════════════
   LETTER SCREEN
══════════════════════════════════════════ */
function renderLetter() {
  const el = document.getElementById('letter-body-text');
  const sal = document.getElementById('letter-salutation');
  const sig = document.getElementById('letter-signature');
  const meta = document.getElementById('letter-meta');
  if (!el) return;
  if (sal) sal.textContent = LETTER.salutation;
  if (sig) sig.textContent = LETTER.signature;
  if (meta) meta.textContent = LETTER.date;
  el.innerHTML = LETTER.body.replace(/\n/g, '<br>');
}

/* ══════════════════════════════════════════
   MOOD TRACKER
══════════════════════════════════════════ */
const MOODS = [
  { emoji: "🌟", label: "rayonnante" },
  { emoji: "😊", label: "bien" },
  { emoji: "😶", label: "neutre" },
  { emoji: "🌧️", label: "mélancolique" },
  { emoji: "💔", label: "difficile" },
];

function getMoods() { try { return JSON.parse(localStorage.getItem('mood-log') || '{}'); } catch { return {}; } }
function saveMoods(data) { localStorage.setItem('mood-log', JSON.stringify(data)); }

function selectMood(emoji) {
  selectedMoodEmoji = emoji;
  document.querySelectorAll('.mood-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === emoji);
  });
}

function saveTodayMood() {
  if (!selectedMoodEmoji) { showToast("Choisis une humeur d'abord ✦"); return; }
  const note = document.getElementById('mood-note')?.value?.trim() || '';
  const today = new Date().toISOString().slice(0, 10);
  const data = getMoods();
  data[today] = { emoji: selectedMoodEmoji, note };
  saveMoods(data);
  showToast("Humeur enregistrée 💖");
  selectedMoodEmoji = null;
  renderMoodScreen();
}

function renderMoodScreen() {
  const data = getMoods();
  const today = new Date().toISOString().slice(0, 10);

  // Today card
  const todayEntry = data[today];
  const moodEl = document.getElementById('mood-today-area');
  if (moodEl) {
    moodEl.innerHTML = `
      <div class="mood-today-label">Comment tu vas aujourd'hui ?</div>
      <div class="mood-emojis">
        ${MOODS.map(m => `
          <button class="mood-btn ${todayEntry?.emoji === m.emoji ? 'selected' : ''}"
            data-emoji="${m.emoji}" onclick="selectMood('${m.emoji}')">${m.emoji}</button>
        `).join('')}
      </div>
      <textarea class="mood-note-input" id="mood-note" placeholder="Un mot sur ta journée…" rows="2">${todayEntry?.note || ''}</textarea>
      <button class="btn-save-mood" onclick="saveTodayMood()">Enregistrer ✦</button>
    `;
  }

  // Last 28 days grid
  const gridEl = document.getElementById('mood-grid');
  if (gridEl) {
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, d, entry: data[key] });
    }
    gridEl.innerHTML = days.map(({ key, d, entry }) => `
      <div class="mood-day-cell ${entry ? 'has-mood' : ''} ${key === today ? 'today' : ''}"
           title="${d.toLocaleDateString('fr-FR', {day:'numeric',month:'short'})}${entry ? ' — '+entry.emoji : ''}">
        <div class="mood-day-emoji">${entry ? entry.emoji : ''}</div>
        <div class="mood-day-date">${d.getDate()}</div>
      </div>
    `).join('');
  }

  // Stats
  const statsEl = document.getElementById('mood-stats');
  if (statsEl) {
    const entries = Object.values(data);
    const total = entries.length;
    // most frequent mood
    const freq = {};
    entries.forEach(e => { freq[e.emoji] = (freq[e.emoji] || 0) + 1; });
    const topEmoji = Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] || '✨';
    // streak
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (data[k]) streak++; else break;
    }
    statsEl.innerHTML = `
      <div class="mood-stat"><div class="mood-stat-val">${total}</div><div class="mood-stat-label">jours notés</div></div>
      <div class="mood-stat"><div class="mood-stat-val">${topEmoji}</div><div class="mood-stat-label">humeur fréquente</div></div>
      <div class="mood-stat"><div class="mood-stat-val">${streak}</div><div class="mood-stat-label">jours de suite</div></div>
    `;
  }
}

/* ══════════════════════════════════════════
   CAPSULE TEMPORELLE
══════════════════════════════════════════ */
function getCapsules() { try { return JSON.parse(localStorage.getItem('capsules') || '[]'); } catch { return []; } }
function saveCapsules(list) { localStorage.setItem('capsules', JSON.stringify(list)); }

function addCapsule() {
  const name    = document.getElementById('cap-name')?.value?.trim();
  const date    = document.getElementById('cap-date')?.value;
  const message = document.getElementById('cap-message')?.value?.trim();
  if (!name || !date || !message) { showToast("Remplis tous les champs ✦"); return; }

  const unlockDate = new Date(date + 'T00:00:00');
  if (unlockDate <= new Date()) { showToast("Choisis une date dans le futur 🌙"); return; }

  const list = getCapsules();
  list.push({ id: Date.now(), name, date, message, created: new Date().toISOString() });
  saveCapsules(list);
  document.getElementById('cap-name').value = '';
  document.getElementById('cap-date').value = '';
  document.getElementById('cap-message').value = '';
  renderCapsules();
  showToast("Capsule scellée 🔒");
  vibrate([20, 10, 20, 10, 40]);
}

function deleteCapsule(id) {
  saveCapsules(getCapsules().filter(c => c.id !== id));
  renderCapsules();
}

function renderCapsules() {
  const list = getCapsules();
  const el = document.getElementById('capsule-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;opacity:0.35;font-style:italic;font-size:14px;padding:30px 0">Aucune capsule encore…<br>Écris un message pour le futur ✦</div>';
    return;
  }

  const now = new Date();
  el.innerHTML = list.map(c => {
    const unlock = new Date(c.date + 'T00:00:00');
    const isUnlocked = now >= unlock;
    const created = new Date(c.created);
    const totalMs = unlock - created;
    const elapsedMs = now - created;
    const progress = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

    const daysLeft = Math.ceil((unlock - now) / 86400000);
    const timeLeftStr = isUnlocked
      ? ''
      : daysLeft === 1 ? 'Demain !' : `${daysLeft} jours restants`;

    return `
      <div class="capsule-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="capsule-top">
          <div class="capsule-icon">${isUnlocked ? '💌' : '🔒'}</div>
          <button class="capsule-delete" onclick="deleteCapsule(${c.id})">✕</button>
        </div>
        <div class="capsule-name">${c.name}</div>
        <div class="capsule-unlock-date">
          ${isUnlocked ? 'Débloquée le ' : 'S\'ouvre le '}
          ${unlock.toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})}
        </div>
        ${!isUnlocked ? `
          <div class="capsule-countdown-bar">
            <div class="capsule-countdown-fill" style="width:${Math.round(progress*100)}%"></div>
          </div>
          <div class="capsule-time-left">${timeLeftStr}</div>
        ` : `
          <div class="capsule-unlocked-badge">✦ Message révélé</div>
          <div class="capsule-message">${c.message}</div>
        `}
      </div>
    `;
  }).join('');

  // Check for newly unlocked capsules (notify once)
  list.forEach(c => {
    const unlock = new Date(c.date + 'T00:00:00');
    const notifiedKey = 'capsule-notified-' + c.id;
    if (now >= unlock && !localStorage.getItem(notifiedKey)) {
      localStorage.setItem(notifiedKey, '1');
      setTimeout(() => {
        showToast(`💌 "${c.name}" s'est débloquée !`);
        spawnConfetti(50);
        vibrate([50, 30, 50, 30, 100]);
      }, 500);
    }
  });
}

/* ══════════════════════════════════════════
   CARTE DES LIEUX
══════════════════════════════════════════ */
const MAP_EMOJIS = ['📍','💖','🌹','⭐','🏡','🎭','☕','✈️','🌊','🌸'];

function getPlaces() { try { return JSON.parse(localStorage.getItem('map-places') || '[]'); } catch { return []; } }
function savePlaces(list) { localStorage.setItem('map-places', JSON.stringify(list)); }

function selectMapEmoji(emoji) {
  selectedMapEmoji = emoji;
  document.querySelectorAll('.map-emoji-opt').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === emoji);
  });
}

function addPlace() {
  const name = document.getElementById('place-name')?.value?.trim();
  const desc = document.getElementById('place-desc')?.value?.trim();
  const x    = parseFloat(document.getElementById('place-x')?.value) || 50;
  const y    = parseFloat(document.getElementById('place-y')?.value) || 50;
  if (!name) { showToast("Donne un nom au lieu ✦"); return; }
  const list = getPlaces();
  list.push({ id: Date.now(), name, desc: desc || '', emoji: selectedMapEmoji, x: Math.min(Math.max(x,5),95), y: Math.min(Math.max(y,5),90) });
  savePlaces(list);
  document.getElementById('place-name').value = '';
  document.getElementById('place-desc').value = '';
  renderMap();
  showToast(`${selectedMapEmoji} ${name} ajouté ✦`);
}

function deletePlace(id) {
  savePlaces(getPlaces().filter(p => p.id !== id));
  renderMap();
}

function renderMap() {
  const places = getPlaces();

  // Render pins on visual map
  const mapVisual = document.getElementById('map-visual');
  if (mapVisual) {
    // Remove old pins
    mapVisual.querySelectorAll('.map-pin').forEach(p => p.remove());
    places.forEach(p => {
      const pin = document.createElement('div');
      pin.className = 'map-pin';
      pin.style.left = p.x + '%';
      pin.style.top  = p.y + '%';
      const colors = ['#f06292','#ce93d8','#ffd54f','#80cbc4','#ff8a65'];
      const color = colors[p.id % colors.length];
      pin.innerHTML = `
        <div class="map-pin-dot" style="background:${color}">
          <div class="map-pin-dot-inner">${p.emoji}</div>
        </div>
        <div class="map-pin-label">${p.name}</div>
      `;
      pin.addEventListener('click', () => pin.classList.toggle('show-label'));
      mapVisual.appendChild(pin);
    });
  }

  // Render list
  const listEl = document.getElementById('map-places-list');
  if (listEl) {
    if (!places.length) {
      listEl.innerHTML = '<div style="text-align:center;opacity:0.35;font-style:italic;font-size:14px;padding:20px 0">Aucun lieu encore…<br>Ajoute vos endroits spéciaux ✦</div>';
      return;
    }
    listEl.innerHTML = places.map(p => `
      <div class="map-place-item">
        <div class="map-place-emoji">${p.emoji}</div>
        <div class="map-place-body">
          <div class="map-place-name">${p.name}</div>
          ${p.desc ? `<div class="map-place-desc">${p.desc}</div>` : ''}
        </div>
        <button class="map-place-delete" onclick="deletePlace(${p.id})">✕</button>
      </div>
    `).join('');
  }

  // Render emoji picker
  const emojiPicker = document.getElementById('map-emoji-picker');
  if (emojiPicker) {
    emojiPicker.innerHTML = MAP_EMOJIS.map(e => `
      <button class="map-emoji-opt ${selectedMapEmoji === e ? 'selected' : ''}"
        data-emoji="${e}" onclick="selectMapEmoji('${e}')">${e}</button>
    `).join('');
  }
}

// Allow tapping the map to set coordinates
function initMapTap() {
  const mapEl = document.getElementById('map-visual');
  if (!mapEl) return;
  mapEl.addEventListener('click', (e) => {
    if (e.target.closest('.map-pin')) return;
    const rect = mapEl.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top)  / rect.height) * 100);
    const xInput = document.getElementById('place-x');
    const yInput = document.getElementById('place-y');
    if (xInput) xInput.value = x;
    if (yInput) yInput.value = y;
    showToast(`Position : ${x}%, ${y}% ✦`);
    // Flash the add button
    const btn = document.getElementById('map-add-btn');
    if (btn) { btn.style.background = 'linear-gradient(135deg, #ffd54f, #f06292)'; setTimeout(() => btn.style.background = '', 800); }
  });
}

/* ══════════════════════════════════════════
   COUNTDOWNS + BIRTHDAY
══════════════════════════════════════════ */
function getCountdowns() { try { return JSON.parse(localStorage.getItem('countdowns') || '[]'); } catch { return []; } }
function saveCountdowns(list) { localStorage.setItem('countdowns', JSON.stringify(list)); }

function addCountdown() {
  const name = document.getElementById('cd-name').value.trim();
  const date = document.getElementById('cd-date').value;
  if (!name || !date) { showToast("Remplis les deux champs ✦"); return; }
  const list = getCountdowns();
  list.push({ id: Date.now(), name, date });
  saveCountdowns(list);
  document.getElementById('cd-name').value = '';
  document.getElementById('cd-date').value = '';
  renderCountdowns();
  showToast("Date ajoutée 🗓");
}

function deleteCountdown(id) {
  saveCountdowns(getCountdowns().filter(c => c.id !== id));
  renderCountdowns();
}

function getTimeLeft(dateStr) {
  const now = new Date();
  const target = new Date(dateStr + 'T00:00:00');
  const diff = target - now;
  if (diff < 0) return null;
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000) / 60000),
    secs:  Math.floor((diff % 60000) / 1000)
  };
}

function checkTodayDates() {
  const list = getCountdowns();
  const today = new Date();
  const todayMD = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const match = list.find(c => {
    if (!c.date) return false;
    const parts = c.date.split('-');
    return parts.length === 3 && `${parts[1]}-${parts[2]}` === todayMD;
  });
  if (!match) return;
  const shownKey = 'birthday-banner-shown';
  if (localStorage.getItem(shownKey) === today.toDateString()) return;
  localStorage.setItem(shownKey, today.toDateString());
  const banner = document.getElementById('birthday-banner');
  const bannerText = document.getElementById('birthday-banner-text');
  bannerText.textContent = `✦ Aujourd'hui c'est ${match.name} ✦`;
  banner.classList.add('show');
  spawnConfetti(70);
  vibrate([50, 30, 50, 30, 100, 30, 100]);
  showToast(`${match.name} — c'est aujourd'hui ! 🎉`);
}

function closeBirthdayBanner() { document.getElementById('birthday-banner').classList.remove('show'); }

function renderCountdowns() {
  const list = getCountdowns();
  const el = document.getElementById('countdown-list');
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;opacity:0.35;font-style:italic;font-size:14px;padding:30px 0">Aucune date encore…<br>Ajoute un moment important ✦</div>';
    return;
  }
  const today = new Date();
  const todayMD = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  el.innerHTML = list.map(c => {
    const tl = getTimeLeft(c.date);
    const parts = c.date?.split('-') || [];
    const isToday = parts.length === 3 && `${parts[1]}-${parts[2]}` === todayMD;
    if (!tl) {
      return `<div class="countdown-card">
        <div class="countdown-card-top"><div class="countdown-name">${c.name}</div>
        <button class="countdown-delete" onclick="deleteCountdown(${c.id})">✕</button></div>
        ${isToday ? `<div class="countdown-celebrate">🎉 C'est aujourd'hui ! 🎉</div>` : `<div class="countdown-past">Ce moment est passé ✨</div>`}
      </div>`;
    }
    return `<div class="countdown-card" data-id="${c.id}">
      <div class="countdown-card-top"><div class="countdown-name">${c.name}</div>
      <button class="countdown-delete" onclick="deleteCountdown(${c.id})">✕</button></div>
      <div class="countdown-units">
        <div class="cd-unit"><div class="cd-num" id="cd-d-${c.id}">${tl.days}</div><div class="cd-label">jours</div></div>
        <div class="cd-unit"><div class="cd-num" id="cd-h-${c.id}">${String(tl.hours).padStart(2,'0')}</div><div class="cd-label">heures</div></div>
        <div class="cd-unit"><div class="cd-num" id="cd-m-${c.id}">${String(tl.mins).padStart(2,'0')}</div><div class="cd-label">min</div></div>
        <div class="cd-unit"><div class="cd-num" id="cd-s-${c.id}">${String(tl.secs).padStart(2,'0')}</div><div class="cd-label">sec</div></div>
      </div>
      ${tl.days === 0 ? `<div class="countdown-celebrate">🎉 C'est aujourd'hui !</div>` : ''}
    </div>`;
  }).join('');
}

setInterval(() => {
  getCountdowns().forEach(c => {
    const tl = getTimeLeft(c.date);
    if (!tl) return;
    const ds = document.getElementById('cd-d-' + c.id);
    const hs = document.getElementById('cd-h-' + c.id);
    const ms = document.getElementById('cd-m-' + c.id);
    const ss = document.getElementById('cd-s-' + c.id);
    if (ds) ds.textContent = tl.days;
    if (hs) hs.textContent = String(tl.hours).padStart(2,'0');
    if (ms) ms.textContent = String(tl.mins).padStart(2,'0');
    if (ss) ss.textContent = String(tl.secs).padStart(2,'0');
  });
}, 1000);

/* ══════════════════════════════════════════
   GALLERY
══════════════════════════════════════════ */
function getPhotos() { try { return JSON.parse(localStorage.getItem('gallery-photos') || '[]'); } catch { return []; } }
function savePhotos(list) { localStorage.setItem('gallery-photos', JSON.stringify(list)); }

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const caption = document.getElementById('photo-caption').value.trim() || '';
    const photos = getPhotos();
    photos.push({ id: Date.now(), src: e.target.result, caption });
    savePhotos(photos);
    document.getElementById('photo-caption').value = '';
    event.target.value = '';
    renderGallery();
    showToast("Photo ajoutée 🌸");
  };
  reader.readAsDataURL(file);
}

function deletePhoto(id) { savePhotos(getPhotos().filter(p => p.id !== id)); renderGallery(); }

function openLightbox(src, caption) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-caption').textContent = caption || '';
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }

function renderGallery() {
  const photos = getPhotos();
  const grid = document.getElementById('gallery-grid');
  let html = '';
  if (!photos.length) {
    html += '<div class="gallery-empty">Aucune photo encore…<br>Ajoute vos souvenirs ici ✦</div>';
  } else {
    html += photos.map(p => `
      <div class="gallery-item" onclick="openLightbox('${p.src.replace(/'/g,"\\'")}', '${(p.caption||'').replace(/'/g,"\\'")}')">
        <img src="${p.src}" alt="${p.caption || ''}">
        <div class="gallery-caption">${p.caption || ''}</div>
        <button class="gallery-delete" onclick="event.stopPropagation();deletePhoto(${p.id})">✕</button>
      </div>
    `).join('');
  }
  if (count < 23) html += `<div class="surprise-lock"><span>🔒</span> Photo surprise au signal 23</div>`;
  grid.innerHTML = html;
}

/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */
function requestNotifPermission() {
  if (!('Notification' in window)) { showToast("Notifications non supportées 🙁"); return; }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      localStorage.setItem('notif-granted', '1');
      document.getElementById('notif-banner').classList.remove('show');
      showToast("Notifications activées 💌");
      scheduleNotifications();
    } else { showToast("Permission refusée 🙁"); }
  });
}

function scheduleNotifications() {
  if (Notification.permission !== 'granted') return;
  const name = localStorage.getItem('user-name') || 'Nune';
  const messages = [
    `Je pense à toi. ✦`,
    `Un signal t'attend, ${name}. 💫`,
    `Le 23 se souvient de toi. 🌙`,
    `Quelqu'un t'envoie de la douceur. 💖`,
    `Bonne journée ${name}. ✨`,
  ];
  const lastNotif = localStorage.getItem('last-notif-day');
  const today = new Date().toDateString();
  if (lastNotif !== today) {
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification("Twenty Three 💌", {
          body: messages[Math.floor(Math.random() * messages.length)],
          icon: "logo.svg",
        });
        localStorage.setItem('last-notif-day', today);
      }
    }, 3 * 60 * 60 * 1000);
  }
}

/* ══════════════════════════════════════════
   DAILY BADGE
══════════════════════════════════════════ */
function initDailyBadge() {
  const sig = getDailySignal();
  const badge = document.getElementById('daily-badge');
  document.getElementById('daily-badge-text').textContent = 'Signal du jour : ' + sig.mood;
  badge.classList.add('show');
  badge.onclick = () => { setCard(sig); addToHistory(sig); showToast("Signal du jour ✦"); vibrate([20]); };
}

function checkNotifBanner() {
  if (!('Notification' in window)) return;
  if (localStorage.getItem('notif-granted')) return;
  if (Notification.permission === 'default') document.getElementById('notif-banner').classList.add('show');
}

/* ══════════════════════════════════════════
   PWA
══════════════════════════════════════════ */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
updateRing();
initDailyBadge();
checkNotifBanner();
checkTodayDates();
initMapTap();
// Set daily citation index
currentCitationIdx = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) % citations.length;

if (localStorage.getItem('notif-granted') && Notification.permission === 'granted') {
  scheduleNotifications();
}

// Onboarding — slight delay so the app renders first
setTimeout(checkOnboarding, 300);

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
let currentCitationIdx = 0;
const CIRCUMFERENCE = 2 * Math.PI * 22;

/* ════════════════════════════════════════
   SWIPE NAVIGATION SYSTEM
════════════════════════════════════════ */
const TABS = ['home', 'more'];
let currentTabIndex = 0;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeDeltaX = 0;
let isSwiping = false;
let swipeBlocked = false; // blocked when subscreen is open

const wrapper = () => document.getElementById('swipe-wrapper');

function getSwipeOffset() {
  return -currentTabIndex * 100; // vw
}

function applySwipeOffset(extraPx = 0) {
  const base = getSwipeOffset();
  const w = wrapper();
  if (!w) return;
  w.style.transform = `translateX(calc(${base}vw + ${extraPx}px))`;
}

function switchTab(name, idx) {
  // If a subscreen is open, don't switch
  if (document.querySelector('.screen.subscreen.slide-in')) return;

  currentTabIndex = idx;
  const w = wrapper();
  if (!w) return;
  w.classList.remove('swiping');
  w.style.transform = `translateX(${getSwipeOffset()}vw)`;

  // Update nav active state
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + name);
  if (tabEl) tabEl.classList.add('active');

  // Update dots
  document.querySelectorAll('.swipe-dot').forEach((d, i) => {
    d.classList.toggle('active', i === currentTabIndex);
  });

  // Trigger screen-specific logic
  if (name === 'more') renderMoreScreen();

  // Haptic
  if (navigator.vibrate) navigator.vibrate(8);
}

// Touch swipe handling
function initSwipe() {
  const w = wrapper();
  if (!w) return;

  w.addEventListener('touchstart', (e) => {
    if (document.querySelector('.screen.subscreen.slide-in')) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeDeltaX = 0;
    isSwiping = false;
    swipeBlocked = false;
  }, { passive: true });

  w.addEventListener('touchmove', (e) => {
    if (document.querySelector('.screen.subscreen.slide-in')) return;
    if (swipeBlocked) return;

    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;

    // If first move is more vertical than horizontal, block horizontal swipe
    if (!isSwiping && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      swipeBlocked = true;
      return;
    }

    if (!isSwiping && Math.abs(dx) > 8) {
      isSwiping = true;
      w.classList.add('swiping');
    }

    if (!isSwiping) return;

    swipeDeltaX = dx;

    // Resist at edges
    let delta = dx;
    if ((currentTabIndex === 0 && dx > 0) || (currentTabIndex === TABS.length - 1 && dx < 0)) {
      delta = dx * 0.2;
    }

    applySwipeOffset(delta);
  }, { passive: true });

  w.addEventListener('touchend', () => {
    if (!isSwiping) return;
    w.classList.remove('swiping');

    const threshold = window.innerWidth * 0.25;
    if (swipeDeltaX < -threshold && currentTabIndex < TABS.length - 1) {
      switchTab(TABS[currentTabIndex + 1], currentTabIndex + 1);
    } else if (swipeDeltaX > threshold && currentTabIndex > 0) {
      switchTab(TABS[currentTabIndex - 1], currentTabIndex - 1);
    } else {
      // Snap back
      applySwipeOffset(0);
      setTimeout(() => w.classList.remove('swiping'), 0);
    }
    isSwiping = false;
    swipeDeltaX = 0;
  }, { passive: true });
}

/* ════════════════════════════════════════
   SUBSCREEN PUSH NAVIGATION
════════════════════════════════════════ */
let navigationStack = [];

function pushScreen(name) {
  const w = wrapper();

  if (w) {
    // Store current swipe offset to keep it when pushing back
    w.dataset.swipeIdx = currentTabIndex;
    w.classList.add('push-back');
    w.style.setProperty('--swipe-offset', `${getSwipeOffset()}vw`);
    w.style.transform = `translateX(calc(${getSwipeOffset()}vw - 28px)) scale(0.97)`;
    w.style.opacity = '0.65';
    w.style.transition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.32s ease';
    w.style.pointerEvents = 'none';
  }

  navigationStack.push(name);

  const screenEl = document.getElementById('screen-' + name);
  if (!screenEl) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      screenEl.classList.add('slide-in');
    });
  });

  document.getElementById('nav-main').classList.add('hidden');

  if (name === 'history')   renderHistory();
  if (name === 'countdown') renderCountdowns();
  if (name === 'gallery')   renderGallery();
  if (name === 'letter')    renderLetter();

  if (navigator.vibrate) navigator.vibrate(8);
}

function goBack() {
  const currentSubscreen = document.querySelector('.screen.subscreen.slide-in');
  if (!currentSubscreen) return;

  currentSubscreen.classList.remove('slide-in');
  navigationStack.pop();

  if (navigationStack.length === 0) {
    const w = wrapper();
    if (w) {
      w.style.transform = `translateX(${getSwipeOffset()}vw)`;
      w.style.opacity = '';
      w.style.pointerEvents = '';
      w.classList.remove('push-back');
      setTimeout(() => { w.style.transition = ''; }, 350);
    }
    document.getElementById('nav-main').classList.remove('hidden');
  }

  if (navigator.vibrate) navigator.vibrate(8);
}

// Hardware back button (Android)
window.addEventListener('popstate', () => {
  if (navigationStack.length > 0) {
    goBack();
  }
});

// Push dummy state so we can intercept the back button
function pushHistoryState() {
  history.pushState({ app: '23signals' }, '');
}

/* ════════════════════════════════════════
   SIGNALS
════════════════════════════════════════ */
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

const LETTER = {
  salutation: "Nune,",
  body: `Il y a des choses qu'on ne dit pas facilement.\nPas parce qu'elles ne sont pas vraies,\nmais parce qu'elles sont trop vraies.\n\nJ'ai construit ces signaux pour toi.\nChaque tap, chaque message — c'est moi qui pense à toi\ndans le silence de quelque chose que les mots n'atteignent pas tout à fait.\n\nTu mérites d'être vue.\nTu mérites d'être choisie.\nTu mérites que quelqu'un remarque\nles petits détails qui font que tu es toi.\n\nAlors voilà.\nJe les remarque.`,
  signature: "— toujours, quelqu'un qui fait attention ✦",
  date: "Pour toi, pour toujours."
};

const ambiances = [
  { id: "lofi",   icon: "🌙", name: "Lo-fi",   sub: "doux & calme",  src: "lo-fi.mp3" },
  { id: "piano",  icon: "🎹", name: "Piano",   sub: "mélancolique",  src: "piano.mp3" },
  { id: "rain",   icon: "🌧️", name: "Pluie",   sub: "cocooning",     src: "rain.mp3" },
  { id: "cafe",   icon: "☕", name: "Café",    sub: "chaleureux",    src: "cafe.mp3" },
];

/* ════════════════════════════════════════
   ONBOARDING
════════════════════════════════════════ */
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
    text: "Photos, dates importantes, musique…\nTout est là, rien ne disparaît."
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

  document.querySelectorAll('.onboarding-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

function nextOnboardingStep() {
  if (onboardingStep === ONBOARDING_STEPS.length - 1) {
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

/* ════════════════════════════════════════
   DAILY SIGNAL
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   STARS CANVAS
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   RING
════════════════════════════════════════ */
function updateRing() {
  const fill = document.getElementById('ring-fill');
  const progress = Math.min(count / 23, 1);
  fill.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  document.getElementById('count-display').textContent = count;
}

/* ════════════════════════════════════════
   TYPING
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   TIME / DATE MESSAGES
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   PARTICLES + CONFETTI
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   RIPPLE + TOAST + VIBRATE
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   HISTORY
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   TAP
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   SEND (chat)
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   AMBIANCES MUSICALES
════════════════════════════════════════ */
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
  const htmlAudio = document.getElementById('music');
  if (htmlAudio) htmlAudio.pause();

  if (currentAmbiance === id) {
    currentAmbiance = null;
    renderAmbiancePanel();
    updateMusicBars(false);
    return;
  }

  const a = ambiances.find(x => x.id === id);
  if (!a) return;

  if (id === 'lofi' && htmlAudio) {
    htmlAudio.volume = 0.35;
    htmlAudio.play().catch(() => showToast(`Ajoute le fichier ${a.src} 🎵`));
    ambianceAudio = null;
  } else {
    ambianceAudio = new Audio(a.src);
    ambianceAudio.loop = true;
    ambianceAudio.volume = 0.35;
    ambianceAudio.play().catch(() => showToast(`Ajoute le fichier ${a.src} 🎵`));
  }

  currentAmbiance = id;
  renderAmbiancePanel();
  updateMusicBars(true);
  showToast(`${a.icon} ${a.name} — en cours`);
}

function toggleMusic() {
  const htmlAudio = document.getElementById('music');
  if (currentAmbiance === 'lofi' || (htmlAudio && !htmlAudio.paused)) {
    if (htmlAudio) htmlAudio.pause();
    if (ambianceAudio) { ambianceAudio.pause(); ambianceAudio = null; }
    currentAmbiance = null;
    updateMusicBars(false);
    renderAmbiancePanel();
  } else {
    playAmbiance('lofi');
  }
}

function updateMusicBars(playing) {
  const bars = document.getElementById('music-bars');
  const icon = document.getElementById('music-icon');
  if (bars) { if (playing) bars.classList.add('playing'); else bars.classList.remove('playing'); }
  if (icon) icon.textContent = playing ? '⏸' : '🎵';
}

/* ════════════════════════════════════════
   SECRET MODE
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   MORE SCREEN
════════════════════════════════════════ */
function renderMoreScreen() {
  renderAmbiancePanel();
  renderCitation();
}

/* ════════════════════════════════════════
   CITATIONS
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   LETTER SCREEN
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   COUNTDOWNS + BIRTHDAY
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   GALLERY
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   DAILY BADGE
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   PWA
════════════════════════════════════════ */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
updateRing();
initDailyBadge();
checkNotifBanner();
checkTodayDates();
currentCitationIdx = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) % citations.length;

if (localStorage.getItem('notif-granted') && Notification.permission === 'granted') {
  scheduleNotifications();
}

// Init swipe system
initSwipe();

// Push initial history state for back button support
pushHistoryState();

setTimeout(checkOnboarding, 300);

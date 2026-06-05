/* ══════════════════════════════════════════
   app.js — Twenty Three · Signaux pour Nune
   ══════════════════════════════════════════ */

/* ── STATE ── */
let count = parseInt(localStorage.getItem('signal-count') || '0');
let musicPlaying = false;
let secretModeCount = 0;
let typingInterval = null; // FIX: track active typing animation
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
// → COMMENT PERSONNALISER :
// Remplace les textes ci-dessus par vos vrais souvenirs, blagues internes, surnoms.
// Tu peux changer les numéros (3, 7, 11...) pour n'importe quel signal de 1 à 22.

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
   LETTRE INTIME
   → Personnalise ici le texte de la lettre
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
// → Remplace le texte entre les backticks par ta vraie lettre.

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
   TYPING — BUG FIX: cancels previous interval
══════════════════════════════════════════ */
function typeText(text, el, speed = 22) {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  el.innerHTML = "";
  let i = 0;
  typingInterval = setInterval(() => {
    el.innerHTML += text[i] === '\n' ? '<br>' : text[i];
    i++;
    if (i >= text.length) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  }, speed);
}

/* ══════════════════════════════════════════
   TIME / DATE MESSAGES
══════════════════════════════════════════ */
function getTimeMessage() {
  const h = new Date().getHours();
  if (h < 6)  return { emoji: "🌙", text: "Tu es encore debout… Le signal veille avec toi.", mood: "nuit" };
  if (h < 12) return { emoji: "☀️", text: "Bon matin Nune. Une belle journée commence.", mood: "douceur" };
  if (h < 18) return { emoji: "🌤️", text: "Bel après-midi. Le soleil t'a vue.", mood: "lumière" };
  return { emoji: "🌙", text: "Bonne soirée Nune. Tu mérites une belle nuit.", mood: "calme" };
}

function getDateMessage() {
  const d = new Date(); const day = d.getDate(), month = d.getMonth() + 1;
  if (day === 23) return { emoji: "🎯", text: "Aujourd'hui c'est le 23. Le signal est au maximum.", mood: "mystère" };
  if (day === 14 && month === 2) return { emoji: "💝", text: "La Saint-Valentin. Tous les signaux convergent vers toi.", mood: "amour" };
  return null;
}

/* ══════════════════════════════════════════
   PARTICLES
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

/* ══════════════════════════════════════════
   CONFETTI — pour les anniversaires
══════════════════════════════════════════ */
function spawnConfetti(count = 60) {
  const colors = ['#f06292','#ce93d8','#ffd54f','#80cbc4','#ff8a65','#fff8f5'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetti-piece';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.top = '-10px';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.width = (6 + Math.random() * 8) + 'px';
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
   RIPPLE
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

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════
   SET CARD
══════════════════════════════════════════ */
function setCard(sig) {
  document.getElementById('card-emoji').textContent = sig.emoji;
  typeText(sig.text, document.getElementById('card-text'));
  const tag = document.getElementById('mood-tag');
  tag.textContent = sig.mood;
  tag.classList.add('visible');
}

/* ══════════════════════════════════════════
   VIBRATE
══════════════════════════════════════════ */
function vibrate(pattern = [30]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ══════════════════════════════════════════
   HISTORY
══════════════════════════════════════════ */
function getHistory() {
  try { return JSON.parse(localStorage.getItem('signal-history') || '[]'); } catch { return []; }
}
function saveHistory() {
  localStorage.setItem('signal-history', JSON.stringify(signalHistory));
}
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

function clearHistory() {
  signalHistory = [];
  saveHistory();
  renderHistory();
  showToast("Historique effacé 🌙");
}

/* ══════════════════════════════════════════
   TAP — avec messages personnalisés
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

  // Messages personnalisés cachés en priorité
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

  if (sig) {
    setCard(sig);
    addToHistory(sig);
  }

  // Toasts milestones (seulement si pas de message perso)
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
   SEND (chat input)
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
   MUSIC
══════════════════════════════════════════ */
function toggleMusic() {
  const m = document.getElementById('music');
  const bars = document.getElementById('music-bars');
  m.volume = 0.35;
  if (m.paused) {
    m.play().catch(() => showToast("Ajoute un fichier lo-fi.mp3 🎵"));
    musicPlaying = true;
    bars.classList.add('playing');
    document.getElementById('music-icon').textContent = '⏸';
  } else {
    m.pause();
    musicPlaying = false;
    bars.classList.remove('playing');
    document.getElementById('music-icon').textContent = '🎵';
  }
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
function switchTab(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'history')  renderHistory();
  if (name === 'countdown') renderCountdowns();
  if (name === 'gallery')  renderGallery();
  if (name === 'letter')   renderLetter();
}

/* ══════════════════════════════════════════
   LETTER SCREEN
══════════════════════════════════════════ */
function renderLetter() {
  const el = document.getElementById('letter-body-text');
  if (!el) return;
  // Show immediately (no typeText, it's a letter to read not a card to tap)
  el.innerHTML = LETTER.body.replace(/\n/g, '<br>');
}

/* ══════════════════════════════════════════
   COUNTDOWNS + BIRTHDAY DETECTION
══════════════════════════════════════════ */
function getCountdowns() {
  try { return JSON.parse(localStorage.getItem('countdowns') || '[]'); } catch { return []; }
}
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
  const list = getCountdowns().filter(c => c.id !== id);
  saveCountdowns(list);
  renderCountdowns();
}

function getTimeLeft(dateStr) {
  const now = new Date();
  const target = new Date(dateStr + 'T00:00:00');
  const diff = target - now;
  if (diff < 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

// Check if any countdown is TODAY → show birthday banner + confetti
function checkTodayDates() {
  const list = getCountdowns();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Also check month-day match (anniversary repeats every year)
  const todayMD = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const match = list.find(c => {
    if (!c.date) return false;
    // exact date match
    if (c.date === todayStr) return true;
    // monthly/day anniversary match (ignore year)
    const parts = c.date.split('-');
    if (parts.length === 3) {
      const md = `${parts[1]}-${parts[2]}`;
      return md === todayMD;
    }
    return false;
  });

  if (!match) return;

  // Don't show banner more than once per day
  const shownKey = 'birthday-banner-shown';
  const shownToday = localStorage.getItem(shownKey) === today.toDateString();
  if (shownToday) return;

  localStorage.setItem(shownKey, today.toDateString());

  const banner = document.getElementById('birthday-banner');
  const bannerText = document.getElementById('birthday-banner-text');
  bannerText.textContent = `✦ Aujourd'hui c'est ${match.name} ✦`;
  banner.classList.add('show');
  spawnConfetti(70);
  vibrate([50, 30, 50, 30, 100, 30, 100]);
  showToast(`${match.name} — c'est aujourd'hui ! 🎉`);
}

function closeBirthdayBanner() {
  document.getElementById('birthday-banner').classList.remove('show');
}

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

    // Check if today (for celebrate badge)
    let isToday = false;
    if (c.date) {
      const parts = c.date.split('-');
      if (parts.length === 3) {
        const md = `${parts[1]}-${parts[2]}`;
        isToday = (md === todayMD);
      }
    }

    if (!tl) {
      return `<div class="countdown-card">
        <div class="countdown-card-top">
          <div class="countdown-name">${c.name}</div>
          <button class="countdown-delete" onclick="deleteCountdown(${c.id})">✕</button>
        </div>
        ${isToday
          ? `<div class="countdown-celebrate">🎉 C'est aujourd'hui ! 🎉</div>`
          : `<div class="countdown-past">Ce moment est passé ✨</div>`}
      </div>`;
    }

    const todayCelebrate = tl.days === 0 ? `<div class="countdown-celebrate">🎉 C'est aujourd'hui !</div>` : '';

    return `<div class="countdown-card" data-id="${c.id}">
      <div class="countdown-card-top">
        <div class="countdown-name">${c.name}</div>
        <button class="countdown-delete" onclick="deleteCountdown(${c.id})">✕</button>
      </div>
      <div class="countdown-units">
        <div class="cd-unit"><div class="cd-num" id="cd-d-${c.id}">${tl.days}</div><div class="cd-label">jours</div></div>
        <div class="cd-unit"><div class="cd-num" id="cd-h-${c.id}">${String(tl.hours).padStart(2,'0')}</div><div class="cd-label">heures</div></div>
        <div class="cd-unit"><div class="cd-num" id="cd-m-${c.id}">${String(tl.mins).padStart(2,'0')}</div><div class="cd-label">min</div></div>
        <div class="cd-unit"><div class="cd-num" id="cd-s-${c.id}">${String(tl.secs).padStart(2,'0')}</div><div class="cd-label">sec</div></div>
      </div>
      ${todayCelebrate}
    </div>`;
  }).join('');
}

// Live countdown tick
setInterval(() => {
  const list = getCountdowns();
  list.forEach(c => {
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
function getPhotos() {
  try { return JSON.parse(localStorage.getItem('gallery-photos') || '[]'); } catch { return []; }
}
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

function deletePhoto(id) {
  const photos = getPhotos().filter(p => p.id !== id);
  savePhotos(photos);
  renderGallery();
}

function openLightbox(src, caption) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-caption').textContent = caption || '';
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

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
  if (count < 23) {
    html += `<div class="surprise-lock"><span>🔒</span> Photo surprise au signal 23</div>`;
  }
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
    } else {
      showToast("Permission refusée 🙁");
    }
  });
}

function scheduleNotifications() {
  if (Notification.permission !== 'granted') return;
  const messages = [
    "Je pense à toi. ✦",
    "Un signal t'attend. 💫",
    "Le 23 se souvient de toi. 🌙",
    "Quelqu'un t'envoie de la douceur. 💖",
    "Bonne journée Nune. ✨",
  ];
  const lastNotif = localStorage.getItem('last-notif-day');
  const today = new Date().toDateString();
  if (lastNotif !== today) {
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification("Twenty Three 💌", {
          body: messages[Math.floor(Math.random() * messages.length)],
          icon: "https://cdn-icons-png.flaticon.com/512/833/833472.png",
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
  badge.onclick = () => {
    setCard(sig);
    addToHistory(sig);
    showToast("Signal du jour ✦");
    vibrate([20]);
  };
}

/* ══════════════════════════════════════════
   NOTIF BANNER
══════════════════════════════════════════ */
function checkNotifBanner() {
  if (!('Notification' in window)) return;
  if (localStorage.getItem('notif-granted')) return;
  if (Notification.permission === 'default') {
    document.getElementById('notif-banner').classList.add('show');
  }
}

/* ══════════════════════════════════════════
   PWA
══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
updateRing();
initDailyBadge();
checkNotifBanner();
checkTodayDates(); // ← check anniversaires au lancement
if (localStorage.getItem('notif-granted') && Notification.permission === 'granted') {
  scheduleNotifications();
}

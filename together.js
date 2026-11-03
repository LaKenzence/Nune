/* ══════════════════════════════════════════
   together.js — se sentir proches malgré la distance
   - Bisou à distance : appui long sur ✦ dans le chat   (kisses/{id})
   - Distance + mini-carte : position approximative (~10 km),
     seulement si on l'active                          (presence/{profil})
   - Météo chez l'autre (Open-Meteo, sans clé)
   - « Ensemble depuis… » / « dernier câlin »          (couple/info)
   ══════════════════════════════════════════ */
(function () {
  const LOCATION_REFRESH = 3 * 3600 * 1000;
  const WEATHER_REFRESH  = 30 * 60 * 1000;

  let otherPresence = null;
  let couple = {};
  let weather = null;     // { temp, code, at }

  /* ════════ BISOU ════════ */
  let kissTimer = null;
  let suppressClick = false;

  async function sendKiss() {
    suppressClick = true;
    vibrate([60, 60, 60, 200]);
    Nune.burst(['💋', '❤️', '💕'], 16);
    showToast(`Bisou envoyé à ${Nune.otherName()} 💋`);
    try { await Nune.add('kisses', {}); }
    catch (e) { showToast("Le bisou n'est pas parti 🙁"); }
  }

  function setupKissButton() {
    const btn = document.getElementById('shared-signal-btn');
    if (!btn) return;
    btn.title = 'je pense à toi · appui long : bisou 💋';
    const start = (e) => {
      if (e.button > 0) return;
      clearTimeout(kissTimer);
      btn.classList.add('pressing');
      kissTimer = setTimeout(() => { btn.classList.remove('pressing'); sendKiss(); }, 550);
    };
    const cancel = () => { clearTimeout(kissTimer); btn.classList.remove('pressing'); };
    btn.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    // Après un appui long, le clic « je pense à toi » ne doit pas partir aussi
    document.addEventListener('click', (e) => {
      if (suppressClick && e.target.closest('#shared-signal-btn')) {
        e.stopPropagation();
        e.preventDefault();
        suppressClick = false;
      }
    }, true);

    // Petite astuce la première fois qu'on ouvre le chat
    window.addEventListener('nune:chat-opened', () => {
      if (localStorage.getItem('kiss-hint')) return;
      localStorage.setItem('kiss-hint', '1');
      setTimeout(() => showToast('Astuce : appui long sur ✦ pour envoyer un bisou 💋'), 800);
    });
  }

  function onKisses(docs, changes, first) {
    if (first) return;
    changes.forEach(c => {
      const k = c.doc.data();
      if (c.type !== 'added' || k.from === Nune.me()) return;
      Nune.burst(['💋', '❤️', '💕', '😘'], 24);
      vibrate([80, 80, 80, 300, 80, 80, 80, 300]);
      Nune.notify(`😘 ${Nune.nameOf(k.from)} t'envoie un bisou`);
    });
  }

  /* ════════ POSITION & DISTANCE ════════ */
  const sharing = () => localStorage.getItem('share-location') === '1';
  const myLoc = () => { try { return JSON.parse(localStorage.getItem('my-loc') || 'null'); } catch { return null; } };

  function updateMyLocation(force = false) {
    if (!sharing() || !navigator.geolocation) return;
    const last = myLoc();
    if (!force && last && Date.now() - last.at < LOCATION_REFRESH) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      // Arrondi à ~10 km : assez pour la distance et la météo, pas plus
      const loc = {
        lat: Math.round(pos.coords.latitude * 10) / 10,
        lng: Math.round(pos.coords.longitude * 10) / 10,
        at: Date.now(),
      };
      localStorage.setItem('my-loc', JSON.stringify(loc));
      const { db, doc, setDoc, serverTimestamp } = window._fb;
      setDoc(doc(db, 'presence', Nune.me()), { lat: loc.lat, lng: loc.lng, locAt: serverTimestamp() }, { merge: true })
        .catch(() => {});
      refresh();
    }, (err) => {
      if (force) showToast(err.code === 1 ? 'Position refusée — active-la dans les réglages 📍' : 'Position introuvable pour le moment 📍');
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 30 * 60 * 1000 });
  }

  function toggleSharing() {
    if (sharing()) {
      localStorage.setItem('share-location', '0');
      localStorage.removeItem('my-loc');
      const { db, doc, setDoc } = window._fb;
      setDoc(doc(db, 'presence', Nune.me()), { lat: null, lng: null }, { merge: true }).catch(() => {});
      showToast('Position plus partagée 📍');
      refresh();
    } else {
      localStorage.setItem('share-location', '1');
      updateMyLocation(true);
      showToast('Position approximative partagée (~10 km) 📍');
    }
  }

  function distanceKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  function theirLoc() {
    return otherPresence && typeof otherPresence.lat === 'number' ? { lat: otherPresence.lat, lng: otherPresence.lng } : null;
  }

  function currentDistance() {
    const a = myLoc(), b = theirLoc();
    return a && b ? distanceKm(a, b) : null;
  }

  /* Mini-carte : projection simple, une grille, deux points et un arc */
  function mapSvg(a, b) {
    const W = 320, H = 170;
    const px = (p) => [((p.lng + 180) / 360) * W, ((90 - p.lat) / 180) * H];
    // Recadre autour des deux points pour que l'arc soit lisible
    const pts = [a, b].filter(Boolean).map(px);
    let vb = `0 0 ${W} ${H}`;
    if (pts.length === 2) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const pad = Math.max(30, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.6;
      const x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad);
      const w = Math.min(W - x0, Math.max(...xs) - Math.min(...xs) + pad * 2);
      const h = Math.min(H - y0, Math.max(...ys) - Math.min(...ys) + pad * 2);
      const side = Math.max(w, h * W / H);
      vb = `${x0} ${y0} ${side} ${side * H / W}`;
    }
    const grid = [];
    for (let x = 0; x <= W; x += 10) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
    for (let y = 0; y <= H; y += 10) grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
    let arc = '';
    if (pts.length === 2) {
      const [[x1, y1], [x2, y2]] = pts;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.35;
      arc = `<path class="map-arc" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`;
    }
    const dot = (p, cls) => p ? `<circle class="map-dot ${cls}" cx="${px(p)[0]}" cy="${px(p)[1]}" r="2.2"/>` : '';
    return `<svg class="nous-map" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g class="map-grid">${grid.join('')}</g>${arc}${dot(a, 'me')}${dot(b, 'them')}</svg>`;
  }

  /* ════════ MÉTÉO ════════ */
  const WEATHER_ICONS = [
    [0, '☀️', 'grand soleil'], [2, '🌤', 'peu nuageux'], [3, '☁️', 'nuageux'], [48, '🌫', 'brouillard'],
    [57, '🌦', 'bruine'], [67, '🌧', 'pluie'], [77, '❄️', 'neige'], [82, '🌧', 'averses'],
    [86, '🌨', 'averses de neige'], [99, '⛈', 'orage'],
  ];
  const weatherInfo = (code) => WEATHER_ICONS.find(([max]) => code <= max) || WEATHER_ICONS[2];

  async function updateWeather() {
    const loc = theirLoc();
    if (!loc) { weather = null; window.otherWeather = ''; return; }
    if (weather && Date.now() - weather.at < WEATHER_REFRESH && weather.lat === loc.lat && weather.lng === loc.lng) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,weather_code`;
      const res = await fetch(url);
      const data = await res.json();
      weather = { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, at: Date.now(), ...loc };
      window.otherWeather = `${weatherInfo(weather.code)[1]} ${weather.temp}°`;
      window.dispatchEvent(new Event('nune:weather'));
      refresh();
    } catch (e) { /* pas de réseau : on réessaiera */ }
  }

  /* ════════ ENSEMBLE DEPUIS ════════ */
  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((today - new Date(dateStr + 'T00:00:00')) / 86400000);
  };

  function saveCouple(field, value) {
    const { db, doc, setDoc } = window._fb;
    setDoc(doc(db, 'couple', 'info'), { [field]: value || null }, { merge: true })
      .then(() => showToast(field === 'lastTogether' && value === Nune.dayKey() ? 'Câlin enregistré 🫂' : 'Date enregistrée 💞'))
      .catch(() => showToast("La date n'a pas pu être enregistrée 🙁"));
  }

  /* ════════ AFFICHAGE ════════ */
  function refresh() {
    const km = currentDistance();
    const together = daysSince(couple.since);
    const hug = daysSince(couple.lastTogether);

    // Tuile du hub
    const big = document.getElementById('tile-nous-big');
    const sub = document.getElementById('tile-nous-sub');
    if (big) big.textContent = km !== null ? `${km.toLocaleString('fr-FR')} km` : together !== null ? `${together} j` : '💞';
    if (sub) sub.textContent = [
      together !== null ? `ensemble depuis ${together} jours` : null,
      window.otherWeather ? `${window.otherWeather} chez ${Nune.otherName()}` : null,
    ].filter(Boolean).join(' · ') || 'distance, dates, météo';

    // Puces de l'accueil
    Nune.chip('together', together !== null ? {
      order: 3, icon: '💞', text: `${together} jours ensemble`, onClick: () => pushScreen('nous'),
    } : null);
    Nune.chip('distance', km !== null ? {
      order: 4, icon: '📍', text: km < 5 ? 'tout près 🫂' : `${km.toLocaleString('fr-FR')} km`, onClick: () => pushScreen('nous'),
    } : null);
    Nune.chip('hug', hug !== null && hug > 0 && km !== null && km >= 5 ? {
      order: 5, icon: '🫂', text: `${hug} j sans câlin`, onClick: () => pushScreen('nous'),
    } : null);

    if (Nune.isOpen('nous')) render();
  }

  function render() {
    const el = document.getElementById('nous-content');
    if (!el) return;
    const other = Nune.otherName();
    const a = myLoc(), b = theirLoc();
    const km = currentDistance();
    const together = daysSince(couple.since);
    const hug = daysSince(couple.lastTogether);
    const w = weather ? weatherInfo(weather.code) : null;
    const theirTime = otherPresence?.tz
      ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: otherPresence.tz })
      : null;

    el.innerHTML = `
      <div class="nous-card nous-distance">
        ${mapSvg(a, b)}
        <div class="nous-distance-info">
          ${km !== null
            ? `<div class="nous-km">${km < 5 ? 'tout près 🫂' : `${km.toLocaleString('fr-FR')} km`}</div><div class="nous-km-sub">entre toi et ${escapeHtml(other)}</div>`
            : `<div class="nous-km-sub">${!a ? 'Partage ta position pour voir la distance' : `${escapeHtml(other)} n'a pas encore partagé sa position`}</div>`}
        </div>
        <button class="profile-link nous-share" onclick="togetherToggleLocation()">
          ${sharing() ? 'ne plus partager ma position' : '📍 partager ma position approximative'}
        </button>
      </div>

      ${w || theirTime ? `
        <div class="nous-card nous-weather">
          <div class="nous-weather-icon" aria-hidden="true">${w ? w[1] : '🕰'}</div>
          <div>
            <div class="nous-weather-main">${w ? `${weather.temp}° · ${w[2]}` : ''}</div>
            <div class="nous-weather-sub">${theirTime ? `il est ${theirTime} chez ${escapeHtml(other)}` : `chez ${escapeHtml(other)}`}</div>
          </div>
        </div>` : ''}

      <div class="section-label">nos dates</div>
      <div class="nous-stats">
        <div class="nous-stat"><strong>${together ?? '—'}</strong><span>jours ensemble</span></div>
        <div class="nous-stat"><strong>${hug ?? '—'}</strong><span>${hug === 0 ? 'câlin aujourd\'hui 🫂' : 'jours depuis le dernier câlin'}</span></div>
      </div>
      <div class="nous-dates">
        <label class="nous-date-row">ensemble depuis le
          <input class="form-input" type="date" value="${couple.since || ''}" onchange="togetherSave('since', this.value)">
        </label>
        <label class="nous-date-row">dernière fois ensemble
          <input class="form-input" type="date" value="${couple.lastTogether || ''}" onchange="togetherSave('lastTogether', this.value)">
        </label>
        <button class="btn-add" onclick="togetherSave('lastTogether', Nune.dayKey())">On est ensemble aujourd'hui 🫂</button>
      </div>
    `;
  }

  /* ════════ DÉMARRAGE ════════ */
  window.togetherToggleLocation = toggleSharing;
  window.togetherSave = saveCouple;
  registerScreen('nous', () => { render(); updateMyLocation(); updateWeather(); });
  setupKissButton();

  window.addEventListener('nune:presence', (e) => {
    otherPresence = e.detail;
    updateWeather();
    refresh();
  });

  onNuneReady(() => {
    Nune.live('kisses', onKisses, { last: 20 });
    const { db, doc, onSnapshot } = window._fb;
    onSnapshot(doc(db, 'couple', 'info'), (snap) => {
      couple = snap.exists() ? snap.data() : {};
      refresh();
    }, (err) => window.onFirestoreError && window.onFirestoreError(err));
    updateMyLocation();
    setInterval(updateWeather, WEATHER_REFRESH);
    refresh();
  });
})();

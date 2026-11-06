/* ══════════════════════════════════════════
   ux.js — le confort d'utilisation
   - Clavier : la barre d'onglets se cache, le chat reste visible
   - Retour en glissant depuis le bord gauche d'un sous-écran
   - Lightbox : glisser pour changer de photo, vers le bas pour fermer
   - Réglages regroupés (notifications, position, profil, thème…)
   - « Quoi de neuf » : la visite des nouveautés, une fois
   - Puce « ton humeur ? » tant qu'elle n'est pas donnée
   ══════════════════════════════════════════ */
(function () {
  /* ════════ CLAVIER ════════ */
  const isTextField = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|password|email|)$/.test(el.type)));

  document.addEventListener('focusin', (e) => {
    if (!isTextField(e.target)) return;
    document.body.classList.add('typing');
    if (e.target.id === 'chat-input') setTimeout(() => typeof scrollChatToBottom === 'function' && scrollChatToBottom(true), 250);
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => { if (!isTextField(document.activeElement)) document.body.classList.remove('typing'); }, 80);
  });

  // iOS ne redimensionne pas la page : on suit la hauteur réellement visible
  const vv = window.visualViewport;
  if (vv) {
    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${kb > 80 ? kb : 0}px`);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
  }

  /* ════════ RETOUR EN GLISSANT ════════ */
  let edge = null;
  document.addEventListener('touchstart', (e) => {
    const screen = document.querySelector('.screen.subscreen.slide-in');
    const x = e.touches[0].clientX;
    if (!screen || x > 28 || e.target.closest('canvas')) return;
    edge = { screen, x, y: e.touches[0].clientY, dx: 0, active: false };
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!edge) return;
    const dx = e.touches[0].clientX - edge.x;
    const dy = e.touches[0].clientY - edge.y;
    if (!edge.active) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { edge = null; return; }
      if (dx > 10) { edge.active = true; edge.screen.classList.add('dragging'); }
    }
    if (edge?.active) {
      edge.dx = Math.max(0, dx);
      edge.screen.style.transform = `translateX(${edge.dx}px)`;
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!edge) return;
    const { screen, dx, active } = edge;
    edge = null;
    if (!active) return;
    screen.classList.remove('dragging');
    screen.style.transform = '';
    if (dx > window.innerWidth * 0.3) history.back();
  });

  /* ════════ LIGHTBOX : GLISSER ════════ */
  const lb = document.getElementById('lightbox');
  let lbStart = null;
  lb?.addEventListener('touchstart', (e) => {
    lbStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  lb?.addEventListener('touchend', (e) => {
    if (!lbStart) return;
    const dx = e.changedTouches[0].clientX - lbStart.x;
    const dy = e.changedTouches[0].clientY - lbStart.y;
    lbStart = null;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { closeLightbox(); return; }
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && typeof lightboxStep === 'function') lightboxStep(dx < 0 ? 1 : -1);
  });
  document.addEventListener('keydown', (e) => {
    if (!lb?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') lightboxStep(1);
    if (e.key === 'ArrowLeft') lightboxStep(-1);
  });

  /* ════════ HUMEUR DU JOUR ════════ */
  function refreshMoodChip() {
    const done = localStorage.getItem('my-mood-date') === new Date().toDateString();
    Nune.chip('mood', done ? null : {
      order: 1.5, icon: '😊', text: 'ton humeur ?', hot: true,
      onClick: () => typeof showMoodPrompt === 'function' && showMoodPrompt(),
    });
  }
  window.addEventListener('nune:mood-set', refreshMoodChip);

  /* ════════ RÉGLAGES ════════ */
  function notifStatus() {
    if (!('Notification' in window)) return { text: 'pas disponibles sur ce navigateur', action: null };
    if (Notification.permission === 'denied') return { text: 'bloquées — réactive-les dans les réglages du téléphone', action: null };
    if (Notification.permission === 'default') return { text: 'pas encore activées', action: 'Activer' };
    if (localStorage.getItem('push-enabled')) return { text: 'activées, même appli fermée ✓', action: null };
    return { text: "activées quand l'appli est ouverte (push serveur pas encore configuré)", action: null };
  }

  function row(icon, title, sub, button = '') {
    return `
      <div class="set-row">
        <span class="set-icon" aria-hidden="true">${icon}</span>
        <span class="set-body"><span class="set-title">${title}</span><span class="set-sub">${sub}</span></span>
        ${button}
      </div>`;
  }

  function renderSettings() {
    const el = document.getElementById('settings-content');
    if (!el) return;
    const me = Identity.get();
    const p = Identity.profile(me);
    const n = notifStatus();
    const sharingLoc = localStorage.getItem('share-location') === '1';
    const protectedByCode = !!localStorage.getItem('pair-code');
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    el.innerHTML = `
      <div class="set-profile">
        <span class="msg-screen-avatar set-avatar">${p.emoji}</span>
        <div class="set-profile-body">
          <div class="set-title">Tu es ${escapeHtml(p.name)}</div>
          <label class="set-sub" for="set-name">prénom affiché</label>
          <input class="form-input set-name" id="set-name" maxlength="20" value="${escapeHtml(Identity.displayName())}">
        </div>
      </div>

      <div class="section-label">notifications & position</div>
      <div class="set-group">
        ${row('🔔', 'Notifications', n.text, n.action ? `<button class="set-btn" id="set-notif">${n.action}</button>` : '')}
        ${row('📍', 'Position approximative', sharingLoc ? 'partagée (~10 km) pour la distance et la météo' : 'non partagée',
          `<button class="set-btn${sharingLoc ? ' ghost' : ''}" id="set-loc">${sharingLoc ? 'Arrêter' : 'Partager'}</button>`)}
      </div>

      <div class="section-label">apparence</div>
      <div class="set-themes">
        ${Object.entries(THEMES).map(([id, t]) => `
          <button class="set-theme${currentTheme === id ? ' active' : ''}" data-theme-id="${id}" aria-pressed="${currentTheme === id}">
            <span class="set-theme-swatch" style="background:linear-gradient(135deg, ${t.vars['--pink']}, ${t.vars['--lilac']})"></span>
            <span>${t.icon} ${t.name}</span>
          </button>`).join('')}
      </div>

      <div class="section-label">sécurité & données</div>
      <div class="set-group">
        ${row('🔐', 'Code du couple', protectedByCode ? 'ce téléphone est protégé ✓' : 'pas encore activé (voir le README)')}
        ${row('💾', 'Sauvegarde', 'un fichier avec tous vos messages, lettres et photos',
          '<button class="set-btn" onclick="exportBackup()">Exporter</button>')}
        ${isIos && !standalone ? row('📲', "Installer l'appli", 'pour les notifications sur iPhone', '<button class="set-btn" onclick="showIosGuide()">Voir</button>') : ''}
      </div>

      <div class="section-label">l'appli</div>
      <div class="set-group">
        ${row('✨', 'Quoi de neuf', 'revoir toutes les nouveautés', '<button class="set-btn ghost" onclick="showWhatsNew(true)">Voir</button>')}
        ${row('👤', 'Changer de profil', "repasser par l'écran d'accueil", '<button class="set-btn ghost danger" onclick="resetIdentity()">Changer</button>')}
      </div>
      <div class="set-footer">Twenty Three · fait avec 💖 pour Nune</div>
    `;

    document.getElementById('set-name').onchange = (e) => {
      const v = e.target.value.trim();
      if (!v) { e.target.value = Identity.displayName(); return; }
      localStorage.setItem('user-name', v);
      if (typeof renderGreeting === 'function') renderGreeting();
      showToast(`On t'appellera ${v} ✦`);
    };
    document.getElementById('set-notif')?.addEventListener('click', () => {
      requestNotifPermission();
      setTimeout(renderSettings, 1500);
    });
    document.getElementById('set-loc').onclick = () => {
      if (window.togetherToggleLocation) window.togetherToggleLocation();
      setTimeout(renderSettings, 300);
    };
    el.querySelectorAll('.set-theme').forEach(b => b.onclick = () => { applyTheme(b.dataset.themeId); renderSettings(); });
  }

  /* ════════ QUOI DE NEUF ════════ */
  const WHATS_NEW_VERSION = 'v6';
  const NEWS = [
    { icon: '❓', title: 'Question du jour', text: 'la même pour vous deux, réponse cachée jusqu\'à la tienne', screen: 'question' },
    { icon: '💋', title: 'Bisou à distance', text: 'appui long sur ✦ dans le chat', tab: 1 },
    { icon: '🎙', title: 'Messages vocaux', text: 'le micro à droite du champ de message', tab: 1 },
    { icon: '✉️', title: 'Ouvre quand…', text: 'des lettres scellées à ouvrir au bon moment', screen: 'openwhen' },
    { icon: '📍', title: 'Nous deux', text: 'distance, météo chez l\'autre, jours ensemble', screen: 'nous' },
    { icon: '🫙', title: 'Le bocal', text: 'glisse des souvenirs, pioche-en un au hasard', screen: 'jar' },
    { icon: '🎯', title: 'Défis, quiz, dessin', text: 'pour jouer ensemble', screen: 'challenge' },
    { icon: '🗞', title: 'Album du mois', text: 'votre mois en chiffres et en photos', screen: 'recap' },
  ];

  function showWhatsNew(force = false) {
    if (document.getElementById('whats-new')) return;
    localStorage.setItem('whatsnew', WHATS_NEW_VERSION);
    const overlay = document.createElement('div');
    overlay.id = 'whats-new';
    overlay.className = 'mood-prompt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Quoi de neuf');
    overlay.innerHTML = `
      <div class="mood-prompt-card news-card">
        <div class="mood-prompt-title">Quoi de neuf ✨</div>
        <div class="mood-prompt-sub">touche une nouveauté pour la découvrir</div>
        <div class="news-list">
          ${NEWS.map((n, i) => `
            <button class="news-item" data-i="${i}">
              <span class="news-icon" aria-hidden="true">${n.icon}</span>
              <span class="news-body"><span class="news-title">${n.title}</span><span class="news-text">${n.text}</span></span>
              <span class="moment-arrow" aria-hidden="true">›</span>
            </button>`).join('')}
        </div>
        <button class="mood-skip">${force ? 'fermer' : 'plus tard'}</button>
      </div>`;
    const close = () => overlay.remove();
    overlay.querySelector('.mood-skip').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.querySelectorAll('.news-item').forEach(b => b.onclick = () => {
      const n = NEWS[+b.dataset.i];
      close();
      // Depuis un sous-écran (ex. Réglages), on revient d'abord en arrière
      const open = document.querySelector('.screen.subscreen.slide-in');
      const go = () => n.screen ? pushScreen(n.screen) : switchTab(['home', 'chat', 'more'][n.tab], n.tab);
      if (open) { history.back(); setTimeout(go, 380); } else go();
    });
    document.body.appendChild(overlay);
  }

  /* Une seule fenêtre à la fois : on attend que l'humeur du jour soit fermée */
  function maybeShowWhatsNew(tries = 0) {
    if (localStorage.getItem('whatsnew') === WHATS_NEW_VERSION || !localStorage.getItem('onboarding-done')) return;
    const busy = document.querySelector('.mood-prompt-overlay, #onboarding.active, #identity-overlay.active, #unlock-screen.active');
    if (busy) { if (tries < 40) setTimeout(() => maybeShowWhatsNew(tries + 1), 1500); return; }
    showWhatsNew();
  }

  /* ════════ DÉMARRAGE ════════ */
  window.showWhatsNew = showWhatsNew;
  registerScreen('settings', renderSettings);
  refreshMoodChip();
  setTimeout(maybeShowWhatsNew, 3500);
})();

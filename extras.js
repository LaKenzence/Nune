/* ══════════════════════════════════════════
   extras.js — installer l'appli et tout sauvegarder
   - iPhone : un guide « Partager → Sur l'écran d'accueil »
     (indispensable pour les notifications sur iOS)
   - Android / ordi : bouton d'installation natif en puce sur l'accueil
   - Sauvegarde : un fichier .json avec tous vos messages, lettres, photos…
   ══════════════════════════════════════════ */
(function () {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /* ════════ GUIDE D'INSTALLATION IPHONE ════════ */
  function showIosGuide() {
    if (document.getElementById('ios-guide')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ios-guide';
    overlay.className = 'mood-prompt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', "Installer l'appli sur l'iPhone");
    overlay.innerHTML = `
      <div class="mood-prompt-card">
        <div class="pairing-lock" aria-hidden="true">📲</div>
        <div class="mood-prompt-title">Installe Twenty Three</div>
        <div class="pairing-text">Pour recevoir ses messages même appli fermée, ajoute-la à ton écran d'accueil :</div>
        <ol class="ios-steps">
          <li><span class="ios-step-icon">⬆︎</span>Touche <strong>Partager</strong> en bas de Safari</li>
          <li><span class="ios-step-icon">＋</span>Choisis <strong>Sur l'écran d'accueil</strong></li>
          <li><span class="ios-step-icon">💌</span>Ouvre l'appli depuis sa nouvelle icône, puis active les notifications</li>
        </ol>
        <button class="btn-add pairing-btn" onclick="this.closest('.mood-prompt-overlay').remove()">Compris ✦</button>
        <button class="mood-skip" onclick="localStorage.setItem('ios-guide-never','1');this.closest('.mood-prompt-overlay').remove()">ne plus me le montrer</button>
      </div>`;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    localStorage.setItem('ios-guide-at', Date.now().toString());
  }

  function maybeShowIosGuide() {
    if (!isIos || isStandalone || localStorage.getItem('ios-guide-never')) return;
    if (!localStorage.getItem('onboarding-done')) return;
    const last = parseInt(localStorage.getItem('ios-guide-at') || '0', 10);
    if (Date.now() - last < 3 * 86400000) return;
    setTimeout(showIosGuide, 4000);
  }

  /* ════════ INSTALLATION (Android, ordi) ════════ */
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    Nune.chip('install', {
      order: 0, icon: '📲', text: "installer l'appli", hot: true,
      onClick: async () => {
        installPrompt.prompt();
        await installPrompt.userChoice.catch(() => {});
        installPrompt = null;
        Nune.chip('install', null);
      },
    });
  });
  window.addEventListener('appinstalled', () => Nune.chip('install', null));

  /* ════════ SAUVEGARDE ════════ */
  const BACKUP_COLLECTIONS = [
    'messages', 'voice', 'reactions', 'moods', 'shared_signals', 'kisses', 'rituals',
    'answers', 'open_when', 'moments', 'couple', 'jar', 'challenges', 'quiz',
    'photos', 'photo_full', 'drawing',
  ];

  async function exportBackup() {
    if (!window._fb) { showToast('Connexion impossible pour le moment 🙁'); return; }
    const btn = document.querySelector('.backup-btn');
    if (btn) { btn.disabled = true; btn.textContent = '💾 on rassemble vos souvenirs…'; }
    const { db, collection, getDocs } = window._fb;
    const backup = { app: 'Twenty Three', exportedAt: new Date().toISOString(), by: Nune.me(), data: {} };
    try {
      for (const name of BACKUP_COLLECTIONS) {
        const snap = await getDocs(collection(db, name));
        backup.data[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      // Les dates Firestore deviennent des dates lisibles
      const json = JSON.stringify(backup, (k, v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v), 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `twenty-three-sauvegarde-${Nune.dayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      const mb = (blob.size / 1024 / 1024).toFixed(1);
      showToast(`Sauvegarde prête (${mb} Mo) 💾`);
    } catch (e) {
      console.error('Sauvegarde :', e);
      showToast('La sauvegarde a échoué 🙁');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 sauvegarder tous nos souvenirs'; }
    }
  }

  window.exportBackup = exportBackup;
  window.showIosGuide = showIosGuide;
  maybeShowIosGuide();
})();

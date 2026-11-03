/* ══════════════════════════════════════════
   presence.js — « en ligne », « vu » et l'heure chez l'autre
   presence/{kenzo|nune} : { activeAt, chatSeenAt, tz }
   ══════════════════════════════════════════ */
(function () {
  const ONLINE_WINDOW = 90 * 1000;    // actif il y a moins de 90 s → en ligne
  const HEARTBEAT     = 60 * 1000;
  const MY_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let otherPresence = null;
  let lastSeenWrite = 0;

  const toDate = (ts) => (ts?.toDate ? ts.toDate() : null);

  function presenceRef(user) {
    const { db, doc } = window._fb;
    return doc(db, 'presence', user);
  }

  function writePresence(fields) {
    const me = Identity.get();
    if (!me || !window._fb) return;
    const { setDoc, serverTimestamp } = window._fb;
    const data = { activeAt: serverTimestamp(), tz: MY_TZ };
    for (const k of fields) data[k] = serverTimestamp();
    setDoc(presenceRef(me), data, { merge: true }).catch(() => {});
  }

  function heartbeat() {
    if (document.visibilityState === 'visible') writePresence([]);
  }

  /* Le chat est à l'écran → l'autre peut voir « vu » */
  function chatIsVisible() {
    return document.visibilityState === 'visible'
      && typeof currentTabIndex !== 'undefined' && currentTabIndex === 1
      && !document.querySelector('.screen.subscreen.slide-in');
  }

  function markChatSeen() {
    if (!chatIsVisible()) return;
    if (Date.now() - lastSeenWrite < 4000) return;
    lastSeenWrite = Date.now();
    writePresence(['chatSeenAt']);
  }

  /* ── Affichage ── */
  function relative(date) {
    const min = Math.round((Date.now() - date) / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `il y a ${h} h`;
    return `le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  }

  /* « 03:14 chez Nune » seulement si vous n'êtes pas sur le même fuseau */
  function theirTime(tz) {
    if (!tz) return '';
    const fmt = (zone) => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: zone });
    try {
      const theirs = fmt(tz);
      if (theirs === fmt(MY_TZ)) return '';
      return `${theirs} chez ${Identity.profile(Identity.other()).name}`;
    } catch { return ''; }
  }

  function renderStatus() {
    const el = document.getElementById('msg-screen-status');
    if (!el) return;
    const active = toDate(otherPresence?.activeAt);
    const online = active && Date.now() - active < ONLINE_WINDOW;
    const parts = [];
    if (online) parts.push('<span class="status-dot" aria-hidden="true"></span>en ligne');
    else if (active) parts.push(`dernière visite ${relative(active)}`);
    else parts.push('en direct ✦');
    const time = theirTime(otherPresence?.tz);
    if (time) parts.push(`🕰 ${time}`);
    el.innerHTML = parts.join(' · ');
    el.classList.toggle('is-online', !!online);
  }

  /* « vu ✓ » sous mon dernier message s'il a été lu */
  function renderSeen() {
    document.querySelectorAll('.bubble-seen').forEach(e => e.remove());
    if (typeof messagesById === 'undefined') return;
    const me = Identity.get();
    let lastMine = null;
    for (const [id, data] of messagesById) if (data.from === me) lastMine = { id, data };
    if (!lastMine) return;

    const seenAt = toDate(otherPresence?.chatSeenAt);
    const sentAt = toDate(lastMine.data.createdAt);
    if (!seenAt || !sentAt || seenAt < sentAt) return;

    // Seulement si c'est bien le dernier message du fil
    const row = document.querySelector(`[data-msg-id="${lastMine.id}"]`);
    if (!row || row.nextElementSibling?.classList.contains('bubble-row')) return;
    const tag = document.createElement('div');
    tag.className = 'bubble-seen';
    tag.textContent = `vu ${seenAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ✓`;
    row.appendChild(tag);
  }

  function start() {
    const me = Identity.get();
    if (!me || !window._fb) return;
    const { onSnapshot } = window._fb;

    onSnapshot(presenceRef(Identity.other(me)), (snap) => {
      otherPresence = snap.exists() ? snap.data() : null;
      renderStatus();
      renderSeen();
    }, (err) => window.onFirestoreError && window.onFirestoreError(err));

    heartbeat();
    setInterval(heartbeat, HEARTBEAT);
    setInterval(renderStatus, 30 * 1000);   // « il y a X min » reste juste
    document.addEventListener('visibilitychange', () => { heartbeat(); markChatSeen(); });

    window.addEventListener('nune:chat-opened', markChatSeen);
    window.addEventListener('nune:message', (e) => {
      if (e.detail.data.from !== me) markChatSeen();
      renderSeen();
    });
    markChatSeen();
  }

  if (window.onNuneReady) window.onNuneReady(start);
})();

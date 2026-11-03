/* ══════════════════════════════════════════
   voice.js — messages vocaux dans le chat
   Appui sur 🎙 : enregistre (60 s max) · re-appui : envoie · ✕ : annule
   L'audio est rangé dans voice/{id} (≤ 1 Mo), le message pointe dessus.
   ══════════════════════════════════════════ */
(function () {
  const MAX_SECONDS = 60;
  const MAX_BYTES   = 700 * 1024;   // ~950 Ko une fois en base64
  const MIME_TYPES  = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];

  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let tickTimer = null;
  let cancelled = false;

  const audioCache = new Map();   // voiceId → dataURL
  let playing = null;             // { audio, btn }

  /* ════════ ENREGISTREMENT ════════ */
  function setupButton() {
    const bar = document.querySelector('.msg-input-bar');
    const send = bar?.querySelector('.msg-send-btn');
    if (!bar || !send || !window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) return;

    const mic = document.createElement('button');
    mic.className = 'msg-mic-btn';
    mic.id = 'mic-btn';
    mic.setAttribute('aria-label', 'Enregistrer un message vocal');
    mic.textContent = '🎙';
    mic.onclick = () => (recorder ? stop(false) : start());
    bar.insertBefore(mic, send);

    const rec = document.createElement('div');
    rec.className = 'msg-recording';
    rec.id = 'msg-recording';
    rec.innerHTML = `
      <button class="msg-rec-cancel" aria-label="Annuler l'enregistrement">✕</button>
      <span class="msg-rec-dot" aria-hidden="true"></span>
      <span class="msg-rec-time" id="msg-rec-time">0:00</span>
      <span class="msg-rec-hint">re-touche 🎙 pour envoyer</span>`;
    rec.querySelector('.msg-rec-cancel').onclick = () => stop(true);
    bar.appendChild(rec);
  }

  async function start() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      showToast('Micro refusé — autorise-le pour envoyer un vocal 🎙');
      return;
    }
    const mimeType = MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || '';
    recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 24000 });
    chunks = [];
    cancelled = false;
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const duration = Math.round((Date.now() - startedAt) / 1000);
      const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'audio/webm' });
      recorder = null;
      setRecordingUi(false);
      if (!cancelled && duration >= 1) sendVoice(blob, duration);
    };
    recorder.start();
    startedAt = Date.now();
    setRecordingUi(true);
    vibrate([20]);
  }

  function stop(cancel) {
    if (!recorder) return;
    cancelled = cancel;
    recorder.stop();
  }

  function setRecordingUi(on) {
    document.querySelector('.msg-input-bar')?.classList.toggle('recording', on);
    const mic = document.getElementById('mic-btn');
    if (mic) {
      mic.textContent = on ? '➤' : '🎙';
      mic.setAttribute('aria-label', on ? 'Envoyer le message vocal' : 'Enregistrer un message vocal');
    }
    clearInterval(tickTimer);
    if (on) {
      const time = document.getElementById('msg-rec-time');
      tickTimer = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        if (time) time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        if (s >= MAX_SECONDS) stop(false);
      }, 250);
    }
  }

  function toDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  async function sendVoice(blob, duration) {
    if (blob.size > MAX_BYTES) { showToast('Vocal trop long 🙁 (1 minute max)'); return; }
    try {
      const data = await toDataUrl(blob);
      const ref = await Nune.add('voice', { data, mime: blob.type, duration });
      audioCache.set(ref.id, data);
      const { db, collection, addDoc, serverTimestamp } = window._fb;
      await addDoc(collection(db, 'messages'), {
        from: Nune.me(), text: '', voiceId: ref.id, duration, createdAt: serverTimestamp(),
      });
      vibrate([15]);
    } catch (e) {
      console.error('Vocal :', e);
      showToast("Le vocal n'a pas pu partir 🙁");
    }
  }

  /* ════════ LECTURE ════════ */
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  /* Appelé par messaging-patch.js pour un message qui a un voiceId */
  window.renderVoiceBubble = function (el, data) {
    el.classList.add('voice');
    const bars = Array.from({ length: 22 }, (_, i) =>
      `<span style="height:${30 + Math.abs(Math.sin(i * 1.7 + (data.duration || 3))) * 70}%"></span>`).join('');
    el.innerHTML = `
      <button class="voice-play" aria-label="Écouter le message vocal">▶</button>
      <span class="voice-wave" aria-hidden="true">${bars}</span>
      <span class="voice-dur">${fmt(data.duration || 0)}</span>`;
    const btn = el.querySelector('.voice-play');
    btn.onclick = (e) => { e.stopPropagation(); toggle(data.voiceId, btn, el); };
  };

  async function toggle(voiceId, btn, el) {
    if (playing?.btn === btn) {
      playing.audio.pause();
      return;
    }
    if (playing) playing.audio.pause();

    let src = audioCache.get(voiceId);
    if (!src) {
      btn.textContent = '…';
      try {
        const { db, doc, getDoc } = window._fb;
        const snap = await getDoc(doc(db, 'voice', voiceId));
        src = snap.exists() ? snap.data().data : null;
        if (src) audioCache.set(voiceId, src);
      } catch (e) { src = null; }
    }
    if (!src) { btn.textContent = '▶'; showToast('Vocal introuvable 🙁'); return; }

    const audio = new Audio(src);
    playing = { audio, btn };
    const wave = el.querySelector('.voice-wave');
    const dur = el.querySelector('.voice-dur');
    audio.ontimeupdate = () => {
      const total = isFinite(audio.duration) ? audio.duration : 0;
      if (total) wave.style.setProperty('--progress', `${(audio.currentTime / total) * 100}%`);
      if (dur) dur.textContent = fmt(audio.currentTime);
    };
    const reset = () => {
      btn.textContent = '▶';
      wave.style.setProperty('--progress', '0%');
      if (playing?.audio === audio) playing = null;
    };
    audio.onpause = reset;
    audio.onended = reset;
    btn.textContent = '❚❚';
    audio.play().catch(() => { reset(); showToast('Lecture impossible sur cet appareil 🙁'); });
  }

  setupButton();
})();

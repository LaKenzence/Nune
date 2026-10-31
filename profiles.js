/* ══════════════════════════════════════════
   profiles.js — qui est qui
   Source unique pour l'identité (Kenzo / Nune) et le prénom affiché.
   Chargé avant app.js et messaging-patch.js.

   - chat-identity : "kenzo" ou "nune" → sert au chat, aux notifs, à la galerie
   - user-name     : le prénom affiché (« bonsoir, … »), libre
   ══════════════════════════════════════════ */

const PROFILES = {
  kenzo: { name: "Kenzo", emoji: "✦",  color: "#f06292" },
  nune:  { name: "Nune",  emoji: "🌙", color: "#ce93d8" },
};

const Identity = {
  /* "kenzo" | "nune" | null */
  get() {
    const id = localStorage.getItem('chat-identity');
    if (PROFILES[id]) return id;

    // Anciennes versions : seul le prénom était enregistré
    const legacy = (localStorage.getItem('user-name') || '').trim().toLowerCase();
    if (PROFILES[legacy]) {
      localStorage.setItem('chat-identity', legacy);
      return legacy;
    }
    return null;
  },

  set(id, displayName) {
    if (!PROFILES[id]) return;
    localStorage.setItem('chat-identity', id);
    localStorage.setItem('user-name', (displayName || '').trim() || PROFILES[id].name);
  },

  clear() {
    localStorage.removeItem('chat-identity');
    localStorage.removeItem('user-name');
  },

  other(id = Identity.get()) {
    return id === 'kenzo' ? 'nune' : 'kenzo';
  },

  /* Profil complet (nom, emoji…), avec un repli pour une valeur inconnue */
  profile(id) {
    return PROFILES[id] || { name: id || '', emoji: '💌' };
  },

  /* Prénom à afficher pour la personne sur ce téléphone */
  displayName() {
    return localStorage.getItem('user-name') || Identity.profile(Identity.get()).name;
  },
};

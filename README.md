# Twenty Three — Signaux pour Nune 💌
 
Une PWA (Progressive Web App) privée à deux personnes : un compagnon de couple avec signaux quotidiens, messagerie temps réel, photos, lettre, compte à rebours et playlist partagée.
 
## ✨ Fonctionnalités
 
- **Signaux du jour** — citations/messages tirés au hasard, avec anneau de progression (0 → 23), historique, et déblocage spécial au 23ᵉ signal (photo surprise + message).
- **Messagerie temps réel** (Firestore) — fil de conversation à deux, réactions emoji par message, pastille de non-lus, "signal partagé" (détecte quand les deux pensent l'un à l'autre en même temps), humeur du jour partagée.
- **Notifications push** — Firebase Cloud Messaging + Cloud Functions (`functions/`), actives même app fermée, plus un signal du jour à 10 h.
- **Galerie partagée** — photos compressées dans le navigateur puis stockées dans Firestore, visibles sur les deux téléphones, avec légendes et lightbox.
- **La Lettre** — page statique personnalisée.
- **Lettres « ouvre quand… »** — lettres scellées écrites pour l'autre (« quand tu es triste », « quand je te manque »…), notifiées à l'ouverture.
- **Présence** — « en ligne », « vu » sous le dernier message, et l'heure locale de l'autre quand vous n'êtes pas sur le même fuseau.
- **Compte à rebours partagé** — anniversaires (récurrents chaque année) et événements, synchronisés entre les deux téléphones.
- **Thèmes visuels** — plusieurs ambiances de couleurs.
- **Playlist partagée** — embed Spotify.
- **PWA installable** — manifest + service worker, fonctionne hors-ligne pour le contenu statique.
## 🗂 Structure des fichiers
 
| Fichier | Rôle |
|---|---|
| `index.html` | Structure de toutes les pages/écrans (onboarding, accueil, chat, « Notre coin », sous-écrans) |
| `profiles.js` | **Qui est qui** : profils `kenzo` / `nune` et helper `Identity` (profil choisi + prénom affiché) |
| `firebase-config.js` | Config Firebase et clé VAPID, partagées par la page et le service worker |
| `firebase-messaging.js` | Initialise Firestore (cache hors ligne) et le push, expose `window._fb` |
| `app.js` | Cœur de l'appli : signaux, ciel animé, galerie partagée, thèmes, comptes à rebours, citations, onboarding, navigation |
| `messaging-patch.js` | Temps réel : fil de conversation, réactions, signal partagé, humeur du jour, enregistrement push |
| `sw.js` | Service worker : cache (réseau d'abord) + affichage des notifications push |
| `presence.js` | Présence en ligne, accusé « vu », heure locale de l'autre |
| `open-when.js` | Lettres « ouvre quand… » |
| `firestore.rules` | Règles de sécurité Firestore (accès réservé à vos deux téléphones) |
| `functions/index.js` | Cloud Functions : envoie les notifications push (messages, réactions, humeurs, signaux, photos, signal du jour) |
| `style.css` | Tous les styles (thèmes, animations, composants) |
| `manifest.json` | Manifeste PWA (icônes en SVG inline, couleurs, nom) |

## ⚙️ Architecture technique
 
- **Stockage local** : `localStorage` (compteur de signaux, historique, thème, profil, comptes à rebours). Les anciennes photos IndexedDB sont partagées automatiquement à la première ouverture de la galerie.
- **Backend temps réel** : Firebase Firestore. Collections : `messages`, `reactions`, `shared_signals`, `moods`, `photos` (miniatures), `photo_full` (images HD), `push_tokens` (un document par appareil), `presence`, `open_when`, `moments`, `members` (appareils autorisés) et `config/pairing` (code secret, illisible depuis l'appli).
- **Identité** : deux profils fixes, `kenzo` et `nune` (`profiles.js`), choisis à l'onboarding avec un prénom libre pour l'affichage.
- **Push** : chaque appareil enregistre son jeton FCM dans `push_tokens` ; les Cloud Functions réagissent aux nouveaux documents et envoient la notification à l'autre personne.

## 🚀 Installation / déploiement
 
1. Héberger les fichiers sur un serveur statique HTTPS (Firebase Hosting, Netlify, Vercel, GitHub Pages…). **HTTPS est obligatoire** pour que le Service Worker et les notifications fonctionnent.
2. Créer un projet Firebase, activer **Firestore** (mode production), et configurer des **règles de sécurité** (voir section Sécurité ci-dessous — c'est le point le plus urgent).
3. Ajouter les fichiers médias manquants si besoin : `lo-fi.mp3`, `1000020019.jpg` (photo surprise), et les pistes d'ambiance (`piano.mp3`, `rain.mp3`, `cafe.mp3`).
4. **Notifications push** :
   - Générer une clé « Certificats Web Push » (console Firebase → Paramètres du projet → Cloud Messaging) et la coller dans `FIREBASE_VAPID_KEY` (`firebase-config.js`).
   - Passer le projet en offre Blaze, vérifier `REGION` dans `functions/index.js` (emplacement de la base Firestore), puis : `cd functions && npm install && cd .. && npx firebase-tools deploy --only functions`.
5. Ouvrir l'app, choisir son profil (Kenzo ou Nune) et son prénom, puis toucher « Activer » pour les notifications (sur iPhone : ajouter d'abord l'app à l'écran d'accueil).
## 🔐 Sécurité — code du couple

L'accès à Firestore est réservé à vos deux téléphones grâce à `firestore.rules` :

- chaque appareil se connecte en **anonyme** (Firebase Auth) ;
- il devient **membre** (`members/{uid}`) une seule fois, en entrant le **code secret du couple** ;
- ce code est rangé dans `config/pairing`, que l'appli ne peut ni lire ni modifier : il n'est **jamais dans le dépôt** ;
- un membre ne peut écrire qu'en son propre nom (impossible d'envoyer un message « de Nune » depuis le téléphone de Kenzo).

**Mise en place (une fois) :**

1. Console Firebase → **Authentication** → Commencer → onglet « Sign-in method » → activer **Anonyme**.
2. Console Firebase → **Firestore** → créer la collection `config`, document `pairing`, champ `code` (chaîne) = votre code. Choisissez-le long et difficile à deviner (une petite phrase à vous).
3. Déployer les règles : `npx firebase-tools deploy --only firestore:rules`.
4. Sur chaque téléphone, l'appli demande le code une fois, puis ne le redemande plus.

Tant que les règles ne sont pas déployées, l'appli fonctionne comme avant et ne demande rien.

# Twenty Three — Signaux pour Nune 💌
 
Une PWA (Progressive Web App) privée à deux personnes : un compagnon de couple avec signaux quotidiens, messagerie temps réel, photos, lettre, compte à rebours et playlist partagée.
 
## ✨ Fonctionnalités
 
- **Signaux du jour** — citations/messages tirés au hasard, avec anneau de progression (0 → 23), historique, et déblocage spécial au 23ᵉ signal (photo surprise + message).
- **Messagerie temps réel** (Firestore) — fil de conversation à deux, réactions emoji par message, pastille de non-lus, "signal partagé" (détecte quand les deux pensent l'un à l'autre en même temps), humeur du jour partagée.
- **Notifications push** — Firebase Cloud Messaging + Cloud Functions (`functions/`), actives même app fermée, plus un signal du jour à 10 h.
- **Galerie partagée** — photos compressées dans le navigateur puis stockées dans Firestore, visibles sur les deux téléphones, avec légendes et lightbox.
- **La Lettre** — page statique personnalisée.
- **Compte à rebours** — anniversaires et événements importants, pré-remplis et modifiables.
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
| `functions/index.js` | Cloud Functions : envoie les notifications push (messages, réactions, humeurs, signaux, photos, signal du jour) |
| `style.css` | Tous les styles (thèmes, animations, composants) |
| `manifest.json` | Manifeste PWA (icônes en SVG inline, couleurs, nom) |

## ⚙️ Architecture technique
 
- **Stockage local** : `localStorage` (compteur de signaux, historique, thème, profil, comptes à rebours). Les anciennes photos IndexedDB sont partagées automatiquement à la première ouverture de la galerie.
- **Backend temps réel** : Firebase Firestore. Collections : `messages`, `reactions`, `shared_signals`, `moods`, `photos` (miniatures), `photo_full` (images HD), `push_tokens` (un document par appareil).
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
## 🔐 Sécurité — à corriger en priorité
 
C'est le point le plus important du projet actuel :
 
- La config Firebase (clé API, project ID…) est dans `firebase-config.js`, donc publique. Pour Firebase, ce n'est pas un secret en soi (ces clés sont conçues pour être publiques côté client), **mais** cela ne protège rien sans règles Firestore strictes.
- Rien n'indique que des **règles de sécurité Firestore** restreignent l'accès. Si la base est encore en règles ouvertes ou par défaut, n'importe qui ayant l'URL du projet peut lire/écrire dans toutes les collections, y compris les photos de `photos` et `photo_full`.
- Il n'y a **aucune authentification réelle** : l'« identité » Kenzo/Nune est juste une valeur `localStorage`, donc falsifiable par n'importe qui ouvrant les DevTools.
Recommandation minimale : règles Firestore qui exigent une authentification Firebase (même anonyme) et limitent l'accès aux deux UID autorisés, plutôt qu'un système purement déclaratif côté client.

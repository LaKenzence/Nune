# Twenty Three — Signaux pour Nune 💌
 
Une PWA (Progressive Web App) privée à deux personnes : un compagnon de couple avec signaux quotidiens, messagerie temps réel, photos, lettre, compte à rebours et playlist partagée.
 
## ✨ Fonctionnalités
 
- **Signaux du jour** — citations/messages tirés au hasard, avec anneau de progression (0 → 23), historique, et déblocage spécial au 23ᵉ signal (photo surprise + message).
- **Messagerie temps réel** (Firestore) — chat à deux, réactions emoji, "signal partagé" (détecte quand les deux pensent l'un à l'autre en même temps), humeur du jour partagée.
- **Notifications push** — via Service Worker, actives même app fermée.
- **Galerie privée** — photos stockées en local (IndexedDB), avec légendes et lightbox.
- **La Lettre** — page statique personnalisée.
- **Compte à rebours** — anniversaires et événements importants, pré-remplis et modifiables.
- **Thèmes visuels** — plusieurs ambiances de couleurs.
- **Playlist partagée** — embed Spotify.
- **PWA installable** — manifest + service worker, fonctionne hors-ligne pour le contenu statique.
## 🗂 Structure des fichiers
 
| Fichier | Rôle |
|---|---|
| `index.html` | Structure de toutes les pages/écrans (onboarding, home, chat, more, subscreens) |
| `app.js` | Cœur applicatif : signaux, animations (étoiles, confettis), galerie/IndexedDB, thèmes, countdowns, citations, onboarding, navigation par swipe |
| `messaging-patch.js` | Greffon de messagerie temps réel : identité, chat Firestore, réactions, signal partagé, humeur du jour, notifications |
| `firebase-messaging.js` | Initialise Firebase/Firestore côté page et expose `window._fb` |
| `sw.js` | Service Worker : cache PWA + écoute Firestore en arrière-plan pour notifications même app fermée |
| `style.css` | Tous les styles (thèmes, animations, composants) |
| `manifest.json` | Manifeste PWA (icônes en SVG inline, couleurs, nom) |
 
## ⚙️ Architecture technique
 
- **Stockage local** : `localStorage` (compteur de signaux, historique, thème, identité, countdowns) + `IndexedDB` (photos, migrées automatiquement depuis l'ancien stockage `localStorage`).
- **Backend temps réel** : Firebase Firestore, avec 4 collections : `messages`, `reactions`, `shared_signals`, `moods`.
- **Identité** : deux profils fixes, `kenzo` et `nune`, choisis une fois et stockés en `localStorage`.
- **PWA** : `sw.js` charge Firebase en mode `compat` pour écouter Firestore même quand l'app est fermée, et déclenche les notifications natives.
## 🚀 Installation / déploiement
 
1. Héberger les fichiers sur un serveur statique HTTPS (Firebase Hosting, Netlify, Vercel, GitHub Pages…). **HTTPS est obligatoire** pour que le Service Worker et les notifications fonctionnent.
2. Créer un projet Firebase, activer **Firestore** (mode production), et configurer des **règles de sécurité** (voir section Sécurité ci-dessous — c'est le point le plus urgent).
3. Ajouter les fichiers médias manquants si besoin : `lo-fi.mp3`, `1000020019.jpg` (photo surprise), et les pistes d'ambiance (`piano.mp3`, `rain.mp3`, `cafe.mp3`).
4. Ouvrir l'app, choisir une identité (Kenzo ou Nune), autoriser les notifications.
## 🔐 Sécurité — à corriger en priorité
 
C'est le point le plus important du projet actuel :
 
- La config Firebase (clé API, project ID…) est **codée en dur** dans `firebase-messaging.js` et `sw.js`. Pour Firebase, ce n'est pas un secret en soi (ces clés sont conçues pour être publiques côté client), **mais** cela ne protège rien sans règles Firestore strictes.
- Rien n'indique que des **règles de sécurité Firestore** restreignent l'accès. Si la base est encore en règles ouvertes ou par défaut, n'importe qui ayant l'URL du projet peut lire/écrire dans `messages`, `reactions`, `shared_signals`, `moods`.
- Il n'y a **aucune authentification réelle** : l'« identité » Kenzo/Nune est juste une valeur `localStorage`, donc falsifiable par n'importe qui ouvrant les DevTools.
Recommandation minimale : règles Firestore qui exigent une authentification Firebase (même anonyme) et limitent l'accès aux deux UID autorisés, plutôt qu'un système purement déclaratif côté client.

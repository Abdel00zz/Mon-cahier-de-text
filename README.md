<div align="center">
  <h1>📚 Cahier de Textes Interactif</h1>
  <p>Le hub en ligne des enseignants : saisir son cahier, suivre sa progression dans le programme, et rester alerté — même hors connexion.</p>
  <img src="https://img.shields.io/badge/React-19-blue" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue" alt="TypeScript 5.8" />
  <img src="https://img.shields.io/badge/Vite-6-purple" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Vercel-Hobby-black" alt="Vercel" />
</div>

---

## 1. À quoi sert l'application

Chaque enseignant tient un **cahier de textes numérique** : une arborescence de chapitres → sections → items (définitions, exercices, activités…), chaque item pouvant recevoir une **date** de séance. À partir de ces dates, l'application calcule la **progression dans le programme** (taux de complétion, nombre de séances) et, croisée avec l'**emploi du temps** du professeur et le **calendrier scolaire marocain**, détecte les **retards** et en alerte l'enseignant.

L'application est **offline-first** : tout fonctionne en local (localStorage), et se **synchronise dans le cloud** dès qu'un compte est connecté. Un **tableau de bord administrateur** (`/admin.html`) permet de visualiser tous les enseignants et leur progression.

---

## 2. Fonctionnement de bout en bout

### 2.1 Parcours enseignant
1. **(Optionnel) Authentification** — inscription avec nom, prénom, téléphone, mot de passe **et cycle(s) d'enseignement** (Collège / Lycée / Prépa). *Actuellement désactivée pendant la construction* (voir §6).
2. **Tableau de bord** — liste des classes filtrées par cycle, bannière d'alerte de retard, chip « Prochaine séance ».
3. **Éditeur** — table hiérarchique (Date · Contenu · Remarque) avec édition en ligne, sélection multiple, insertion, séparateurs, recherche, undo/redo, impression PDF.
4. **Configuration** (modale à onglets) — Affichage, **Emploi du temps**, **Notifications**, Données, **Compte**.
5. **Synchronisation** — automatique et silencieuse (badge d'état dans l'en-tête).

### 2.2 Chaîne de la progression
`dates saisies dans l'éditeur` → [`utils/progression.ts`](utils/progression.ts) calcule `{ complétion %, séances, dernière date, détail par chapitre }` → alimente à la fois la modale **Analyse**, l'**instantané** poussé au cloud, et le **moteur de retard**.

### 2.3 Chaîne du retard (alertes intelligentes)
`emploi du temps` (grille jours × créneaux) → [`utils/timetable.ts`](utils/timetable.ts) dérive, par classe, les jours et le nombre de séances/jour → [`utils/lateness.ts`](utils/lateness.ts) compare **séances attendues** (via [`utils/calendar.ts`](utils/calendar.ts), hors vacances/fériés) vs **séances réellement saisies** → sévérité `ok/notice/warning/critical` → **bannière in-app** ([`components/LatenessBanner.tsx`](components/LatenessBanner.tsx)) + **notification push** quotidienne (cron).

---

## 🎓 Comment bâtir cette application, phase par phase

*Guide éducatif : chaque phase est livrable seule, dans cet ordre. Les remarques indiquent les pièges rencontrés et les optimisations retenues.*

### Phase 1 — Backend & authentification
**Objectif** : chaque prof possède un compte (nom, prénom, **téléphone**, mot de passe).

1. Créer les helpers partagés dans `api/_lib/` : `http.ts` (types requête/réponse + classe `HttpError`), `redis.ts` (client Upstash + registre des clés), `auth.ts` (hachage **scrypt natif** de `node:crypto` — pas besoin de bcryptjs —, JWT signés avec `jose`, cookies `httpOnly`), `validate.ts` (normalisation du téléphone en chiffres purs).
2. Créer `api/auth.ts` : une seule fonction serverless avec un *switch* d'actions (`register`/`login`/`logout`/`me`) — Vercel Hobby limite le nombre de fonctions, on consolide.
3. Côté client : `contexts/AuthContext.tsx` (états `loading/authenticated/anonymous/offline`) et la page `components/auth/AuthPage.tsx`.

> 💡 **Remarques** : le dossier `api/_lib/` préfixé `_` n'est **pas déployé** comme fonction. Rate-limiter le login avec `INCR` + `EXPIRE` (10 essais / 5 min). Message d'erreur unique « téléphone ou mot de passe incorrect » (ne jamais révéler lequel). Un interrupteur `config/features.ts → AUTH_REQUIRED` permet de désactiver l'auth pendant le développement.

### Phase 2 — Synchronisation cloud offline-first
**Objectif** : le localStorage reste la source pendant l'édition ; le cloud reçoit une copie + un instantané compact de progression.

1. Extraire le calcul de progression dans `utils/progression.ts` (réutilisé par la modale Analyse, la synchro et le moteur de retard — **une seule source de vérité**).
2. Créer `utils/syncBus.ts` : un mini bus d'événements (`markClassDirty`, `markClassesListDirty`) qui découple les producteurs (éditeur) du consommateur (moteur de synchro).
3. Créer `contexts/SyncContext.tsx` : push **débouncé 20 s**, flush à la fermeture (`pagehide`), pull au démarrage avec **dernière-écriture-gagne par classe** (comparaison d'horodatages `syncMeta_v1` local vs `classMeta` serveur).
4. `api/sync.ts` : POST (pipeline Redis : classes + blobs modifiés + instantané) / GET (liste légère ou blob d'une classe).

> 💡 **Remarques** : une clé Redis **par classe** (`lessons:{phone}:{classId}`) pour rester sous la limite ~1 Mo/requête d'Upstash. L'admin ne lit **jamais** les blobs : seulement le hash `admin:snapshots` (1 commande pour N profs). Compteur de version plutôt que booléen pour le « dirty » de la liste (une modification arrivée pendant un push en vol ne doit pas être effacée).

### Phase 3 — Dashboard administrateur
**Objectif** : `/admin.html` = seconde page Vite, code secret, vue de tous les profs.

1. Ajouter `admin.html` + `build.rollupOptions.input = { main, admin }` dans `vite.config.ts` (build multi-pages).
2. `api/admin.ts` : login par code secret comparé en **temps constant** (`timingSafeEqual`), cookie admin séparé (12 h), `overview` = `HGETALL admin:snapshots`.

> 💡 **Remarques** : exclure `/admin` du service worker (`denylist`) et de l'indexation (`noindex`). Le rewrite `/admin → /admin.html` dans `vercel.json` est confort.

### Phase 4 — Fondation UI (Tailwind build, icônes, toasts)
**Objectif** : zéro CDN, dépendances maîtrisées.

1. Installer `tailwindcss@4` + `@tailwindcss/vite`, transposer les tokens dans `index.css` via `@theme inline` — puis supprimer le script CDN et l'importmap hérité d'`index.html`.
2. Migrer Font Awesome → **lucide-react** via un barrel unique `components/ui/icons.ts` ; stocker les icônes des configs (`TOP_LEVEL_TYPE_CONFIG`) comme **composants**, pas comme chaînes de classes.
3. Remplacer le composant de notification maison par **sonner** (`<Toaster/>` global + `toast.success/error/...`).
4. Remplacer Tippy.js par un **tooltip global par délégation** (`GlobalTooltip`) qui écoute l'attribut `data-tippy-content` déjà présent partout — zéro changement des call-sites.

> ⚠️ **Piège Tailwind v4** : le scanner ne voit que les **chaînes complètes** dans les sources ; jamais de classes construites par interpolation (`bg-${x}` interdit, utiliser des maps de chaînes complètes).

### Phase 5 — Mobile/tablette
**Objectif** : le téléphone est le terrain principal du prof.

1. La colonne Remarque est masquée < 768 px → afficher la remarque **sous le contenu** en italique (`MobileRemark`), éditable au tap.
2. FAB « + » (56 px, safe-area) sur téléphone ; caché quand la barre de sélection est ouverte.
3. Cibles tactiles ≥ 44 px partout ; les boutons *hover-reveal* (suppression) deviennent **toujours visibles** au tactile.
4. Modales en bottom-sheet iOS : poignée, `max-h-92vh`, champ focusé auto-défilé au centre (clavier virtuel).

### Phase 6 — Calendrier scolaire & moteur de retard
**Objectif** : l'app connaît le calendrier marocain et l'emploi du temps du prof.

1. `public/vacances-jourferie.json` : fériés + vacances officiels, **modifiable sans rebuild** (le client le re-télécharge en `no-cache`, le serveur importe la version bundlée).
2. `utils/calendar.ts` : fonctions **pures** (importables par les fonctions serverless) — `isSchoolDay`, `countExpectedSessions`, `todayInMorocco` (⚠ les fonctions Vercel tournent en UTC : toujours passer par le fuseau `Africa/Casablanca`).
3. Emploi du temps : grille jours × créneaux (`utils/timetable.ts`), dérivée automatiquement en `schedules` par classe.
4. `utils/lateness.ts` : séances **attendues** (emploi du temps − vacances − fériés − **absences/certificats**) vs séances **saisies** → sévérité + messages français.

> 💡 **Astuce** : les absences justifiées se traitent comme des « vacances personnelles » fusionnées dans le calendrier (`withAbsences`) — aucun autre code à modifier.

### Phase 7 — PWA & notifications push
**Objectif** : app installable + rappel quotidien intelligent.

1. `vite-plugin-pwa` en mode `injectManifest` : precache Workbox des assets hashés + handlers `push`/`notificationclick` custom dans `pwa/sw.ts`.
2. `api/notify.ts` : abonnement (`pushManager.subscribe` + clé VAPID) et **cron Vercel** quotidien (`0 17 * * *` = 18 h Casablanca) qui lit les instantanés, calcule le retard et notifie — jamais pendant vacances/fériés/absences, anti-spam 2 jours.

> ⚠️ **iOS** : le push exige iOS ≥ 16.4 **et** la PWA installée sur l'écran d'accueil. La bannière in-app reste la couche fiable.

### Phase 8 — Intelligence de saisie
**Objectif** : l'app aide le prof au moment exact où il saisit.

1. `utils/dateValidation.ts` : chaque date affectée est croisée avec l'emploi du temps (*« vous n'enseignez pas cette classe le mardi »*), les fériés, les vacances, les absences et l'année scolaire.
2. Brancher sur **tous** les circuits de saisie : modale d'affectation (alerte **live** pendant le choix), édition en ligne (alerte dans le formulaire), cellule date, séparateur (toasts).
3. Dans le tableau, une date problématique ne doit pas devenir un badge, une boîte ou un effet spécial : elle reste une **date typographique rouge**, simple et lisible. Le rouge suffit comme alerte pédagogique, sans déformer la grille.
4. **Impression intelligente** (`utils/printMeta.ts`) : mémoriser les dates déjà imprimées par classe et proposer de n'imprimer que les nouveautés.
5. **Impression officielle par séances** : le papier ne doit pas simuler une fusion ligne par ligne. Les éléments consécutifs portant la même date sont rendus comme **une seule séance administrative** : une cellule Date commune, un contenu empilé, des remarques regroupées, peu de couleur, traits nets, pagination souple.

> 💡 **Principe** : alertes **non bloquantes** — le logiciel conseille, le prof décide (rattrapage, exception).

---

## 3. Architecture technique

### 3.1 Frontend
- **React 19 + Vite 6 + TypeScript**, état immuable via **Immer** (`useImmer`, `useHistoryState`).
- **Routing** par hash maison (`#/` tableau de bord, `#/classe/{id}` éditeur) — pas de React Router.
- **Contextes** : [`AuthContext`](contexts/AuthContext.tsx) (session), [`SyncContext`](contexts/SyncContext.tsx) (moteur de synchro).
- **Multi-pages Vite** : `index.html` (app) + `admin.html` (dashboard admin), entrées séparées dans [`vite.config.ts`](vite.config.ts).

### 3.2 Backend serverless (Vercel Functions, `api/`)
| Fonction | Rôle |
|---|---|
| [`api/auth.ts`](api/auth.ts) | Inscription / connexion / déconnexion / session (`me`) |
| [`api/sync.ts`](api/sync.ts) | Push (classes + leçons + emploi du temps + instantané) / Pull |
| [`api/admin.ts`](api/admin.ts) | Connexion admin (code secret) / vue d'ensemble / détail enseignant |
| [`api/notify.ts`](api/notify.ts) | Abonnement Web Push + **cron quotidien** de notifications de retard |
| [`api/send-email.ts`](api/send-email.ts) | Envoi d'e-mails (Resend) — existant |

Helpers partagés dans [`api/_lib/`](api/_lib/) : `http` (types req/res + erreurs), `redis` (client Upstash + clés), `auth` (scrypt + JWT `jose` + cookies httpOnly), `validate`.

### 3.3 Stockage — Upstash Redis (Vercel KV, gratuit)
| Clé | Contenu |
|---|---|
| `user:{phone}` | Compte : nom, prénom, hash mot de passe, cycles |
| `classes:{phone}` | Classes + emploi du temps + métadonnées de synchro |
| `lessons:{phone}:{classId}` | Contenu d'une classe (un blob par classe, < 1 Mo) |
| `admin:snapshots` | Hash : par téléphone, instantané compact lu par l'admin |
| `push:subs` | Hash : abonnements Web Push par enseignant |
| `rl:login:{phone}` | Compteur anti-force-brute (TTL 5 min) |

**Sessions 100 % stateless** (JWT en cookie httpOnly) — aucune clé de session en base. La vue admin lit tous les profs en **une commande** (`HGETALL admin:snapshots`).

### 3.4 Synchronisation (offline-first, dernière-écriture-gagne par classe + garde anti-conflit)
- [`utils/syncBus.ts`](utils/syncBus.ts) : bus d'événements « dirty » découplant les producteurs (éditeur, gestion des classes) du moteur ; **version par classe** (une édition arrivée pendant un push en vol n'est jamais perdue).
- [`contexts/SyncContext.tsx`](contexts/SyncContext.tsx) : push débounced (20 s), flush à la fermeture (`pagehide` + **`fetch keepalive`**, la requête survit à la fermeture de l'onglet), pull au démarrage **en parallèle** (une requête par classe, `Promise.all`).
- **Détection de conflit multi-appareils** : `syncMeta_v1` mémorise `lastSyncedAt` (dernier point commun local/cloud). Si local ET cloud ont divergé depuis, la version perdante est **archivée** (`classDataConflict_v1_{classId}`) avant tout écrasement — aucune donnée n'est détruite en silence — et un toast en informe le professeur.
- **Restauration de sauvegarde** ([`utils/backup.ts`](utils/backup.ts)) : traitée comme une modification locale datée de maintenant → elle est repoussée au cloud au redémarrage au lieu d'être écrasée par lui.

### 3.5 PWA & notifications
- [`vite-plugin-pwa`](vite.config.ts) en `injectManifest` ; service worker [`pwa/sw.ts`](pwa/sw.ts) (precache, `push`, `notificationclick`, `/admin` et `/api` exclus du périmètre).
- Cron Vercel `0 17 * * *` (18 h Casablanca) → [`api/notify.ts`](api/notify.ts) calcule le retard depuis les instantanés et envoie les notifications (anti-spam, purge des abonnements morts).

---

## ✒️ Mise en page & LaTeX dans les descriptions

Les titres et descriptions acceptent **du texte enrichi** et **des mathématiques LaTeX** (rendu MathJax).

### Mise en page du texte (hors `$...$`)
| Syntaxe | Rendu |
|---|---|
| `**texte**` | **gras** |
| `*texte*` | *italique* |
| `- élément` (début de ligne) | • liste à puces (≈ `\itemize`) |
| `1. élément` (début de ligne) | liste numérotée (≈ `\enumerate`) |

### Mathématiques — `$...$` (en ligne) ou `$$...$$` (centré)
Plus de 35 commandes usuelles supportées :

| Catégorie | Commandes |
|---|---|
| **Fractions & racines** | `\frac{a}{b}` · `\dfrac` · `\sqrt{x}` · `\sqrt[n]{x}` |
| **Exposants/indices** | `x^2` · `u_{n+1}` · `\binom{n}{k}` |
| **Ensembles** | `\mathbb{N} \mathbb{Z} \mathbb{Q} \mathbb{R} \mathbb{C}` · `\in` `\notin` `\subset` `\cup` `\cap` `\emptyset` |
| **Analyse** | `\lim_{x \to 0}` · `\sum_{k=1}^{n}` · `\prod` · `\int_a^b` · `\infty` · `f'(x)` · `\partial` |
| **Comparaisons** | `\le \ge \ne \approx \equiv \sim` |
| **Logique** | `\forall` `\exists` `\Rightarrow` `\Leftrightarrow` `\implies` |
| **Grec** | `\alpha \beta \gamma \delta \pi \theta \lambda \mu \sigma \omega \Delta \Omega` |
| **Fonctions** | `\ln \log \exp \sin \cos \tan \arctan` |
| **Décorations** | `\vec{u}` · `\overline{AB}` · `\hat{f}` · `\widehat{ABC}` · `\text{...}` |
| **Tableaux & systèmes** | `\begin{array}{cc} a & b \\ c & d \end{array}` · `\begin{cases} x+y=1 \\ x-y=0 \end{cases}` · `pmatrix` `bmatrix` `vmatrix` |
| **Délimiteurs** | `\left( \right)` · `\left[ \right]` · `\left\{ \right\}` · `\left| \right|` |
| **Opérateurs** | `\times \div \pm \mp \cdot \circ \ast` |

### Macros raccourcies (spécifiques à l'application)
| Raccourci | Équivalent |
|---|---|
| `\R \N \Z \Q \C` | `\mathbb{R}` `\mathbb{N}` `\mathbb{Z}` `\mathbb{Q}` `\mathbb{C}` |
| `\abs{x}` | `\left\|x\right\|` |
| `\norme{u}` | `\left\lVert u\right\rVert` |
| `\vect{AB}` | `\overrightarrow{AB}` |
| `\e` · `\dif` | e droit (exponentielle) · d droit (différentielle) |

> Exemple complet : `$$\begin{cases} u_0 = 1 \\ u_{n+1} = \dfrac{u_n}{2} + 3 \end{cases}$$` — un **aperçu LaTeX en temps réel** s'affiche dans les formulaires d'ajout et de description dès qu'une formule est détectée. Les longues formules passent automatiquement à la ligne sur mobile (`displayOverflow: linebreak`).

---

## 4. Calendrier scolaire

[`public/vacances-jourferie.json`](public/vacances-jourferie.json) contient les **jours fériés** (nationaux + religieux estimés) et **vacances scolaires** du Maroc **2025-2026**. Il est lu côté client (`fetch` no-cache — corrigeable sans rebuild) et côté serveur (import statique). Les dates religieuses sont marquées `approximatif: true` : les corriger dans ce fichier puis redéployer.

---

## 🚀 Déploiement sain sur Vercel (pas à pas)

### Étape 1 — Base de données Redis (Upstash)
1. Sur le dashboard Vercel du projet → **Storage** → **Marketplace** → **Upstash Redis** → *Create*.
2. L'intégration injecte automatiquement `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_*` — les deux paires sont acceptées par [`api/_lib/redis.ts`](api/_lib/redis.ts)).

### Étape 2 — Clés Web Push (VAPID)
```bash
npx web-push generate-vapid-keys
```
Copiez la **clé publique** dans `VAPID_PUBLIC_KEY` **et** `VITE_VAPID_PUBLIC_KEY` (identiques), la **clé privée** dans `VAPID_PRIVATE_KEY`.

### Étape 3 — Resend (e-mails, optionnel)
1. Créez un compte [resend.com](https://resend.com), vérifiez un domaine d'envoi.
2. Créez une clé API → `RESEND_API_KEY` ; renseignez `RESEND_FROM_EMAIL` (ex. `Cahier <notifications@votre-domaine.com>`).

### Étape 4 — Variables d'environnement (Vercel → Settings → Environment Variables)
| Variable | Valeur | Obligatoire |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | injectées par l'intégration | ✅ |
| `AUTH_SECRET` | chaîne aléatoire ≥ 32 car. (`openssl rand -base64 32`) | ✅ |
| `ADMIN_SECRET` | code d'accès à `/admin.html` (secret, fort) | ✅ |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | via `web-push generate-vapid-keys` | ✅ (push) |
| `VITE_VAPID_PUBLIC_KEY` | = `VAPID_PUBLIC_KEY` | ✅ (push) |
| `VAPID_SUBJECT` | `mailto:votre@email.com` | ✅ (push) |
| `CRON_SECRET` | chaîne aléatoire ≥ 32 car. | ✅ (cron) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend | ⬜ optionnel |

> ⚠️ **Sécurité** : `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET`, `VAPID_PRIVATE_KEY` ne doivent JAMAIS apparaître côté client. Seules `VITE_*` sont exposées au navigateur (c'est voulu pour la clé publique VAPID).

### Étape 5 — Déployer
```bash
vercel deploy --prod      # ou push sur la branche principale (déploiement auto)
```
- L'**authentification s'active automatiquement** en production ([`config/features.ts`](config/features.ts) : `AUTH_REQUIRED = import.meta.env.PROD`).
- Le **cron** `/api/notify` est enregistré via [`vercel.json`](vercel.json) (`0 17 * * *`, soit 18 h à Casablanca).
- `/admin.html` est buildé comme seconde page (accès via `{url}/admin.html` + `ADMIN_SECRET`).

### Accès au tableau de bord administrateur
Une fois déployé, l'admin se rend sur **`https://VOTRE-URL/admin.html`** (page séparée, non liée depuis l'app enseignant). Il saisit le **code secret** défini dans `ADMIN_SECRET` → il voit tous les enseignants, leur progression, et peut **notifier / bloquer / supprimer** un compte. La page est en `noindex` et hors périmètre du service worker. Pour changer le code, mettez à jour `ADMIN_SECRET` et redéployez.

### Étape 6 — Vérifications post-déploiement
- [ ] Inscription d'un compte test → connexion → création d'une classe → synchro (badge « Synchronisé »).
- [ ] `/admin.html` → code secret → l'enseignant test apparaît.
- [ ] Cron à sec : `curl -H "Authorization: Bearer $CRON_SECRET" "https://VOTRE-URL/api/notify?dry=1"`.
- [ ] PWA installable (Lighthouse) ; sur mobile, activer les notifications depuis l'app installée.

---

## 5. Installation & développement

**Prérequis :** Node.js 18+.

```bash
npm install
npm run dev        # front seul (Vite) — http://localhost:5173
# ou, pour tester aussi les fonctions serverless + cookies :
npx vercel dev
```

Scripts : `npm run build` (build multi-pages + service worker), `npm run lint` (`tsc --noEmit`), `npm run preview`.

### Variables d'environnement (Vercel)
```
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   # (ou KV_REST_API_*)
AUTH_SECRET            # ≥ 32 caractères aléatoires
ADMIN_SECRET           # code d'accès à /admin.html
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   # npx web-push generate-vapid-keys
VAPID_SUBJECT          # mailto:...
VITE_VAPID_PUBLIC_KEY  # = VAPID_PUBLIC_KEY (exposée au client)
CRON_SECRET            # ≥ 32 caractères aléatoires
RESEND_API_KEY / RESEND_FROM_EMAIL     # e-mails (optionnel)
```

---

## 6. Authentification — comportement par environnement

Le réglage est **automatique** ([`config/features.ts`](config/features.ts)) :

```ts
export const AUTH_REQUIRED = import.meta.env.PROD;
```

| Environnement | Comportement |
|---|---|
| **`npm run dev` (votre machine)** | Accès **direct**, aucune connexion demandée — confort de développement |
| **Build déployé (Vercel)** | Page de **connexion/inscription active** (téléphone + mot de passe, cycles, matières) |

Pour forcer un comportement (ex. tester la page d'auth en local), remplacez la valeur par `true` ou `false` — une seule ligne, rien d'autre à changer.

---

## 7. Journal des évolutions

**Fiabilité des mécanismes & intelligence de l'emploi du temps (juillet 2026)**
- **Tableau rendu par vrais blocs de séance** : les éléments consécutifs qui partagent une même date ne simulent plus une fusion ligne par ligne ; ils sont rendus comme une seule séance logique avec une cellule Date commune, un contenu empilé et une colonne Remarque cohérente. Résultat : centrage vertical exact, filets continus jusqu'à la remarque, meilleure base pour l'impression et la virtualisation.
- **Impression refondue par séances** : `PrintView` regroupe désormais les contenus datés avant rendu. Le PDF imprime une séance comme une unité officielle (date commune, contenu empilé, remarques dédupliquées), avec une feuille blanche sans carte d'application, marges A4 homogènes et style administratif sobre.
- **Dates en alerte simples** : une date signalée par la garde intelligente reste une date normale, seulement colorée en rouge. Aucun badge, aucune boîte, aucun effet lumineux : le signal doit alerter le professeur sans parasiter la lecture du cahier.
- **Grille Date · Contenu · Remarque unifiée** : en-tête, lignes simples, séparateurs et séances groupées partagent la même définition de colonnes (`--cdt-table-cols`) ; le corps du tableau annule explicitement le padding hérité de `CardContent` (`!p-0`) pour éviter les décalages entre l'en-tête et les lignes.
- **Séance de 2 h = 1 séance** : deux créneaux consécutifs de la même classe (même jour, sans pause déjeuner entre eux) sont fusionnés par [`deriveSchedules`](utils/timetable.ts) — le moteur de retard n'attend plus qu'**une** date pour une séance double (fin des fausses alertes). Visuel assorti dans `ScheduleTab` : cases soudées + badge « 2 h », récapitulatif « N séances (M h)/sem ». Les `schedules` sont **re-dérivés de la grille à chaque chargement** (source de vérité unique), y compris dans l'instantané poussé au cron.
- **Conflits multi-appareils enfin visibles** : détection de divergence via `lastSyncedAt`, **archivage de la version perdante** avant écrasement, toast d'information ; flush de fermeture en `fetch keepalive` ; pull parallèle ; une édition pendant un push en vol n'est plus perdue (version par classe dans le syncBus) ; la **restauration de sauvegarde** gagne toujours sur le cloud (horodatée comme modification locale).
- **Rappels locaux de fin de séance** ([`hooks/useSessionAlerts.ts`](hooks/useSessionAlerts.ts)) : vibration + toast 1 min avant la fin réelle de chaque séance du jour, et alerte si aucune date n'a été affectée à la fin — silence total fériés/vacances/absences, alertes simultanées regroupées, opt-in par appareil (Configuration ▸ Notifications, jamais synchronisé).
- **Auto-numérotation** : « Contrôle continu N » / « Devoir maison N » suggéré à la création (comptage réel de l'arbre, [`countOccurrencesOfType`](utils/dataUtils.ts)), champ librement modifiable.
- **Création de classe héritée du profil** : un seul cycle / une seule matière au profil → champs masqués et hérités ; plusieurs → choix restreint. Modifiable dans les Paramètres, répercuté partout (tableau de bord, création, synchro).
- **Table « serrée »** : le tableau court de bord à bord de la carte (aucun padding de cadre), filets verticaux et horizontaux renforcés, en-tête nettement démarqué (fond plein + filet doré pleine largeur), **fond de ligne coloré par type de bloc** (`rowColor` dans `TOP_LEVEL_TYPE_CONFIG`).
- **Journal compact dans la barre d'outils** (à gauche, cliquable) ; modale Historique regroupée par jour avec compactage des opérations répétées (« ×5 »).
- **Toasts disciplinés** : 3 visibles maximum, décalés au-dessus du FAB sur mobile (safe-area) ; l'association des cahiers locaux au compte est proposée par toast **non bloquant** (plus de `window.confirm`).
- **Admin enrichi** : distribution globale des sévérités (chips cliquables = filtres), tri (retard / complétion / activité / nom), comptes **inactifs** signalés ; le calcul de retard admin intègre désormais les absences justifiées et les seuils du prof (mêmes modules purs).
- **Progression corrigée** ([`utils/progression.ts`](utils/progression.ts)) : les **sections** (conteneurs structurels) ne comptent plus dans la complétion — on date des travaux, pas des titres ; les **dates des séparateurs** (démarcations de fin de séance) comptent désormais comme séances pour le moteur de retard — un prof qui clôture ses séances au séparateur n'est plus faussement « en retard ».
- **Impression — finition document officiel** : blocs de séance insécables entre deux pages, mention « Imprimé le … », **zone de signatures** (professeur + visa de la direction) en pied, fond d'en-tête garanti à l'impression.
- **Couleur de classe = accent officiel** : la couleur choisie dans la modale devient l'accent de la carte (rail latéral, matière, CTA, survol — jamais de fond plein) et se retrouve dans l'en-tête de l'éditeur (pastille + filet).
- **Circuit Paramètres étanche** : toute clé synchronisée (établissement, cycles/matières, préférences d'affichage…) déclenche désormais le push cloud — la liste des clés (`SYNCABLE_KEYS`) est partagée entre le circuit de saisie et le moteur de synchro.
- **Nettoyage** : suppression du barrel `utils/engine.ts` (jamais importé), de `printContent` (mort), de `metadata.json` (résidu AI Studio) et du log `vite-dev.log` ; hook `useDebouncedCallback` dédupliqué.
- **Synchronisation par lots** ([`contexts/SyncContext.tsx`](contexts/SyncContext.tsx)) : le push est découpé en requêtes < 700 Ko (un gros cahier part seul) — correction de l'« Erreur de synchro » permanente quand plusieurs programmes officiels dépassaient la limite serveur de 950 Ko en une seule requête. Nettoyage partiel (les lots partis ne repartent pas), messages précis par cause (401 session expirée / 413 cahier trop volumineux / 5xx avec retry automatique 1 min).
- **PWA & icônes** : icônes PNG générées ([`scripts/generate-icons.mjs`](scripts/generate-icons.mjs)) — 192/512, maskable (zone sûre 80 %), apple-touch 180 (iOS ne supporte pas le SVG), favicons ; polices Google mises en cache par le service worker (rendu hors ligne complet) ; installation via l'**invite native du navigateur** (aucune bannière applicative, `beforeinstallprompt` non intercepté).
- **Rappels de séance — triple couche** : vibration + toast + **notification système locale** via le service worker (volet du téléphone, écran verrouillé), sans aller-retour serveur.
- **Impression paramétrable** : taille du texte (Petit/Normal/Grand) et espacement des lignes (Compact/Normal/Aéré) dans la modale ; compilation **MathJax garantie** avant l'ouverture du dialogue (plus de `$...$` brut sur papier) ; toasts exclus du rendu imprimé.
- **Cartes statistiques « esprit direction »** : Suis-je à jour ? (séances en attente, distinguant « moteur en pause » pendant les vacances) · Progression du programme · Aujourd'hui (séances du jour, calendrier prioritaire sur la grille, **détection de la séance en cours** avec heure de fin) — compteurs animés, rafraîchies par les événements de synchro et un tic minute.
- **Archives des années scolaires** ([`utils/archives.ts`](utils/archives.ts)) : Paramètres ▸ Données permet de figer l'année complète (config + cahiers + journaux) sous son étiquette (« 2025-2026 »), puis de consulter, télécharger (fichier ré-importable) ou supprimer chaque année passée.
- **Progression** : les séparateurs datés comptent comme séances ; les sections ne polluent plus la complétion. **Carte de classe** épurée : nom en haut, actions discrètes, séance à venir, dernière mise à jour — teinte douce de la couleur du prof.

**Optimisation mobile/tablette A→Z**
- **Remarque enfin visible sur téléphone** : affichée en italique sous le contenu (< 768px), éditable au tap — la donnée n'était ni visible ni modifiable sur mobile.
- **FAB « + »** en bas à droite sur téléphone (safe-area) → ajout rapide de contenu ; masqué sur tablette/desktop et quand la barre de sélection est ouverte.
- **Cibles tactiles ≥ 44px** : items de menu, boutons de suppression (carte de classe, séparateur) visibles en permanence au tactile (hover-reveal réservé au desktop).
- **Clavier virtuel** : dans les modales, le champ focusé défile automatiquement au centre.
- **Colonne date élargie** sur petit écran (19%) pour la typographie de date.
- **Alerte d'orientation** : une seule fois par session (le portrait est désormais pleinement utilisable).

**Planning des devoirs + sauvegarde totale + prêt-déploiement (dernière itération)**
- **Planning officiel des devoirs** ([`public/planning-devoirs.json`](public/planning-devoirs.json), transcrit des documents ministériels) : par niveau × matière, devoirs surveillés (محروس) et maison (منزلي) par semestre. [`utils/assessments.ts`](utils/assessments.ts) calcule les **dates indicatives** (arithmétique UTC fiable, semaines relatives au semestre — S2 démarre après les vacances de mi-année), ajustables par le prof. **Bannière de rappel** ([`AssessmentBanner`](components/AssessmentBanner.tsx)) quand un devoir approche (≤ 14 j) — jamais contraignant. Dates **modifiables** dans Configuration ▸ Emploi du temps (bouton ↺ pour revenir à l'officiel).
- **Synchronisation renforcée** : un blob **`settings` complet par professeur** ([`utils/syncSettings.ts`](utils/syncSettings.ts)) — emploi du temps, devoirs, absences, matières, préférences — synchronisé et **restauré intégralement sur un appareil neuf**. Séparation stricte par compte (`push:subs`, `classes:{phone}`, `lessons:{phone}:{id}`).
- **Sauvegarde totale** ([`utils/backup.ts`](utils/backup.ts)) : export/import versionné de **toutes** les données (config + classes + cahiers + journaux + mémoire d'impression + profil), rétro-compatible avec l'ancien format.
- **Config initiale supprimée** en production : l'inscription (nom, cycles, matières) pré-remplit la configuration ; plus d'écran d'accueil ni d'onglets Collège/Lycée/Prépa (toutes les classes du prof affichées ensemble).
- **Calendrier multi-années** : 2025-2026 **et** 2026-2027 (transcrit de l'annexe officielle).
- **Déploiement** : section pas-à-pas ci-dessus (Upstash, VAPID, Resend, variables, cron, vérifications).

**Garde intelligente des dates + fondation UI (itération précédente)**
- **Moteur de validation des dates** ([`utils/dateValidation.ts`](utils/dateValidation.ts)) : à chaque affectation de date, l'app croise la date avec l'**emploi du temps** de la classe (« vous n'enseignez pas 2BAC PC 1 le mardi »), les **jours fériés**, les **vacances scolaires**, les **absences justifiées** et les bornes de l'année scolaire. Alertes **live** dans la modale d'affectation + toasts non bloquants sur tous les points de saisie (édition en ligne, cellule date, séparateur) — le prof reste maître (rattrapages, exceptions).
- **Inscription enrichie** : choix du/des **cycle(s)** ET de la/des **matière(s)** — pilotent le tableau de bord et la création de classe.
- **Création de classe guidée** : niveau choisi dans la **liste officielle marocaine** (1AC-3AC · TC/1BAC/2BAC toutes filières · MPSI/PCSI/MP/PSI/ECS...) + numéro de groupe ; le nom est composé automatiquement ; la matière proposée = celles du prof.
- **Fondation UI** : Tailwind v4 compilé localement (`@tailwindcss/vite`, plus de CDN), icônes **lucide-react** (Font Awesome CDN supprimé), toasts **sonner**, tooltip global maison (Tippy.js supprimé), importmap hérité supprimé.
- **Table** : séparations verticales Date|Contenu|Remarque visibles, blocs datés distingués (lavis chaud, rail doré, filet de clôture de groupe).

**Rénovation de l'éditeur & mécanismes intelligents (itération précédente)**
- **Table refondue, sans « boxes »** : rangées plates et continues (esprit IBM Carbon / claude.ai), filets horizontaux hairline uniquement, plus aucune séparation verticale entre colonnes ; les groupes de séances fusionnées se lisent comme un seul bloc longé d'un fin rail doré.
- **Date « super affichée »** : typographie pure centrée (grand jour + mois en petites capitales), sans badge ni encadré ; le jour courant est signalé par la couleur primaire et un point.
- **Réordonnancement fluide** : boutons Monter/Descendre dans la barre de sélection — un élément se déplace parmi ses frères (items d'une section, sections d'un chapitre, chapitres entre eux) avec sélection préservée ([`moveWithinParent`](utils/dataUtils.ts)).
- **« Ajouter après » plus intelligent** : le type du nouvel élément hérite de l'élément voisin, le séparateur hérite de sa date.
- **Absences justifiées (certificats de maladie)** : périodes saisies dans Notifications → exclues du calcul de retard (traitées comme des « vacances personnelles ») et silence total des alertes pendant, côté client comme côté cron ([`withAbsences`](utils/lateness.ts)).
- **Impression intelligente** : l'app mémorise les dates de séances déjà imprimées par classe ([`printMeta`](utils/printMeta.ts)) et propose de n'imprimer que les nouveautés — zéro doublon, économie de papier ; réimpression complète toujours possible.

**Transformation en hub en ligne (2025)**
- **Authentification** téléphone + mot de passe (scrypt + JWT), avec choix du/des **cycle(s)** à l'inscription, remontés à l'admin. Désactivable via un interrupteur unique.
- **Synchronisation cloud offline-first** : push/pull automatique, dernière-écriture-gagne par classe, badge d'état.
- **Tableau de bord admin** (`/admin.html`) : liste des enseignants, complétion pondérée, détail par classe avec indicateur de retard.
- **Calendrier scolaire marocain** + **moteur de retard** partagé client/serveur.
- **Emploi du temps** : grille **jours × créneaux horaires** (façon emploi du temps papier, **sans la colonne 24 h**), saisie par sélection de la classe dans chaque case, enregistrée et synchronisée, dérivée automatiquement vers le calcul de retard.
- **PWA installable** + **Web Push** quotidien de retard (cron), onglet Notifications (opt-in, seuils, test).
- **ConfigModal** restructurée **en onglets** (Affichage / Emploi du temps / Notifications / Données / Compte).
- **Bannière d'alerte** intelligente + chip « Prochaine séance » sur les cartes de classe.

**Base historique**
- Arborescence de contenu (chapitres/sections/items), dates de séance, MathJax, export PDF, import JSON via Web Worker, undo/redo, recherche, bilingue FR/AR, virtualisation de la table.

---

## 8. Pistes d'amélioration (légères, sans surcharge)

- **Icônes & design** : migrer de Font Awesome (CDN) vers `lucide-react` et de Tailwind CDN vers un build local, pour cohérence, vitesse et un rendu plus proche des standards iOS / claude.ai.
- **Table mobile** : passer la ligne en **carte** sous 640 px (rendre la Remarque visible), remplacer le double-clic par un **appui long** au tactile, cibles ≥ 44 px.
- **Édition** : réordonnancement imbriqué par glisser-déposer, insertion « + » entre les lignes, surlignage des résultats de recherche.
- **Emploi du temps** : import depuis une photo/PDF, gestion des salles par créneau (le champ `room` existe déjà dans le modèle).
- **Compression** des gros blobs de leçons (gzip) avant envoi Redis, si nécessaire.
- **Mode sombre** via variables CSS existantes.

---

## 🧭 Mémento — rebâtir cette application de A à Z (vision d'ensemble, sans noms de fichiers)

*Version « light » : l'idée complète de l'application, ses pages et ses mécanismes, exprimée en langage neutre. Suffisante pour reconstruire le produit sur n'importe quelle stack.*

### L'idée en une phrase
Un cahier de textes numérique pour enseignants : on structure son **programme** (chapitres → sections → contenus typés), on **date** ce qui a été fait en classe, et l'application en déduit **la progression, les retards et les rappels** — le tout fonctionnant d'abord **hors connexion**, avec un nuage qui suit.

### Les cinq pages
1. **Tableau de bord** — cartes des classes (couleur choisie par le prof), trois indicateurs de pilotage (suis-je à jour ? / où en suis-je ? / qu'est-ce qui m'attend aujourd'hui ?), bannières d'alerte (retard, devoir proche), création de classe guidée par le profil.
2. **Éditeur d'une classe** — table à trois colonnes Date | Contenu | Remarque, bord à bord ; édition en ligne, sélection multiple, réordonnancement, séparateurs de séance, recherche, annuler/rétablir, journal des actions dans la barre d'outils.
3. **Paramètres** — affichage des types, grille d'emploi du temps (jours × heures), notifications et absences, sauvegarde/restauration/archives, compte.
4. **Connexion/Inscription** (production seulement) — téléphone + mot de passe, choix des cycles et matières qui pilotent ensuite tout le reste.
5. **Console d'administration** — page séparée à code secret : liste des enseignants, distribution des retards, détail par classe, actions (notifier, bloquer, supprimer).

### Le modèle de données
Une classe possède un arbre : blocs de premier niveau (chapitre, devoir maison, contrôle, correction, évaluation diagnostique) → sections → contenus typés (définition, théorème, exercice, activité…), chacun pouvant recevoir une **date de séance**, une remarque, et un **séparateur** de fin de séance daté. Titres et descriptions acceptent du texte enrichi et des mathématiques LaTeX rendues à l'écran comme à l'impression.

### Les six moteurs (logique pure, partagée entre navigateur et serveur)
1. **Progression** : complétion = contenus datés / contenus totaux (les titres structurels ne comptent pas) ; séances = dates distinctes des contenus ET des séparateurs.
2. **Calendrier scolaire** : années, vacances et fériés officiels dans un fichier éditable sans recompilation ; toute notion d'« aujourd'hui » côté serveur passe par le fuseau du pays.
3. **Emploi du temps** : grille jours × heures ; deux heures consécutives avec la même classe = **une** séance ; la grille est la source de vérité, tout le reste s'en dérive.
4. **Retard** : séances attendues (emploi du temps − vacances − fériés − absences justifiées) moins séances saisies → quatre niveaux de sévérité et des messages bienveillants.
5. **Garde des dates** : chaque date saisie est confrontée à l'emploi du temps, aux fériés, aux vacances, aux absences et à l'année scolaire — alertes **jamais bloquantes**.
6. **Planning des devoirs** : le calendrier ministériel des devoirs par niveau × matière produit des dates indicatives, ajustables, qui déclenchent des rappels à l'approche.

### La synchronisation (hors-ligne d'abord)
Le stockage local de l'appareil est la vérité pendant l'édition. Un bus d'événements marque ce qui a changé ; un moteur pousse au nuage par lots limités en taille, avec temporisation, et vide la file à la fermeture de la page. Au démarrage, l'application tire du nuage et applique la règle « la version la plus récente gagne, classe par classe » — mais si les deux côtés ont divergé depuis leur dernier point commun, la version perdante est **archivée localement** avant tout remplacement et l'utilisateur en est informé. Les réglages voyagent dans un blob unique ; les états propres à l'appareil (notifications push, vibration) ne voyagent jamais. Toute restauration de sauvegarde est datée « maintenant » pour gagner sur le nuage.

### Les notifications (trois couches)
1. **Bannière dans l'application** : retard calculé à l'ouverture, silencieuse pendant vacances/fériés/absences.
2. **Rappels locaux de séance** : une minute avant la fin de chaque séance du jour, vibration + toast + notification système ; à la fin, alerte si aucune date n'a été posée — regroupées si simultanées, débrayables par appareil.
3. **Push quotidien serveur** : une tâche planifiée lit des instantanés compacts (jamais les cahiers complets), recalcule le retard avec les mêmes moteurs, et notifie — anti-spam de deux jours, purge des abonnements morts.

### Le serveur (minimal, consolidé)
Quatre fonctions : authentification (inscription/connexion/session, hachage moderne du mot de passe, jeton signé en cookie httpOnly, anti-force-brute), synchronisation (pousser/tirer), administration (code secret comparé en temps constant, lecture d'instantanés uniquement), notifications (abonnement + tâche planifiée). Le stockage est un simple magasin clé-valeur : une clé par compte, une clé par cahier de classe (pour rester sous la limite de taille par requête), un tableau d'instantanés que l'administrateur lit en une seule commande.

### Les règles d'or
- Hors-ligne d'abord : le nuage est une copie, jamais une condition.
- Une seule implémentation de chaque règle métier, partagée écran/serveur/admin.
- Alerter sans jamais bloquer : le professeur décide toujours.
- Aucune donnée détruite en silence : toute version écrasée est d'abord archivée.
- Ce que l'utilisateur voit (fusion de séances, progression) est exactement ce que les moteurs mesurent.
- L'impression est un document officiel : mise en page paramétrable, formules compilées, signatures, rien d'autre sur le papier.

---

## 📄 Licence

MIT — voir le fichier LICENSE.

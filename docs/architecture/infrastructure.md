# Infrastructure

Ce document décrit le socle technique qui entoure le code produit : intégration continue, budgets de performance, observabilité, sécurité et résilience. L’objectif est celui d’un produit grand public : **chaque garde-fou existe localement, est rejoué automatiquement, et échoue bruyamment avant la mise en ligne**.

## 1. Chaîne de vérification

| Commande | Ce qu’elle protège |
| --- | --- |
| `npm run lint` | Types TypeScript (`tsc --noEmit`). |
| `npm run check:architecture` | Types + code mort + règles de dépendance (`src/domain` sans UI, UI sans écran, aucun import client vers `api/`). |
| `npm run check:i18n` | Parité FR/EN/AR et clés réellement utilisées. |
| `npm run check:secrets` | Aucune clé privée ni compte de service dans les fichiers versionnés. |
| `npm run check:headers` | HSTS, CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy` présents dans `vercel.json`. |
| `npm test` | Suites unitaires, UI (markup) et moteurs du cahier. |
| `npm run build` | Build Vite + serveur Node. |
| `npm run check:bundle` | Budgets de poids gzippé sur `dist/assets`. |
| `npm run check` | Enchaîne tout le bloc ci-dessus (sauf `npm test`). |

L’intégration continue (`.github/workflows/ci.yml`) rejoue ces étapes sur chaque `push` et chaque *pull request* : installation figée (`npm ci`), audit des dépendances de production, types, architecture, traductions, en-têtes, secrets, tests, build, budget de bundle, puis conservation de `dist/` comme artefact de diagnostic.

`dependabot.yml` groupe les mises à jour mineures et de sécurité chaque semaine, et exclut volontairement les montées majeures de React, Vite et Tailwind : celles-ci relèvent d’un plan de migration, pas d’une PR automatique.

## 2. Budgets de performance

Deux niveaux, complémentaires :

1. **Alerte de build** — `scripts/vite/optimization.ts` avertit au-delà de 320 kB par chunk non compressé.
2. **Plafond ferme** — `scripts/validation/check-bundle-budget.mjs` mesure chaque fichier **gzippé** de `dist/assets`, c’est-à-dire ce que reçoit réellement un téléphone :

| Mesure | Plafond | Référence actuelle |
| --- | --- | --- |
| Fragment JavaScript isolé | 90 kB gzip | 75 kB (`math`) |
| Total JavaScript | 1150 kB gzip | ~963 kB |
| Total CSS | 160 kB gzip | ~117 kB |

Les plafonds valent environ 20 % au-dessus de la référence : une alerte signale donc une **régression**, pas une variation de hachage. Pour relever un plafond, justifier la décision dans ce document et dans le commit ; pour rester sous le plafond, préférer un `import()` dynamique ou un découpage plus fin.

## 3. Observabilité

`src/platform/webVitals.ts` collecte les Core Web Vitals avec les API natives (`PerformanceObserver`) : LCP, CLS, INP et TTFB.

- Aucune dépendance, aucun script tiers : le premier affichage ne dépend d’aucun réseau externe.
- Le tampon est borné par construction (quatre indicateurs) — une session d’une journée ne fait pas croître la mémoire.
- Les mesures sont écrites dans la console **uniquement en développement**.
- L’envoi n’a lieu que si `VITE_WEB_VITALS_ENDPOINT` est défini ; la requête utilise `keepalive`, car la mesure la plus utile arrive à la fermeture de l’onglet.
- Chaque mesure est classée `good` / `needs-improvement` / `poor` selon les seuils web.dev, directement exploitables dans un tableau de bord.

`src/platform/errorReporting.ts` complète ce dispositif : une erreur de rendu interceptée par `AppErrorBoundary` est transformée en signalement (message, pile, `componentStack`, route, horodatage). Une même erreur n’est émise qu’une fois par session, le volume est plafonné à 20 signalements et chaque champ est tronqué à 2 000 caractères. Là encore, rien ne part sans `VITE_ERROR_ENDPOINT`. Les deux variables sont documentées dans `.env.example` et restent vides par défaut.

## 4. Sécurité de livraison

`vercel.json` est la source unique des en-têtes HTTP de production :

- `Strict-Transport-Security` avec `includeSubDomains` — pas de retour au HTTP simple.
- `Content-Security-Policy` volontairement **conservatrice** : `frame-ancestors 'self'`, `base-uri 'self'`, `object-src 'none'`. Ces directives ne restreignent aucune ressource et ne peuvent donc pas casser l’application, mais elles bloquent le cadrage externe, le détournement de `<base>` et les greffons.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — isolation tout en gardant la connexion Google dans une popup.
- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`.
- Cache immuable pour `/assets/`, `no-store` pour `/api/`, `no-cache` pour `/sw.js`.

Un CSP complet sur les scripts (`script-src`) suppose des nonces côté serveur : c’est une étape de feuille de route, pas un réglage à improviser.

## 5. Résilience

| Situation | Mécanisme |
| --- | --- |
| Fragment JavaScript disparu après un déploiement | `vite:preloadError` dans `src/app/main.tsx` recharge une seule fois (garde en `sessionStorage`, pas de boucle). |
| Erreur de rendu dans un écran | `AppErrorBoundary` affiche un écran de reprise bilingue : recharger ou revenir à l’accueil, sans jamais perdre les cahiers stockés localement. Le signalement est tracé via `errorReporting`. |
| Réseau absent | Le service worker sert la coque et les polices déjà vues ; les données restent locales. |
| Stockage menacé d’éviction | `requestPersistentStorage()` demande la persistance au navigateur au démarrage. |

## 6. Feuille de route

1. **CSP avec nonce** : générer un nonce par requête pour `script-src` et retirer progressivement `unsafe-inline`.
2. **Collecte agrégée** : brancher `VITE_WEB_VITALS_ENDPOINT` sur une fonction serverless qui agrège par version et par route.
3. **Budgets par route** : mesurer le poids du chemin critique d’une route (`#/classe/…`) et non seulement des fragments.
4. **Stockage** : migration progressive vers IndexedDB pour les cahiers volumineux, avec repli `localStorage`.
5. **Tests de contrat API** : vérifier les réponses de `api/` sur un serveur de test pour couvrir le serveur comme le fait déjà la CI côté client.

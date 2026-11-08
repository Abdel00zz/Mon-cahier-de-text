# Architecture — Mon Cahier de Textes

Application offline-first du cahier de textes de l'enseignant marocain :
React 19 + Vite + TypeScript, synchronisation cloud (Vercel + Firebase +
Upstash Redis), PWA installable et application Android (Capacitor).

## Couches

- `src/domain/` — logique métier pure (notebook, calendar, evaluations,
  sync, assistant) : aucun import React, testable sans navigateur.
- `src/infrastructure/` — stockage, réseau, push, sync cloud.
- `src/features/` — écrans (editor, dashboard, evaluations, settings, auth,
  guide, assistant).
- `src/components/ui/` — design system réutilisable (Radix + Tailwind v4).
- `src/platform/` — ponts Capacitor, PWA install, planification mobile.
- `api/` — fonctions serverless Vercel (auth, sync, admin, messages,
  calendar, notify, official-events) + `api/_lib/` (validation, Firebase
  Admin, Redis, écriture atomique, auth scrypt + cookie HttpOnly).
- `server/` — serveur de développement Express avec API mockée
  (`server/dev/mockApi.ts`).
- `public/sw.js` — service worker (précache, réécrit au build par
  `scripts/vite/pwa-offline-assets.ts`).

## Documents vivants

- Le contrat tableau ↔ évaluations :
  [`workflow-evaluations.md`](./workflow-evaluations.md) — il évolue dans le
  même lot que `notebookSyncBridge.ts` et `tests/test-evaluations-capture.ts`.

## Qualité

- `npm run check` — secrets, en-têtes, données, architecture (tsc
  `--noUnusedLocals` + `check-architecture`), budget de bundle, knip, i18n.
- `npm test` — 180+ suites Node (domaine, UI rendue en statique, intégration
  Firebase émulateur).
- `npm run quality` — cliquets de taille de fichiers, cycles, code mort
  (baseline `quality/*.json`).

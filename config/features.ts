/**
 * Interrupteurs de fonctionnalités globaux.
 *
 * AUTHENTIFICATION, TOUJOURS ACTIVE : le « mode local sans compte » a été
 * éliminé, l'application se comporte partout comme la version déployée.
 * En développement (`npm run dev`), les API /api/auth et /api/sync sont
 * simulées par `setupMockApi` (server.ts, lancé par `npm run dev`) :
 * connexion avec 06000000 / 00000000.
 */
export const AUTH_REQUIRED = true;

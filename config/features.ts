/**
 * Interrupteurs de fonctionnalités globaux.
 *
 * AUTHENTIFICATION — comportement par environnement :
 *   • Production (build déployé sur Vercel)  → page de connexion ACTIVE ;
 *   • Développement local (`npm run dev`)    → accès direct, sans connexion.
 *
 * `import.meta.env.PROD` est résolu par Vite au moment du build :
 * aucune manipulation n'est nécessaire entre le travail local et le déploiement.
 * Pour forcer un comportement, remplacez simplement par `true` ou `false`.
 */
export const AUTH_REQUIRED = import.meta.env.PROD;

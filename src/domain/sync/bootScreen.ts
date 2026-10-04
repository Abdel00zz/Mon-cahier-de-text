/**
 * Quand l'écran d'attente du démarrage doit-il couvrir l'application ?
 *
 * Une seule raison, répétée trois fois : l'enseignant attend vraiment.
 *  1. la configuration locale n'est pas encore lue ;
 *  2. la session n'est pas encore résolue ;
 *  3. l'espace se reconstruit depuis le cloud (emploi du temps puis classes) —
 *     le seul cas où l'attente dure plusieurs secondes.
 *
 * Le troisième point était le maillon manquant : la progression réelle du
 * premier chargement n'était affichée que pendant la vérification de session,
 * c'est-à-dire toujours à 0 %, et l'écran disparaissait avant que quoi que ce
 * soit n'avance.
 *
 * AUCUN BLOCAGE : l'écran n'apparaît que si le rapatriement est RÉELLEMENT en
 * cours. Hors ligne, serveur muet, requête expirée ou échouée, le signal
 * retombe et l'application s'affiche — elle n'attend jamais dans le vide.
 */
export interface BootScreenInput {
    /** Configuration locale en cours de lecture. */
    configLoading: boolean;
    /** Vérification de session en cours. */
    authLoading: boolean;
    /** Session établie (toujours vrai quand l'authentification est désactivée). */
    authenticated: boolean;
    /** Rapatriement cloud en cours. */
    firstLoadRunning: boolean;
    /** Emploi du temps ET classes déjà appliqués localement. */
    firstLoadComplete: boolean;
}

export const shouldShowBootScreen = (input: BootScreenInput): boolean => {
    if (input.configLoading || input.authLoading) return true;
    return input.authenticated && input.firstLoadRunning && !input.firstLoadComplete;
};

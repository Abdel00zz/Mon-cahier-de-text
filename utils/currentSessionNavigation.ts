const AUTO_OPENED_SESSION_KEY = 'cdt_auto_opened_session_v1';
const memoryClaims = new Set<string>();

type SessionClaimStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Réclame l'ouverture automatique d'un créneau une seule fois par onglet.
 * La persistance empêche un rechargement ou un retour navigateur de forcer
 * l'utilisateur à rentrer de nouveau dans la classe qu'il vient de quitter.
 */
export const claimCurrentSessionAutoOpen = (
    scope: string,
    sessionKey: string,
    storage?: SessionClaimStorage,
): boolean => {
    if (!sessionKey) return false;
    const claim = `${scope}:${sessionKey}`;
    if (memoryClaims.has(claim)) return false;

    try {
        const target = storage ?? sessionStorage;
        if (target.getItem(AUTO_OPENED_SESSION_KEY) === claim) {
            memoryClaims.add(claim);
            return false;
        }
        target.setItem(AUTO_OPENED_SESSION_KEY, claim);
    } catch {
        // La garde mémoire couvre les navigateurs qui refusent sessionStorage.
    }

    memoryClaims.add(claim);
    return true;
};

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

/**
 * Marque la séance courante comme déjà traitée — à appeler dès qu'une classe
 * est ouverte, **quelle que soit la voie** (ouverture automatique ou clic de
 * l'enseignant). C'est ce qui garantit qu'un retour arrière natif ne renvoie
 * jamais l'enseignant dans la classe qu'il vient de quitter, même séance en
 * cours.
 */
export const markCurrentSessionHandled = (
    scope: string,
    sessionKey: string,
    storage?: SessionClaimStorage,
): void => {
    claimCurrentSessionAutoOpen(scope, sessionKey, storage);
};

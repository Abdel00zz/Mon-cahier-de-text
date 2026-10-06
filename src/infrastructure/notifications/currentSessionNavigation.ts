const AUTO_OPENED_SESSION_KEY = 'cdt_auto_opened_session_v1';
const memoryClaims = new Set<string>();

type SessionClaimStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Identité de la séance en cours, telle que la publie `useSessionAlerts`. */
export interface CurrentSessionIdentity {
    /** Vide quand aucune séance n'est en cours. */
    key: string;
    classIds: string[];
}

/**
 * La séance en cours n'est consommée que par le cahier de la séance ELLE-MÊME.
 *
 * Rester dans un AUTRE cahier (ou en sortir) pendant qu'une nouvelle séance
 * démarre ne doit jamais la consommer : sinon l'ouverture automatique des 2ᵉ et
 * 3ᵉ séances de la journée ne se déclenche plus, alors que l'enseignant n'a
 * jamais ouvert la classe concernée. Une séance sans classe est inerte.
 */
export const sessionClaimedByClass = (
    classId: string | undefined,
    session: CurrentSessionIdentity,
): boolean => Boolean(classId) && Boolean(session.key) && session.classIds.includes(classId as string);

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

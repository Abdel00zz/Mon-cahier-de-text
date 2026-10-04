/**
 * Attente active de la boîte de réception (direction → professeur).
 *
 * Le serveur retient la requête jusqu'à ce que la signature de la boîte change,
 * puis répond ; à l'échéance, il répond quand même et la boucle relance. La
 * latence perçue tombe à une seconde environ, sans ouvrir d'accès Firestore
 * côté client et sans dépendre d'un service payant.
 *
 * La boucle s'arrête dès que l'appelant la déclare inactive (onglet caché,
 * hors ligne) ou quand le serveur ne renvoie pas de signature (déploiement
 * antérieur) : le repli périodique de l'appelant prend alors le relais.
 */
export interface InboxLongPollPage {
    signature?: string;
}

export interface InboxLongPollOptions<T extends InboxLongPollPage> {
    /** Charge une page ; `since` vide signifie « première lecture, sans attente ». */
    load: (options: { wait: number; since: string }) => Promise<T>;
    /** Appelé uniquement quand la signature change (jamais sur les échéances vides). */
    onPage: (page: T) => void;
    isActive: () => boolean;
    idle?: (ms: number) => Promise<void>;
    /** Durée maximale d'attente demandée au serveur. */
    wait?: number;
    /** Délai de repli après échec, indexé sur le nombre d'échecs consécutifs. */
    backoff?: (failures: number) => number;
}

const defaultIdle = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const defaultBackoff = (failures: number) => Math.min(500 * 2 ** failures, 30_000);

export async function runInboxLongPoll<T extends InboxLongPollPage>(options: InboxLongPollOptions<T>): Promise<void> {
    const { load, onPage, isActive, idle = defaultIdle, backoff = defaultBackoff, wait = 8_000 } = options;
    let since = '';
    let failures = 0;
    while (isActive()) {
        let page: T;
        try {
            page = await load({ wait: since ? wait : 0, since });
        } catch {
            failures += 1;
            if (!isActive()) return;
            await idle(backoff(failures));
            continue;
        }
        failures = 0;
        const signature = typeof page.signature === 'string' ? page.signature : '';
        const changed = signature !== '' && (since === '' || signature !== since);
        if (!isActive()) return;
        if (changed) onPage(page);
        if (signature === '') return;
        since = signature;
    }
}

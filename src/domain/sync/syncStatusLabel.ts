/**
 * Libellé d'état de synchronisation, décidé **hors de l'interface**.
 *
 * La fonction ne traduit rien : elle rend une clé et ses valeurs. La logique
 * (quelle information mérite d'être montrée à l'enseignant) est donc testable,
 * et les textes restent dans `messages.ts`, en français, arabe et anglais.
 */
type SyncStatusKind = 'idle' | 'syncing' | 'pending' | 'synced' | 'error' | 'offline';

export interface SyncStatusLabel {
    key: string;
    values?: Record<string, string | number>;
}

export interface SyncStatusInput {
    status: SyncStatusKind;
    lastSyncAt: string | null;
    /** Avancement publié par le pull, quand la préparation est en cours. */
    progress?: { state: string; total: number; done: number };
    now?: number;
}

export const syncStatusLabel = (input: SyncStatusInput): SyncStatusLabel => {
    const { status, lastSyncAt, progress } = input;
    // La préparation des cahiers prime : elle dit ce qui se passe et combien il reste.
    if (progress && progress.state === 'notebooks' && progress.total > 0 && progress.done < progress.total) {
        return { key: 'sync.status.preparing', values: { done: progress.done, total: progress.total } };
    }
    if (status === 'error') return { key: 'sync.status.error' };
    if (status === 'offline') return { key: 'sync.status.offline' };
    if (status === 'syncing') return { key: 'sync.status.syncing' };
    if (status === 'pending') return { key: 'sync.status.pending' };
    if (!lastSyncAt) return { key: 'sync.status.ready' };
    const minutes = Math.round((input.now ?? Date.now()) - Date.parse(lastSyncAt)) / 60_000;
    // Une date illisible ou future ne doit jamais produire « il y a -3 min ».
    if (!Number.isFinite(minutes) || minutes < 0) return { key: 'sync.status.ready' };
    return { key: 'sync.status.synced', values: { minutes: Math.floor(minutes) } };
};

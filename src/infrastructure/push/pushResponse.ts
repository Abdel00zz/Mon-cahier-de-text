/**
 * Valide la réponse métier d'un test Push. Un HTTP 2xx ne suffit pas : le
 * serveur peut avoir traité la requête sans avoir livré de notification.
 * Ce helper reste sans dépendance navigateur afin d'être testable sous Node.
 */
export const isSuccessfulTestResponse = (httpOk: boolean, payload: unknown): boolean => {
    if (!httpOk || !payload || typeof payload !== 'object') return false;
    const data = payload as { ok?: unknown; sent?: unknown };
    return data.ok === true && typeof data.sent === 'number' && data.sent > 0;
};

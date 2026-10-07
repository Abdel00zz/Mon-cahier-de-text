/** Leave room for API framing, uncompressed GET responses and transaction bookkeeping. */
export const MAX_SYNC_WIRE_BYTES = 900_000;
export const MAX_SYNC_EXPANDED_BYTES = 3 * 1024 * 1024;
export const SYNC_ENCODING = 'gzip-base64-v1';

/**
 * Budget d'UN lot de push, en octets JSON de cahiers.
 *
 * Dérivé du plafond de fil plutôt que recopié : la marge absorbe le cadrage de
 * la requête (liste des classes, réglages, instantané enseignant, suppressions)
 * et l'enveloppe du transport. C'est cette valeur, et elle seule, qui décide du
 * découpage — le serveur, lui, refuse au-delà de ~950 Ko (413).
 */
export const PUSH_BATCH_BUDGET_BYTES = MAX_SYNC_WIRE_BYTES - 200_000;

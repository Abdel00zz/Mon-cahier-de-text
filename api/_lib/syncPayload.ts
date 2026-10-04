import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { HttpError, parseBody } from './http.js';
import { assertBodySize } from './validate.js';
import { MAX_SYNC_EXPANDED_BYTES, SYNC_ENCODING } from '../../src/infrastructure/sync/syncProtocol.js';

const unzip = promisify(gunzip);

/** Authentication must precede this bounded decompression; business validation still follows. */
export async function decodeSyncPayload<T>(raw: unknown, allowCompressed: boolean): Promise<T> {
    assertBodySize(raw);
    const envelope = parseBody<Record<string, unknown>>(raw);
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new HttpError(400, 'Données de synchronisation invalides.');
    if (envelope.encoding === undefined) return envelope as T;
    if (!allowCompressed) throw new HttpError(413, 'Le serveur ne prend pas encore en charge les cahiers volumineux.');
    if (envelope.encoding !== SYNC_ENCODING || typeof envelope.data !== 'string'
        || envelope.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(envelope.data)) {
        throw new HttpError(400, 'Transfert compressé invalide.');
    }
    let json: Buffer;
    try {
        json = await unzip(Buffer.from(envelope.data, 'base64'), { maxOutputLength: MAX_SYNC_EXPANDED_BYTES });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') throw new HttpError(413, 'Le cahier dépasse la capacité de synchronisation de 3 Mio.');
        throw new HttpError(400, 'Le transfert compressé est incomplet ou endommagé.');
    }
    try {
        const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json));
        if (!value || typeof value !== 'object' || Array.isArray(value) || value.encoding !== undefined) throw new Error();
        return value as T;
    } catch { throw new HttpError(400, 'Le contenu du transfert est invalide.'); }
}

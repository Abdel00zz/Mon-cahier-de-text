export const MAX_JSON_FILE_BYTES = 10 * 1024 * 1024;

/** UTF-8 file budget also applies to pasted JSON; tolerate a UTF-8 BOM. */
export function parseBoundedJson(source: string, maxBytes = MAX_JSON_FILE_BYTES): unknown {
  if (source.length > maxBytes || new TextEncoder().encode(source).byteLength > maxBytes) {
    throw new Error('JSON trop volumineux. Réduisez la taille du fichier.');
  }
  return JSON.parse(source.replace(/^\uFEFF/, ''));
}

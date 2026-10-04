/** Leave room for API framing, uncompressed GET responses and transaction bookkeeping. */
export const MAX_SYNC_WIRE_BYTES = 900_000;
export const MAX_SYNC_EXPANDED_BYTES = 3 * 1024 * 1024;
export const SYNC_ENCODING = 'gzip-base64-v1';

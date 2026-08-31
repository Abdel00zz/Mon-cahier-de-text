export const KEEP_TONES = ['sand', 'mint', 'sky', 'lavender', 'coral'] as const;
/** Stable across sorting/filtering, shared by card and list views. */
export const keepToneForClass = (id: string): typeof KEEP_TONES[number] => {
  let hash = 0;
  for (let index = 0; index < id.length; index++) hash = (Math.imul(hash, 31) + id.charCodeAt(index)) | 0;
  return KEEP_TONES[(hash >>> 0) % KEEP_TONES.length];
};

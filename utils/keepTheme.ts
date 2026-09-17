export const KEEP_TONES = ['sand', 'mint', 'sky', 'lavender', 'coral'] as const;
/** Stable across sorting/filtering, shared by card and list views. */
export const keepToneForClass = (id: string, index?: number): typeof KEEP_TONES[number] => {
  if (typeof index === 'number' && index >= 0) {
    return KEEP_TONES[index % KEEP_TONES.length];
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0;
  return KEEP_TONES[(hash >>> 0) % KEEP_TONES.length];
};

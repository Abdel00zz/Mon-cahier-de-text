/**
 * Tons des cartes de classe : huit familles vives et complémentaires
 * (ambre, orange, lime, émeraude, azur, indigo, orchidée, framboise).
 * Les valeurs de couleur vivent dans `index.css` (`[data-keep-tone]`), qui
 * expose `--keep-vivid` (teinte décorative), `--keep-accent` (déclinaison
 * lisible AA), `--keep-light` / `--keep-dark` (surfaces) et `--keep-border`.
 * Les couleurs distinctes sont attribuées et conservées par `utils/classColors.ts` ;
 * `keepToneForClass` ne sert plus que de repli pour un nom libre.
 */
export const KEEP_TONES = ['sand', 'coral', 'lime', 'mint', 'sky', 'indigo', 'lavender', 'rose'] as const;
/** Stable across sorting/filtering, shared by card and list views. */
export const keepToneForClass = (id: string, index?: number): typeof KEEP_TONES[number] => {
  if (typeof index === 'number' && index >= 0) {
    return KEEP_TONES[index % KEEP_TONES.length];
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0;
  return KEEP_TONES[(hash >>> 0) % KEEP_TONES.length];
};

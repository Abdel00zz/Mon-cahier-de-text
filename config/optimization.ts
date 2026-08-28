/*
 * Découpage du bundle — source unique du budget de performance.
 *
 * La forme objet de `manualChunks` ne regroupe que les modules d'entrée nommés :
 * `vendor: ['react', 'react-dom']` laissait donc l'essentiel de React DOM et
 * du scheduler dans le chunk d'entrée partagé, aux côtés de la table i18n.
 * Résultat mesuré avant correction : un chunk de 454 kB, rechargé intégralement
 * dès qu'une seule chaîne de traduction changeait.
 *
 * La forme fonction classe chaque module par son chemin réel, ce qui garantit
 * trois unités de cache indépendantes :
 *   • `react`  — runtime, ne change qu'aux montées de version ;
 *   • `i18n`   — table de traductions, éditée souvent, partagée par les deux entrées ;
 *   • `ui`/`math` — dépendances lourdes de présentation.
 */

/** Budget d'alerte par chunk non compressé (kB). Référence unique du projet. */
const CHUNK_WARN_LIMIT_KB = 320;

/*
 * N'inscrire ici QUE des dépendances déjà présentes dans le chemin critique.
 * Un chunk manuel est chargé dès qu'un module eager le référence : y placer une
 * dépendance utilisée surtout par des surfaces paresseuses (Radix, immer…) la
 * fait remonter au premier rendu. Mesuré : +75 kB critiques pour `radix` +
 * `editor-vendor`, alors que Rollup les répartissait correctement tout seul.
 */
const vendorGroups: Array<{ chunk: string; test: RegExp }> = [
  // `scheduler` fait partie du runtime : le séparer de react-dom recrée un
  // cycle de chunks que Rollup résout en dupliquant du code.
  { chunk: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
  { chunk: 'math', test: /[\\/]node_modules[\\/]better-react-mathjax[\\/]/ },
  { chunk: 'ui', test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|lucide-react)[\\/]/ },
];

const manualChunks = (id: string): string | undefined => {
  const normalized = id.replace(/\\/g, '/');

  if (!normalized.includes('/node_modules/')) {
    // Table de traductions trilingue : importée de façon synchrone par App.tsx,
    // notificationSignals.ts et useNotificationFeed.ts, donc non différable.
    // L'isoler ne réduit pas le poids initial mais rend son cache indépendant
    // du runtime React, et évite qu'admin.html embarque une copie distincte.
    if (normalized.includes('/i18n/LocaleProvider')) return 'i18n';
    return undefined;
  }

  for (const { chunk, test } of vendorGroups) {
    if (test.test(id)) return chunk;
  }
  return undefined;
};

export const BUNDLE_OPTIMIZATION = {
  MANUAL_CHUNKS: manualChunks,
  CHUNK_WARN_LIMIT_KB,
};

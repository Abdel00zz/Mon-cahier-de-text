/** Budget d'alerte par chunk non compressé (kB). Référence unique du projet. */
const CHUNK_WARN_LIMIT_KB = 320;

const vendorGroups: Array<{ chunk: string; test: RegExp }> = [
  { chunk: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
  { chunk: 'math', test: /[\\/]node_modules[\\/]katex[\\/]/ },
  { chunk: 'ui', test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|lucide-react)[\\/]/ },
];

const manualChunks = (id: string): string | undefined => {
  const normalized = id.replace(/\\/g, '/');

  if (!normalized.includes('/node_modules/')) {
    if (normalized.includes('/src/i18n/')) return 'i18n';
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

/**
 * Bundle optimization configuration for Vite
 */

// Configuration de bundling optimisé
export const BUNDLE_OPTIMIZATION = {
  // Chunks manuels pour un meilleur cache
  MANUAL_CHUNKS: {
    vendor: ['react', 'react-dom'],
    math: ['better-react-mathjax'],
    utils: ['immer'],
    icons: [
      '@fortawesome/react-fontawesome',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
    ]
  },
  
  // Préchargement des modules critiques
  PRELOAD_MODULES: [
    './components/Editor',
    './components/Dashboard',
    './utils/dataUtils'
  ],

  // Budget applicatif premium: avertit si un chunk devient trop lourd
  CHUNK_WARN_LIMIT_KB: 340
};

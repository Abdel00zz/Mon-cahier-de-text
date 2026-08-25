export const BUNDLE_OPTIMIZATION = {
  MANUAL_CHUNKS: {
    vendor: ['react', 'react-dom'],
    math: ['better-react-mathjax'],
    ui: ['lucide-react', 'framer-motion'],
  },
  CHUNK_WARN_LIMIT_KB: 700 // Increased limit to prevent warnings for large app bundles
};

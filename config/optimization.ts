export const BUNDLE_OPTIMIZATION = {
  MANUAL_CHUNKS: {
    vendor: ['react', 'react-dom'],
    math: ['better-react-mathjax'],
    icons: [
      '@fortawesome/react-fontawesome',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
    ],
  },
  CHUNK_WARN_LIMIT_KB: 220
};

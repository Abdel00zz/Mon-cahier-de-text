/**
 * Single source of truth for the "Cahier de textes" / "Cahier d'école" design system.
 */

export const CAHIER_TOKENS = {
  // Couleurs de structure
  colors: {
    paper: '#F6F1E4',
    paperDeep: '#EDE5D0',
    ink: '#2B2620',
    inkSoft: '#6B6255',
    rule: '#D9CFB6',
    binder: '#211D18',
    
    // Feutres de classe (matière / cycle)
    felt: {
      bleu: { base: '#3D6FB4', tint: '#E7EEF8' },
      vert: { base: '#2F7A5C', tint: '#E5F1EA' },
      cerise: { base: '#B23A50', tint: '#F7E7EA' },
      violet: { base: '#6D4FA0', tint: '#EFE9F6' },
      ambre: { base: '#C1791F', tint: '#F7EBDA' },
    },

    // Sémantique fonctionnelle (états système)
    semantic: {
      attention: '#C1791F', // Ambre : à traiter / alerte
      valide: '#2F7A5C',    // Vert : validé / positif
      critique: '#B23A50',  // Cerise : critique / bloquant
      info: '#3D6FB4',      // Bleu : neutre informatif
    },
  },

  // Typographies
  fonts: {
    display: "'Caveat', cursive, sans-serif",
    interface: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  },

  // Espacements et Rayons (grille 4px)
  radius: {
    card: '16px',
    button: '10px',
    chip: '10px',
    pill: '9999px',
    round: '50%',
  },

  // Ombres papier
  shadows: {
    rest: '0 10px 24px -12px rgba(43,38,32,.28), 0 2px 6px -2px rgba(43,38,32,.18)',
    hover: '0 18px 34px -14px rgba(43,38,32,.32), 0 4px 10px -2px rgba(43,38,32,.2)',
  },

  // Micro-rotations déterministes (-0.6° à +0.6°)
  rotations: [-0.6, 0.4, -0.3, 0.6, -0.5, 0.3],
} as const;

export type FeltColorName = keyof typeof CAHIER_TOKENS.colors.felt;
export type SemanticState = keyof typeof CAHIER_TOKENS.colors.semantic;

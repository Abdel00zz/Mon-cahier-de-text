import type { Variants } from 'framer-motion';

/*
 * CASCADE D'ÉTAT VIDE — les variantes réellement consommées.
 *
 * Le conteneur rythme l'arrivée des éléments (stagger), chaque élément suit
 * avec une physique de ressort courte : l'écran se remplit en moins de 400 ms
 * et ne reste jamais à demi visible — une animation d'entrée se termine
 * toujours sur un état PLEIN.
 */

/**
 * Conteneur Cascade Stagger
 * Les éléments enfants apparaissent l'un après l'autre
 */
export const contentContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.12,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12 },
  },
};

/**
 * Éléments individuels en cascade (inputs, boutons, sections)
 */
export const contentItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 26,
    },
  },
};

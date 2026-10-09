import React from 'react';

/**
 * La navigation retour est confiée au bouton natif d'Android et au bouton
 * précédent du navigateur (historique Web / gestes système). Aucun bouton
 * flèche n'est affiché dans l'en-tête de l'éditeur.
 */
export const EditorBackButton: React.FC<{ onBack?: () => void; className?: string }> = () => {
    return null;
};

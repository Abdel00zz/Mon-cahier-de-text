import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Gestionnaire de tooltip global — remplace Tippy.js (CDN) sans dépendance
 * externe. Fonctionne par délégation sur l'attribut `data-tippy-content` déjà
 * présent dans toute l'application : aucun changement requis sur les call
 * sites existants (boutons, icônes...). Désactivé au tactile (pas d'affordance
 * hover), comme le comportement précédent avec Tippy.
 */
export const GlobalTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<{ text: string; top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const show = (event: Event) => {
      const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-tippy-content]');
      if (!target) return;
      const text = target.getAttribute('data-tippy-content');
      if (!text) return;

      const rect = target.getBoundingClientRect();
      const placement = rect.top > 60 ? 'top' : 'bottom';
      setTooltip({
        text,
        left: rect.left + rect.width / 2,
        top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
        placement,
      });
    };

    const hide = (event: Event) => {
      const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-tippy-content]');
      if (target) setTooltip(null);
    };

    document.addEventListener('pointerover', show, true);
    document.addEventListener('pointerout', hide, true);
    document.addEventListener('focusin', show, true);
    document.addEventListener('focusout', hide, true);
    return () => {
      document.removeEventListener('pointerover', show, true);
      document.removeEventListener('pointerout', hide, true);
      document.removeEventListener('focusin', show, true);
      document.removeEventListener('focusout', hide, true);
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <span
      role="tooltip"
      className="app-tooltip pointer-events-none fixed z-[200] -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-white shadow-lg"
      style={{
        left: tooltip.left,
        top: tooltip.top,
        transform: `translate(-50%, ${tooltip.placement === 'top' ? '-100%' : '0'})`,
      }}
    >
      {tooltip.text}
    </span>,
    document.body
  );
};

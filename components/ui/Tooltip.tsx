import React, { useId, useState } from 'react';

/**
 * Tooltip léger maison — remplace Tippy.js (CDN) sans dépendance externe.
 * API volontairement proche de l'ancien attribut `data-tippy-content` :
 * on enveloppe l'élément déclencheur, aucune modification des call-sites
 * n'est requise au-delà du remplacement de l'attribut par ce wrapper.
 */
interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom';
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', disabled = false }) => {
  const [visible, setVisible] = useState(false);
  const id = useId();

  // Tactile : pas d'affordance hover, on n'affiche jamais le tooltip.
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  if (disabled || isTouch || !content) return children;

  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} onFocus={() => setVisible(true)} onBlur={() => setVisible(false)}>
      {React.cloneElement(children, { 'aria-describedby': visible ? id : undefined })}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={`app-tooltip pointer-events-none absolute left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white shadow-lg ${
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
};

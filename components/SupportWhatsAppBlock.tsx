import React from 'react';
import { Button } from '@/components/ui/button';
import { buildSupportWhatsAppUrl, hasSupportWhatsApp } from '@/constants/support';

type SupportLocale = 'fr' | 'ar' | 'en';

/**
 * Pictogramme original (bulle + combiné) évoquant WhatsApp sans reprendre le
 * logo officiel : signale la destination sans dépendre d'une marque déposée.
 */
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
    <path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.4L3.5 20.4l1.4-4.6A8.4 8.4 0 1 1 20.5 11.6Z" />
    <path d="M9.2 8.1c.3-.1.6 0 .8.3l.8 1.3c.1.3.1.6-.1.8l-.6.6c-.2.2-.2.4-.1.6.5.9 1.3 1.6 2.2 2.1.2.1.5.1.6-.1l.6-.6c.2-.2.5-.3.8-.1l1.3.8c.3.2.4.5.3.8-.4 1-1.4 1.6-2.5 1.5-3-.4-5.4-2.8-5.8-5.8-.1-1.1.5-2.1 1.5-2.5Z" />
  </svg>
);

interface SupportWhatsAppBlockProps {
  locale?: SupportLocale;
  /** Texte d'orientation au-dessus du bouton. */
  hint: string;
  /** Libellé du bouton. */
  label: string;
  className?: string;
}

/**
 * Contact du service de création de cahiers de textes, proposé sans
 * acquittement ni case à cocher : une information et une action, rien à
 * valider. Ne rend rien si aucun numéro exploitable n'est configuré
 * (voir `constants/support.ts`).
 *
 * Contraste vérifié : texte vert très foncé sur vert WhatsApp (~7,3:1, AA).
 */
export const SupportWhatsAppBlock: React.FC<SupportWhatsAppBlockProps> = ({
  locale = 'fr',
  hint,
  label,
  className = '',
}) => {
  if (!hasSupportWhatsApp()) return null;

  return (
    <div className={`w-full border-t border-border/60 pt-5 ${className}`}>
      <p className="mx-auto max-w-md text-xs font-medium leading-relaxed text-muted-foreground">
        {hint}
      </p>
      <Button
        asChild
        className="mt-3 h-11 w-full rounded-xl border-0 bg-[#25D366] text-[13px] font-bold text-[#06301F] shadow-sm hover:brightness-105 active:brightness-95 sm:w-auto sm:px-5"
      >
        <a href={buildSupportWhatsAppUrl(locale)} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon className="h-[18px] w-[18px]" />
          {label}
        </a>
      </Button>
    </div>
  );
};

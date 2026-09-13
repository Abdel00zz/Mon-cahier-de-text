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
 * Contraste vérifié : texte blanc sur vert profond (~4,7:1, AA).
 */
export const SupportWhatsAppBlock: React.FC<SupportWhatsAppBlockProps> = ({
  locale = 'fr',
  hint,
  label,
  className = '',
}) => {
  if (!hasSupportWhatsApp()) return null;

  return (
    <div className={`flex w-full flex-col items-center border-t border-border/60 pt-5 text-center ${className}`}>
      <p className="mx-auto max-w-md text-xs font-medium leading-relaxed text-muted-foreground">
        {hint}
      </p>
      <Button
        asChild
        className="mt-4 min-h-14 w-full max-w-[390px] rounded-full border-0 bg-[#2e7d4f] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(44,42,38,0.12)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#286b44] hover:shadow-[0_10px_22px_rgba(44,42,38,0.16)] active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2e7d4f]/60 focus-visible:ring-offset-2 sm:min-h-[54px] sm:w-auto sm:px-8"
      >
        <a href={buildSupportWhatsAppUrl(locale)} target="_blank" rel="noopener noreferrer" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <WhatsAppIcon className="h-6 w-6 shrink-0" />
          {label}
        </a>
      </Button>
    </div>
  );
};

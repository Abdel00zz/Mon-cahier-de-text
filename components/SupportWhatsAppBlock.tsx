import React from 'react';
import { buildSupportWhatsAppUrl, hasSupportWhatsApp } from '@/constants/support';

type SupportLocale = 'fr' | 'ar' | 'en';

/**
 * Icône WhatsApp officielle moderne, nette et haute clarté (vectorielle pleine).
 * Bulle de discussion caractéristique et combiné téléphonique aux courbes épurées.
 */
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
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
    <div
      className={`flex w-full flex-col items-center border-t border-[#e6e1d9] bg-[#f1eee9] px-6 py-6 text-center transition-colors dark:border-[#38332c] dark:bg-[#181614] sm:px-8 sm:py-7 ${className}`}
    >
      <p className="mx-auto max-w-[400px] text-[13.5px] font-normal leading-[1.65] text-[#6b6560] dark:text-[#a8a199]">
        {hint}
      </p>
      <a
        href={buildSupportWhatsAppUrl(locale)}
        target="_blank"
        rel="noopener noreferrer"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2.5 rounded-full bg-[#2e7d4f] px-7 text-[14px] font-semibold text-white shadow-xs transition-all duration-150 hover:-translate-y-px hover:bg-[#256841] hover:shadow-sm active:translate-y-0 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e7d4f] sm:h-12"
      >
        <span>{label}</span>
        <WhatsAppIcon className="h-[21px] w-[21px] shrink-0" />
      </a>
    </div>
  );
};

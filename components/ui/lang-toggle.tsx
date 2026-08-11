import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export type ModalLang = 'fr' | 'ar';

interface UseModalLangOptions {
  /** Démarre en arabe si la langue du document est l'arabe (avant la valeur mémorisée). */
  preferDocumentLang?: boolean;
}

/**
 * Langue d'une modale bilingue FR/AR, mémorisée sous une clé partagée.
 */
export const useModalLang = (
  key: string,
  fallback: ModalLang = 'fr',
  options?: UseModalLangOptions
): { lang: ModalLang; setLang: (lang: ModalLang) => void } => {
  const [lang, setLangState] = useState<ModalLang>(() => {
    const documentIsArabic = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
    if (options?.preferDocumentLang && documentIsArabic) return 'ar';
    try {
      const saved = localStorage.getItem(key);
      return saved === 'ar' || saved === 'fr' ? saved : fallback;
    } catch {
      return fallback;
    }
  });

  const setLang = (next: ModalLang) => {
    setLangState(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // stockage indisponible : le choix vaut pour cette session
    }
  };

  return { lang, setLang };
};

interface LangToggleProps {
  lang: ModalLang;
  onChange: (lang: ModalLang) => void;
  labels?: { fr: React.ReactNode; ar: React.ReactNode };
  className?: string;
}

/** Bascule FR / AR compacte (guide, onboarding, nudge emploi du temps). */
export const LangToggle: React.FC<LangToggleProps> = ({ lang, onChange, labels, className }) => (
  <div role="tablist" aria-label="Langue / اللغة" className={cn('inline-flex items-center rounded-full border border-border bg-muted p-0.5', className)}>
    {(['fr', 'ar'] as const).map(l => {
      const active = lang === l;
      return (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(l)}
          className={cn(
            'flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-[11px] font-bold transition-all duration-200 active:scale-[0.97]',
            active
              ? 'bg-card text-foreground shadow-xs border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {l === 'fr' ? (labels?.fr ?? 'FR') : (labels?.ar ?? 'ع')}
        </button>
      );
    })}
  </div>
);

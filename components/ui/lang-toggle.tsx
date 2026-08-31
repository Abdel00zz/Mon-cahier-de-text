import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CountryFlag } from '@/components/ui/CountryFlags';

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

/** Bascule FR / AR compacte et branchée (guide, onboarding, nudge emploi du temps). */
export const LangToggle: React.FC<LangToggleProps> = ({ lang, onChange, labels, className }) => (
  <div
    role="tablist"
    aria-label="Langue / اللغة"
    className={cn(
      'inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/50 dark:border-amber-500/20 dark:bg-zinc-900/80 p-1 shadow-xs backdrop-blur-xs',
      className
    )}
  >
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
            'flex min-h-8.5 sm:min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 sm:px-4 text-xs font-bold transition-all duration-200 active:scale-[0.97]',
            active
              ? 'bg-[#feefc3] dark:bg-[#41331c] text-[#202124] dark:text-amber-100 shadow-sm border border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-400/30'
              : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed]'
          )}
        >
          <CountryFlag code={l} className="w-5 h-3.5 shadow-2xs rounded-xs shrink-0" />
          <span className={cn(l === 'ar' && 'font-sans font-bold')}>{l === 'fr' ? (labels?.fr ?? 'FR') : (labels?.ar ?? 'العربية')}</span>
        </button>
      );
    })}
  </div>
);

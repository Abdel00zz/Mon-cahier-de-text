import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ModalLang, OnboardingCopy } from '../types';

interface LanguageStepProps {
    lang: ModalLang;
    copy: OnboardingCopy;
    onSelect: (lang: ModalLang) => void;
}

export const LanguageStep = memo<LanguageStepProps>(({ lang, copy, onSelect }) => (
    <div className="space-y-4 animate-fade-in duration-500">
        <p className="text-sm font-medium text-slate-600 sm:text-base">{copy.languageSelect}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['fr', 'ar'] as const).map(language => {
                const active = lang === language;
                return (
                    <button
                        key={language}
                        type="button"
                        onClick={() => onSelect(language)}
                        aria-pressed={active}
                        className={cn(
                            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-600/20 sm:p-8',
                            active
                                ? 'border-[#5064df] bg-[#f4f6ff] text-blue-950 shadow-[0_8px_20px_rgba(80,100,223,0.12)]'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm',
                        )}
                    >
                        <span className="text-base font-bold sm:text-lg">{language === 'fr' ? 'Français' : 'العربية'}</span>
                    </button>
                );
            })}
        </div>
    </div>
));

LanguageStep.displayName = 'LanguageStep';

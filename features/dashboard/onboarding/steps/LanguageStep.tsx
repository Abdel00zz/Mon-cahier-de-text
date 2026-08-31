import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ModalLang, OnboardingCopy } from '../types';

interface LanguageStepProps {
    lang: ModalLang;
    copy: OnboardingCopy;
    onSelect: (lang: ModalLang) => void;
}

export const LanguageStep = memo<LanguageStepProps>(({ lang, copy, onSelect }) => (
    <div className="space-y-5 animate-fade-in duration-500">
        <p className="text-start text-sm font-semibold text-slate-700 sm:text-base">{copy.languageSelect}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(['fr', 'ar'] as const).map(language => {
                const active = lang === language;
                return (
                    <button
                        key={language}
                        type="button"
                        onClick={() => onSelect(language)}
                        aria-pressed={active}
                        className={cn(
                            'keep-surface keep-interactive keep-choice group relative flex cursor-pointer flex-col items-center justify-center gap-3 p-6 text-center sm:p-8',
                        )}
                    >
                        <span lang={language} className="text-lg font-semibold tracking-tight sm:text-xl">
                            {language === 'fr' ? 'Français' : 'العربية'}
                        </span>
                        <span lang={language} className="text-xs text-[#5f6368] dark:text-[#bdc1c6]">
                            {language === 'fr' ? 'Interface en langue française' : 'واجهة باللغة العربية'}
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
));

LanguageStep.displayName = 'LanguageStep';

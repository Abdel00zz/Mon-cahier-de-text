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
                            'group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border p-6 text-center outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-[0.98] sm:p-8',
                            active
                                ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white text-indigo-950 shadow-[0_12px_30px_rgba(99,102,241,0.18)] ring-2 ring-indigo-500/25'
                                : 'border-slate-200/80 bg-white/90 text-slate-700 hover:border-indigo-300 hover:bg-slate-50/80 hover:shadow-sm',
                        )}
                    >
                        {/* Glow accent blob inside active card */}
                        {active && (
                            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-600/20 blur-xl" />
                        )}
                        <span className={cn(
                            'text-lg font-black tracking-tight sm:text-xl transition-colors',
                            active ? 'text-indigo-950' : 'text-slate-800 group-hover:text-indigo-900'
                        )}>
                            {language === 'fr' ? 'Français' : 'العربية'}
                        </span>
                        <span className={cn(
                            'text-xs font-semibold',
                            active ? 'text-indigo-600' : 'text-slate-400'
                        )}>
                            {language === 'fr' ? 'Interface en langue française' : 'واجهة باللغة العربية'}
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
));

LanguageStep.displayName = 'LanguageStep';

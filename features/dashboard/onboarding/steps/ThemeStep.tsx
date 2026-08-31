import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '@/types';
import type { OnboardingCopy } from '../types';

interface ThemeStepProps {
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
    copy: OnboardingCopy;
    isRtl: boolean;
}

export const ThemeStep = memo<ThemeStepProps>(({
    theme,
    onThemeChange,
    isRtl,
}) => {
    return (
        <div className="max-w-2xl space-y-8 animate-fade-in duration-500 mx-auto">
            <div className="text-center space-y-2">
                <h3 className={cn("text-xl font-bold text-slate-800 dark:text-slate-100", isRtl ? "font-ibm-arabic" : "")}>
                    {isRtl ? 'المظهر البصري' : 'Apparence visuelle'}
                </h3>
                <p className={cn("text-sm text-slate-500 dark:text-slate-400", isRtl ? "font-ibm-arabic" : "")}>
                    {isRtl ? 'اختر المظهر الذي يناسبك. يمكنك تغييره لاحقاً.' : 'Choisissez le thème qui vous convient. Vous pourrez le modifier plus tard.'}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { id: 'light', icon: Sun, label: isRtl ? 'فاتح' : 'Clair', desc: isRtl ? 'مشرق وواضح' : 'Lumineux et clair' },
                    { id: 'dark', icon: Moon, label: isRtl ? 'داكن' : 'Sombre', desc: isRtl ? 'مريح للعين' : 'Reposant pour les yeux' },
                    { id: 'system', icon: Monitor, label: isRtl ? 'النظام' : 'Système', desc: isRtl ? 'تلقائي' : 'Automatique' },
                ].map((option) => {
                    const isActive = theme === option.id;
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onThemeChange(option.id as ThemeMode)}
                            aria-pressed={isActive}
                            className={cn(
                                'keep-surface keep-interactive keep-choice group relative flex flex-col items-center justify-center gap-3 p-5 text-center'
                            )}
                        >
                            <div className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-[8px] bg-black/5 dark:bg-white/10'
                            )}>
                                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                            </div>
                            <div>
                                <span className={cn('block font-semibold', isRtl && 'font-ibm-arabic text-lg')}>
                                    {option.label}
                                </span>
                                <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#bdc1c6]">
                                    {option.desc}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

ThemeStep.displayName = 'ThemeStep';

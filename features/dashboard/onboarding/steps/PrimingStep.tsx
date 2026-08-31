import { memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { OnboardingCopy } from '../types';

interface PrimingStepProps {
    copy: OnboardingCopy;
    isRtl: boolean;
    onFinished: () => void;
}

export const PrimingStep = memo<PrimingStepProps>(({
    isRtl,
    onFinished,
}) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer1 = setTimeout(() => setProgress(1), 800);
        const timer2 = setTimeout(() => setProgress(2), 1800);
        const timer3 = setTimeout(() => setProgress(3), 2800);
        const timer4 = setTimeout(() => onFinished(), 3800);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, [onFinished]);

    const title = isRtl ? 'إعداد مساحة العمل الخاصة بك...' : 'Préparation de votre espace...';
    
    const steps = isRtl ? [
        'توليد الوحدات حسب اختياراتك',
        'تحسين جدول الحصص الأسبوعي',
        'تهيئة واجهة المستخدم'
    ] : [
        'Génération des modules selon vos objectifs',
        'Optimisation du programme quotidien',
        'Finalisation de votre espace personnel'
    ];

    return (
        <div className="mx-auto max-w-md py-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col items-center justify-center text-center space-y-8">
                
                <div className="relative flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                    <svg className="absolute inset-0 h-full w-full -rotate-90 text-blue-600" viewBox="0 0 100 100">
                        <circle
                            className="transition-all duration-1000 ease-out"
                            strokeWidth="4"
                            strokeDasharray={283}
                            strokeDashoffset={283 - (283 * Math.max(10, (progress / 3) * 100)) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                        />
                    </svg>
                    {progress === 3 ? (
                        <CheckCircle2 className="h-10 w-10 text-blue-600 animate-in zoom-in duration-300" />
                    ) : (
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    )}
                </div>

                <div className="space-y-2">
                    <h2 className={cn("text-2xl font-black text-slate-900 dark:text-white tracking-tight", isRtl ? "font-ibm-arabic" : "")}>
                        {title}
                    </h2>
                    <p className={cn("text-slate-500 dark:text-slate-400 font-medium", isRtl ? "font-ibm-arabic" : "")}>
                        {isRtl ? 'يرجى الانتظار بضع ثوانٍ' : 'Veuillez patienter quelques instants'}
                    </p>
                </div>

                <div className="w-full space-y-4 text-start bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50">
                    {steps.map((text, index) => {
                        const isActive = progress >= index;
                        const isDone = progress > index;
                        return (
                            <div 
                                key={index} 
                                className={cn(
                                    "flex items-center gap-3 transition-all duration-500",
                                    isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                                )}
                            >
                                <div className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                                    isDone ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-200 text-slate-400 dark:bg-slate-700"
                                )}>
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className={cn(
                                    "text-sm font-semibold transition-colors duration-300",
                                    isDone ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
                                    isRtl ? "font-ibm-arabic" : ""
                                )}>
                                    {text}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

PrimingStep.displayName = 'PrimingStep';

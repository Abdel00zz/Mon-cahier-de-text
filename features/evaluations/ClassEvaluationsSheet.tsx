import React from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { Button } from '@/components/ui/button';
import { CalendarCheck, X } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { DevoirsView } from './DevoirsView';

interface ClassEvaluationsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classInfo: ClassInfo;
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
}

/**
 * Panneau contextuel du cahier ouvert. Il ne propose volontairement aucun
 * sélecteur de classe : toute modification reste rattachée à `classInfo`.
 */
export const ClassEvaluationsSheet: React.FC<ClassEvaluationsSheetProps> = ({
    open,
    onOpenChange,
    classInfo,
    config,
    onConfigChange,
}) => {
    const className = formatClassDisplayName(classInfo.name);
    const { t } = useLocale();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                onSwipeDown={() => onOpenChange(false)}
                className="max-h-[calc(var(--app-viewport-height,100dvh)-max(0.75rem,env(safe-area-inset-top))-0.5rem)] flex flex-col overflow-hidden rounded-t-[28px] border-white/60 bg-white/[0.78] p-0 shadow-[0_-24px_64px_rgba(15,23,42,0.18)] backdrop-blur-3xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-950/[0.78] sm:inset-x-4 sm:mx-auto sm:max-w-4xl sm:rounded-[28px]"
                aria-label={t('evaluationsSheet.aria', { className })}
            >
                <SheetHeader className="shrink-0 z-30 border-b border-white/55 bg-white/[0.48] px-4 pb-3 pt-8 text-start backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/[0.42] sm:px-5 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-primary/12 text-primary shadow-sm dark:border-white/10">
                                <CalendarCheck className="h-4 w-4 stroke-[2.5]" aria-hidden />
                            </span>
                            <SheetTitle className="truncate text-base font-bold text-foreground sm:text-lg">{t('evaluationsSheet.title', { className })}</SheetTitle>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-9 w-9 shrink-0 rounded-full bg-white/65 shadow-sm backdrop-blur-md hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-800"
                            aria-label={t('common.close')}
                        >
                            <span className="sr-only">{t('common.close')}</span>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="evaluation-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white/[0.18] px-3 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bg-transparent sm:px-5 sm:py-5 sm:pb-5">
                    <DevoirsView
                        classes={[classInfo]}
                        config={config}
                        onConfigChange={onConfigChange}
                        embedded
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
};

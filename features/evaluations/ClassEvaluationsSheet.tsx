import React from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { Button } from '@/components/ui/button';
import { CalendarCheck, X } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import {
    Sheet,
    SheetContent,
    SheetDescription,
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
                className="max-h-[95dvh] flex flex-col overflow-hidden rounded-t-[1.5rem] border-t p-0 sm:inset-x-4 sm:mx-auto sm:max-w-5xl"
                aria-label={`Évaluations de ${className}`}
            >
                <SheetHeader className="shrink-0 sticky top-0 z-30 border-b border-border/80 bg-card/95 px-4 py-4 text-start backdrop-blur-xl sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                                <CalendarCheck className="h-5 w-5 stroke-[2.5]" aria-hidden />
                            </span>
                            <SheetTitle className="truncate text-lg font-bold">Évaluations · {className}</SheetTitle>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 shrink-0 rounded-full"
                            aria-label={t('common.close')}
                        >
                            <span className="sr-only">{t('common.close')}</span>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 min-h-0 custom-scrollbar overflow-y-auto px-3 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:px-6 sm:py-6">
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

import React from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { Button } from '@/components/ui/button';
import { CalendarCheck } from '@/components/ui/icons';
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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="max-h-[95dvh] overflow-y-auto rounded-t-[1.5rem] border-t p-0 sm:inset-x-4 sm:mx-auto sm:max-w-5xl"
                aria-label={`Évaluations de ${className}`}
            >
                <SheetHeader className="sticky top-0 z-30 border-b border-border/80 bg-card/95 px-4 py-4 text-left backdrop-blur-xl sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm">
                                <CalendarCheck className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                                <SheetTitle className="truncate">Évaluations · {className}</SheetTitle>
                                <SheetDescription className="mt-1">
                                    Devoirs, activités et parcours officiel de cette classe.
                                </SheetDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-10 shrink-0 px-4 text-xs"
                        >
                            Fermer
                        </Button>
                    </div>
                </SheetHeader>

                <div className="px-3 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:px-6 sm:py-6">
                    <DevoirsView
                        classes={[classInfo]}
                        config={config}
                        onConfigChange={onConfigChange}
                        onOpenNotebook={() => undefined}
                        embedded
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
};

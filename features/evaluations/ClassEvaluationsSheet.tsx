import React from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { CalendarCheck, GraduationCap } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { Modal } from '@/components/ui/modal';
import { DevoirsView } from './DevoirsView';

interface ClassEvaluationsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classInfo: ClassInfo;
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
}

/**
 * Évaluations d'une classe : Modale de gestion pédagogique avancée
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
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            maxWidth="5xl"
            className="sm:max-w-5xl sm:rounded-3xl border border-border/80 shadow-2xl backdrop-blur-md"
            headerClassName="px-5 pt-5 pb-4 sm:px-7 sm:pt-6 sm:pb-4.5 bg-card/85"
            bodyClassName="px-4 py-4 sm:px-7 sm:py-6 max-h-[82vh] overflow-y-auto"
            title={(
                <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
                        <CalendarCheck className="h-5 w-5 stroke-[2]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="block truncate text-base font-bold text-foreground sm:text-lg">
                                {t('evaluationsSheet.title', { className })}
                            </span>
                            {classInfo.subject && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                    <GraduationCap className="h-3 w-3" />
                                    {classInfo.subject}
                                </span>
                            )}
                        </div>
                        <p className="truncate text-xs font-medium text-muted-foreground mt-0.5">
                            {t('evaluations.assessments')} · {t('evaluations.activities')}
                        </p>
                    </div>
                </div>
            )}
            description={<span className="sr-only">{t('evaluationsSheet.aria', { className })}</span>}
        >
            <DevoirsView
                classes={[classInfo]}
                config={config}
                onConfigChange={onConfigChange}
                embedded
            />
        </Modal>
    );
};

import React from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { CalendarCheck, GraduationCap } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
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
    const { t, locale } = useLocale();
    const className = formatLocalizedClassDisplayName(classInfo.name, locale);
    /* Une seule matière ne se distingue de rien : pas de pastille redondante. */
    const showsSubjectLabels = useShowsSubjectLabels();

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            maxWidth="5xl"
            className="evaluation-modal sm:max-w-5xl sm:rounded-2xl"
            headerClassName="border-b border-border/70 bg-card/85 backdrop-blur-md"
            bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
            title={(
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <CalendarCheck className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="block break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
                                {t('evaluationsSheet.title', { className })}
                            </span>
                            {showsSubjectLabels && classInfo.subject && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                    <GraduationCap className="h-3.5 w-3.5 stroke-[2.2]" />
                                    {classInfo.subject}
                                </span>
                            )}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground mt-1">
                            {className}
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

import React from 'react';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { CalendarCheck } from '@/components/ui/icons';
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
 * Évaluations d'une classe : socle commun Modal (bottom-sheet mobile /
 * centrée desktop), une seule implémentation de panneau.
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
            className="sm:max-w-5xl sm:rounded-[32px]"
            headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
            bodyClassName="px-5 py-5 sm:px-7 sm:py-6"
            title={(
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                        <CalendarCheck className="h-5 w-5 stroke-[2.2]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-base font-bold text-foreground sm:text-lg">
                            {t('evaluationsSheet.title', { className })}
                        </span>
                        <span className="block truncate text-xs font-medium text-muted-foreground mt-0.5">
                            {t('evaluations.supervised')} · {t('evaluations.homework', { number: 1 })} · {t('evaluations.activities')}
                        </span>
                    </span>
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

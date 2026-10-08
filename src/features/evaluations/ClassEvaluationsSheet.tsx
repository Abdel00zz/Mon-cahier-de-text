import React from 'react';
import { AppConfig, ClassInfo, ClassEvaluationEntry } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import { Modal } from '@/components/ui/modal';
import './evaluationReference.css';
import { DevoirsView } from './DevoirsView';

interface ClassEvaluationsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classInfo: ClassInfo;
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    entry?: ClassEvaluationEntry;
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
    entry = 'all',
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
            className="evaluation-modal evaluation-reference sm:max-w-5xl sm:rounded-2xl"
            headerClassName="border-b border-border/70 bg-card/85 backdrop-blur-md"
            bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
            title={t('evaluationsSheet.title', { className })}
            description={showsSubjectLabels && classInfo.subject ? `${className} · ${classInfo.subject}` : className}
        >
            <DevoirsView
                key={`${classInfo.id}-${entry}`}
                classInfo={classInfo}
                config={config}
                onConfigChange={onConfigChange}
                entry={entry}
            />
        </Modal>
    );
};

import React from 'react';
import { AppConfig, ClassInfo, ClassEvaluationEntry, LessonsData } from '@/types';
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
    lessonsData?: LessonsData;
    onLessonsChange?: (newLessons: LessonsData) => void;
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
    lessonsData,
    onLessonsChange,
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
            className="evaluation-modal evaluation-reference sm:max-w-5xl sm:rounded-xl"
            headerClassName="border-b border-border/70 bg-card/85 backdrop-blur-md"
            title={
                <span className="main-title inline-flex items-baseline flex-wrap gap-x-2 gap-y-0.5 max-w-full">
                    {/* « : » précédé d'une espace insécable en français seulement. */}
                    <span className="shrink-0">{t('evaluationsSheet.title')}{t('evaluationsSheet.separator')}</span>
                    <span className="class-tag min-w-0 font-bold break-words" dir="auto">{className}</span>
                </span>
            }
            description={showsSubjectLabels && classInfo.subject ? `${className} · ${classInfo.subject}` : className}
        >
            <DevoirsView
                key={`${classInfo.id}-${entry}`}
                classInfo={classInfo}
                config={config}
                onConfigChange={onConfigChange}
                entry={entry}
                lessonsData={lessonsData}
                onLessonsChange={onLessonsChange}
            />
        </Modal>
    );
};

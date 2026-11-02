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

const SHEET_MOBILE_DETENTS = [0.94, 0.96];

/**
 * Évaluations d'une classe : Fiche classe avec bandeau héros coloré,
 * titre en Lalezar souligné d'une vague, étiquette blanche inclinée sous le titre,
 * 4 panneaux colorés et tickets d'évaluation.
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
            maxWidth="4xl"
            mobilePresentation="sheet"
            mobileDetents={SHEET_MOBILE_DETENTS}
            initialMobileDetent={0.94}
            swipeToDismiss={true}
            swipeFromBody={true}
            className="claude-sheet-dialog claude-sheet-dialog--eval"
            headerClassName="border-b-0 px-5 pt-3 pb-2 bg-transparent"
            bodyClassName="px-4 py-2 sm:px-6 sm:py-3"
            description={className}
            title={
                <div className="claude-sheet-header p-0">
                    <div className="flex-1 min-w-0">
                        <h2 className="claude-sheet-title">
                            {t('evaluationsSheet.title')}
                        </h2>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center rounded-lg bg-[var(--cm-sunken)] px-2.5 py-0.5 text-xs font-semibold text-foreground" dir="auto">
                                {className}
                            </span>
                            {showsSubjectLabels && classInfo.subject && (
                                <span className="inline-flex items-center rounded-lg bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground" dir="auto">
                                    {classInfo.subject}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            }
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

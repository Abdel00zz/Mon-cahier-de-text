import React from 'react';
import { AppConfig, ClassInfo, ClassEvaluationEntry, LessonsData } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
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


/** Evaluation workspace with a persistent class context and one scrolling body. */
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
            mobileMaxHeight={0.96}
            swipeToDismiss={true}
            swipeFromBody={true}
            className="claude-sheet-dialog claude-sheet-dialog--eval evaluation-reference"
            headerClassName="border-b-0 px-5 pt-3 pb-2 bg-transparent"
            bodyClassName="px-4 py-2 sm:px-6 sm:py-3"
            description={<span dir="auto">{className}{showsSubjectLabels && classInfo.subject ? ` · ${formatLocalizedSubjectDisplayName(classInfo.subject, locale)}` : ''}</span>}
            title={
                <div className="claude-sheet-header p-0">
                    <div className="flex-1 min-w-0">
                        <span className="claude-sheet-title">
                            {t('evaluationsSheet.title')}
                        </span>
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

import React from 'react';
import { AppConfig, ClassInfo, ClassEvaluationEntry, LessonsData } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import { Modal } from '@/components/ui/modal';
import { pickDepartmentPalette } from '@/features/dashboard/departmentPalette';
import { HeroRoundedShapes, HeroWavyUnderline } from './components/SectionPanelBadge';
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
    const { key: paletteKey } = pickDepartmentPalette(classInfo.color, classInfo.subject, 0);

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            maxWidth="4xl"
            mobileDetents={SHEET_MOBILE_DETENTS}
            initialMobileDetent={0.96}
            swipeToDismiss={true}
            swipeFromBody={true}
            className={`evaluation-modal evaluation-reference eval-hero-tone-${paletteKey} sm:max-w-[46rem] sm:rounded-3xl`}
            headerClassName={`evaluation-hero-header eval-hero-tone-${paletteKey}`}
            title={
                <div className="eval-hero-banner">
                    <HeroRoundedShapes />
                    <div className="eval-hero-content">
                        <span className="main-title eval-hero-title">
                            <span className="eval-hero-title__text">{t('evaluationsSheet.title')}</span>
                            <HeroWavyUnderline className="eval-hero-wave" />
                        </span>
                        <div className="eval-hero-tags">
                            <span className="class-tag eval-course-white-tag" dir="auto">
                                {className}
                            </span>
                            {showsSubjectLabels && classInfo.subject && (
                                <span className="eval-subject-tilted-tag" dir="auto">
                                    {classInfo.subject}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
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

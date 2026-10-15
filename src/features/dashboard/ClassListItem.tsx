import { memo, useMemo, type FC } from 'react';
import { ClassInfo, ClassEvaluationEntry } from '@/types';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { classColorAttributes } from '@/domain/classes/classColors';
import { classCardLabelFor, classIdentityFor } from '@/domain/classes/classIdentity';
import { ClassActionsMenu } from './ClassActionsMenu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useClassPress } from '@/features/dashboard/hooks/useClassPress';
import { formatWithOrdinals } from '@/components/typography/ordinalTypography';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    /** Suppression depuis le menu de la ligne ; le parent confirme l'action. */
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    isActiveSession?: boolean;
}

const ClassListItemComponent: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onDelete,
    onOpenEvaluations,
    isActiveSession,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    /* Une seule matière ne se distingue de rien : ligne masquée (règle partagée). */
    const showsSubjectLabels = useShowsSubjectLabels();
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const label = useMemo(() => classCardLabelFor(identity, locale), [identity, locale]);
    const className = label.fullName;
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className }) : className;
    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            {...classColorAttributes(classInfo)}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                // A shared minimum keeps short rows aligned; long bilingual
                // names and enlarged text can grow without being clipped.
                "class-list-item group",
                isActiveSession && "z-10"
            )}
        >
            <button
                type="button"
                {...pressHandlers}
                className="class-list-item__open"
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: displayName })}
            >
                {label.tier && <span className="class-list-item__level" aria-hidden="true"><span>{formatWithOrdinals(label.tier)}</span></span>}
                <div className="class-list-item__copy">
                    {/* Même échelle que la carte en grille, avec un cran de
                        plus pour l'arabe (lecture plus dense en hauteur). */}
                    <h3
                        aria-live="polite"
                        aria-atomic="true"
                        style={classTitleStyle(isRtl, 'list')}
                        className="class-list-item__title"
                    >
                        <span className="sr-only">{displayName}</span>
                            <span aria-hidden="true" className="class-list-item__identity">
                                {formatWithOrdinals(label.title)}
                                {label.group && <>{'\u00a0'}<bdi className="class-list-item__group" dir="ltr">{label.group}</bdi></>}
                            </span>
                    </h3>
                    {(isActiveSession || (showsSubjectLabels && classInfo.subject)) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                            {isActiveSession && (
                                <span className="class-card__live">
                                    <span className="class-card__live-dot" aria-hidden="true" />
                                    {t('dashboard.welcome.nowTitle')}
                                </span>
                            )}
                            {showsSubjectLabels && classInfo.subject && (
                                <span className="truncate text-xs font-medium" title={formatLocalizedSubjectDisplayName(classInfo.subject, locale)}>
                                    {formatLocalizedSubjectDisplayName(classInfo.subject, locale)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </button>
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="class-list-item__actions"
            >
                <ClassActionsMenu name={displayName} onConfigure={onConfigure} onDelete={onDelete} onOpenEvaluations={onOpenEvaluations}
                        triggerClassName="class-list-item__menu"/>
            </div>
        </article>
    );
};

/** Comparateur : la ligne ne se re-rend que si ses données changent. */
const areEqual = (previous: ClassListItemProps, next: ClassListItemProps) =>
    previous.classInfo.id === next.classInfo.id
    && previous.classInfo.color === next.classInfo.color
    && previous.classInfo.name === next.classInfo.name
    && previous.classInfo.subject === next.classInfo.subject
    && Boolean(previous.onOpenEvaluations) === Boolean(next.onOpenEvaluations)
    && previous.isActiveSession === next.isActiveSession;

ClassListItemComponent.displayName = 'ClassListItem';

export const ClassListItem = memo(ClassListItemComponent, areEqual);

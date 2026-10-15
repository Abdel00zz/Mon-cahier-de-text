import { memo, useMemo, type FC } from 'react';
import { ClassInfo, ClassEvaluationEntry } from '@/types';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { formatClassGroupLabel } from '@/constants/class-levels';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { classColorAttributes } from '@/domain/classes/classColors';
import { classCardLabelFor, classIdentityFor } from '@/domain/classes/classIdentity';
import { ClassActionsMenu } from './ClassActionsMenu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useClassPress } from '@/features/dashboard/hooks/useClassPress';
import { ClassGroupWatermark, ClassLevelBadge } from './ClassLevelBadge';
import { ClassCardTitle } from './ClassCardTitle';
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
                "class-list-item group relative flex min-h-[var(--class-list-row-h)] items-center border-b border-border/60 bg-card",
                isActiveSession && "z-10"
            )}
        >
            <button
                type="button"
                {...pressHandlers}
                className="flex min-h-11 min-w-0 flex-1 self-stretch touch-manipulation items-center gap-2.5 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 text-start outline-none transition-colors hover:bg-muted/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer"
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: displayName })}
            >
                <div className="min-w-0 flex-1 py-0.5">
                    {/* Même échelle que la carte en grille, avec un cran de
                        plus pour l'arabe (lecture plus dense en hauteur). */}
                    <h3
                        aria-live="polite"
                        aria-atomic="true"
                        style={classTitleStyle(isRtl, 'list')}
                        className={cn("keep-class-title min-w-0 text-foreground leading-snug", isRtl ? "text-[15px] sm:text-[15.5px] lg:text-[16px]" : "text-[14px] sm:text-[14.5px] lg:text-[15px]")}
                    >
                        <span className="sr-only">{displayName}</span>
                            <span aria-hidden="true" className="class-list-item__identity flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
                                {label.tier ? (
                                    <ClassLevelBadge
                                        label={label.tier}
                                        subLevel={formatWithOrdinals(label.title)}
                                        accessibleSubLevel={label.title}
                                        tierKey={identity.tierKey}
                                    />
                                ) : (
                                    <span className="min-w-0" title={label.fullName}>
                                        <ClassCardTitle name={label.title} compact wrap />
                                    </span>
                                )}
                                {label.group && (
                                     <ClassGroupWatermark
                                         group={label.group}
                                         label={formatClassGroupLabel(label.group, locale)}
                                         tierKey={identity.tierKey}
                                     />
                                 )}
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
                className="flex shrink-0 items-center pe-1 opacity-100 transition-opacity duration-200"
            >
                <ClassActionsMenu name={displayName} onConfigure={onConfigure} onDelete={onDelete} onOpenEvaluations={onOpenEvaluations}
                        triggerClassName="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"/>
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

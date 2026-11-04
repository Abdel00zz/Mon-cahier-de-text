import { memo, useMemo, type FC } from 'react';
import { Clock } from 'lucide-react';
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
import { useDevice } from '@/hooks/useDevice';
import type { SessionScheduleStatus } from '@/domain/calendar/sessionScheduleStatus';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    /** Suppression depuis le menu de la ligne ; le parent confirme l'action. */
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    isActiveSession?: boolean;
    scheduleStatus?: SessionScheduleStatus;
}

const renderScheduleTime = (timeStr?: string) => {
    if (!timeStr) return null;
    if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':');
        return (
            <span className="class-card__schedule-time font-semibold" dir="ltr">
                <span>{hours}</span>
                <span className="class-card__schedule-colon" aria-hidden="true">:</span>
                <span>{minutes}</span>
            </span>
        );
    }
    return <span className="class-card__schedule-time font-semibold">{timeStr}</span>;
};

const renderScheduleContent = (status: SessionScheduleStatus) => {
    const day = status.dayLabel;
    const time = status.startTimeLabel;
    if (day && time) {
        return (
            <>
                <span className="class-card__schedule-day">{day}</span>
                {renderScheduleTime(time)}
            </>
        );
    }
    const short = status.shortLabel;
    const parts = short.trim().split(/\s+/);
    if (parts.length >= 2 && parts[parts.length - 1].includes(':')) {
        const timePart = parts[parts.length - 1];
        const dayPart = parts.slice(0, parts.length - 1).join(' ');
        return (
            <>
                <span className="class-card__schedule-day">{dayPart}</span>
                {renderScheduleTime(timePart)}
            </>
        );
    }
    return <span>{short}</span>;
};

const ClassListItemComponent: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onDelete,
    onOpenEvaluations,
    isActiveSession,
    scheduleStatus,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const { isPhone, isNative } = useDevice();
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
            data-device-phone={isPhone ? 'true' : undefined}
            data-platform-native={isNative ? 'true' : undefined}
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
                        className="class-list-item__title keep-class-title"
                    >
                        <span className="sr-only">{displayName}</span>
                            <span aria-hidden="true" className="class-list-item__identity">
                                {formatWithOrdinals(label.title)}
                                {label.group && <>{'\u00a0'}<bdi className="class-list-item__group" dir="ltr">{label.group}</bdi></>}
                            </span>
                    </h3>
                    {(isActiveSession || (showsSubjectLabels && classInfo.subject) || (scheduleStatus && scheduleStatus.state !== 'none' && scheduleStatus.shortLabel)) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                            {isActiveSession ? (
                                <span className="class-card__live">
                                    {!isRtl && <span className="class-card__live-dot" aria-hidden="true" />}
                                    <span>{t('dashboard.welcome.nowTitle')}</span>
                                    {scheduleStatus?.remainingMinutes ? (
                                        <span className="class-card__live-remaining">
                                            {locale !== 'ar' && ' · '}
                                            {locale === 'ar' ? `متبقي ${scheduleStatus.remainingMinutes} د` : `reste ${scheduleStatus.remainingMinutes} min`}
                                        </span>
                                    ) : null}
                                </span>
                            ) : scheduleStatus && scheduleStatus.state !== 'none' && scheduleStatus.shortLabel ? (
                                <span className="class-card__schedule-capsule" title={scheduleStatus.label}>
                                    <Clock className="class-card__schedule-icon" aria-hidden="true" />
                                    {renderScheduleContent(scheduleStatus)}
                                </span>
                            ) : null}
                            {scheduleStatus?.sessionHours && scheduleStatus.sessionHours > 1 ? (
                                <span className="class-card__schedule-multihour">{scheduleStatus.sessionHours}{locale === 'ar' ? 'س' : 'h'}</span>
                            ) : null}
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
                <ClassActionsMenu
                    name={displayName}
                    tier={label.tier}
                    subject={classInfo.subject}
                    color={classInfo.color}
                    onConfigure={onConfigure}
                    onDelete={onDelete}
                    onOpenEvaluations={onOpenEvaluations}
                    triggerClassName="class-list-item__menu"
                />
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
    && previous.isActiveSession === next.isActiveSession
    && previous.scheduleStatus === next.scheduleStatus;

ClassListItemComponent.displayName = 'ClassListItem';

export const ClassListItem = memo(ClassListItemComponent, areEqual);

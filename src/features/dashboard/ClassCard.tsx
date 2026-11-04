import { memo, useMemo, type CSSProperties, type FC } from 'react';
import { Clock } from 'lucide-react';
import type { ClassInfo, ClassEvaluationEntry } from '@/types';
import type { SessionScheduleStatus } from '@/domain/calendar/sessionScheduleStatus';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { ClassActionsMenu } from './ClassActionsMenu';
import { classColorAttributes } from '@/domain/classes/classColors';
import { classCardLabelFor, classIdentityFor } from '@/domain/classes/classIdentity';
import { useClassPress } from '@/features/dashboard/hooks/useClassPress';
import { useCardSurface } from './hooks/useCardSurface';
import { cn } from '@/lib/utils';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { ClassGroupWatermark } from './ClassGroupWatermark';
import { formatWithOrdinals } from '@/components/typography/ordinalTypography';
import { useDevice } from '@/hooks/useDevice';
import type { DepartmentPalette } from './departmentPalette';
import './classCardLoading.css';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onOpenSchedule?: (classId: string) => void;
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    index?: number;
    isActiveSession?: boolean;
    scheduleStatus?: SessionScheduleStatus;
    palette?: DepartmentPalette;
}

const renderScheduleTime = (timeStr?: string) => {
    if (!timeStr) return null;
    if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':');
        return (
            <span className="class-card__schedule-time" dir="ltr">
                <span>{hours}</span>
                <span className="class-card__schedule-colon" aria-hidden="true">:</span>
                <span>{minutes}</span>
            </span>
        );
    }
    return <span className="class-card__schedule-time font-semibold">{timeStr}</span>;
};

const renderScheduleContent = (status: SessionScheduleStatus, multiHourBadge?: string | null) => {
    const day = status.dayLabel;
    const time = status.startTimeLabel;
    if (day && time) {
        return (
            <>
                <span className="class-card__schedule-day">{day}</span>
                {renderScheduleTime(time)}
                {multiHourBadge && <span className="class-card__schedule-multihour">{multiHourBadge}</span>}
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
                {multiHourBadge && <span className="class-card__schedule-multihour">{multiHourBadge}</span>}
            </>
        );
    }
    return (
        <>
            <span className="class-card__schedule-day">{short}</span>
            {multiHourBadge && <span className="class-card__schedule-multihour">{multiHourBadge}</span>}
        </>
    );
};

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onOpenSchedule,
    onDelete,
    onOpenEvaluations,
    isActiveSession,
    scheduleStatus,
    palette,
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const { isPhone, isNative } = useDevice();
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const label = useMemo(() => classCardLabelFor(identity, locale), [identity, locale]);
    const { surfaceRef, rippleRef, surfaceHandlers } = useCardSurface();
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className: label.fullName }) : label.fullName;
    const colorAttrs = classColorAttributes(classInfo);
    const multiHourBadge = scheduleStatus?.sessionHours && scheduleStatus.sessionHours > 1
        ? (locale === 'ar' ? `${scheduleStatus.sessionHours}س` : `${scheduleStatus.sessionHours}h`)
        : null;
    const showScheduleLine = !isActiveSession && scheduleStatus && scheduleStatus.state !== 'none' && Boolean(scheduleStatus.shortLabel);

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    const cardStyle = useMemo<CSSProperties>(() => {
        if (!palette) return {};
        return {
            backgroundColor: palette.bg,
            borderColor: isActiveSession ? undefined : palette.border,
            color: palette.title,
            ['--card-bg' as string]: palette.bg,
            ['--card-bg2' as string]: palette.bg2 ?? palette.bg,
            ['--card-border' as string]: palette.border,
            ['--card-title' as string]: palette.title,
            ['--card-secondary' as string]: palette.secondary,
        } as CSSProperties;
    }, [isActiveSession, palette]);

    return (
        <div className="dashboard-class-slot w-full">
            <article
                ref={surfaceRef}
                {...surfaceHandlers}
                dir={isRtl ? 'rtl' : 'ltr'}
                {...colorAttrs}
                data-session-active={isActiveSession ? 'true' : undefined}
                data-session-state={scheduleStatus?.state && scheduleStatus.state !== 'none' ? scheduleStatus.state : undefined}
                data-session-hours={scheduleStatus?.sessionHours && scheduleStatus.sessionHours > 1 ? String(scheduleStatus.sessionHours) : undefined}
                data-device-phone={isPhone ? 'true' : undefined}
                data-platform-native={isNative ? 'true' : undefined}
                style={cardStyle}
                className={cn('class-card group', isActiveSession && 'class-card--active')}
            >
                {/* Zone cliquable sur toute la carte */}
                <button
                    type="button"
                    {...pressHandlers}
                    aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: label.fullName })}
                    className="class-card__open"
                />
                <span className="class-card__sheet" aria-hidden="true" />
                <span className="class-card__feedback" aria-hidden="true">
                    <span ref={rippleRef} className="class-card__ripple" />
                </span>

                {/* Contenu (de droite à gauche en RTL) : Titre & niveau à droite, Pilule horaire poussée à gauche (ms-auto), Menu ⋮ à gauche */}
                <div className="class-card__content">
                    <div className="class-card__text-block">
                        <div className="class-card__identity" data-has-group={label.group ? "true" : undefined}>
                            <h3 style={classTitleStyle(isRtl)} title={label.fullName} className="class-card__title">
                                <span className="sr-only">{label.fullName}</span>
                                <span aria-hidden="true" className="class-card__name">
                                    <span className="class-card__stream">
                                        {formatWithOrdinals(label.title)}
                                        {label.group && <>{'\u00A0'}<ClassGroupWatermark group={label.group} variant="engraved" className="class-card__group" /></>}
                                    </span>
                                </span>
                            </h3>
                        </div>
                        {label.tier && (
                            <div className="class-card__tier-row mt-0.5">
                                <span className="class-card__tier-plain">
                                    {label.tier}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Capsule horaire innovante : poussée à gauche en RTL (ms-auto), à droite en LTR */}
                    {showScheduleLine && scheduleStatus && (
                        <div
                            className="class-card__schedule-capsule"
                            title={scheduleStatus.label}
                            aria-label={scheduleStatus.label}
                        >
                            <Clock className="class-card__schedule-icon" aria-hidden="true" />
                            {renderScheduleContent(scheduleStatus, multiHourBadge)}
                        </div>
                    )}

                    <div className="class-card__actions-block">
                        <ClassActionsMenu
                            name={label.fullName}
                            tier={label.tier}
                            subject={classInfo.subject}
                            color={classInfo.color}
                            palette={palette}
                            onConfigure={onConfigure}
                            onOpenSchedule={onOpenSchedule && (() => onOpenSchedule(classInfo.id))}
                            onDelete={onDelete}
                            onOpenEvaluations={onOpenEvaluations}
                            triggerClassName="class-card__menu"
                        />
                    </div>
                </div>

                {isActiveSession && (
                    <div className="class-card__footer">
                        <span className="class-card__live">
                            {!isRtl && <span className="class-card__live-dot" aria-hidden="true" />}
                            <span>{t('dashboard.welcome.nowTitle')}</span>
                            {scheduleStatus?.remainingMinutes && (
                                <span className="class-card__live-remaining">
                                    {locale === 'ar' ? `${scheduleStatus.remainingMinutes} د` : `· ${scheduleStatus.remainingMinutes} min`}
                                </span>
                            )}
                            {multiHourBadge && (
                                <span className="class-card__live-remaining">
                                    · {multiHourBadge}
                                </span>
                            )}
                        </span>
                    </div>
                )}
            </article>
        </div>
    );
};

const areCardPropsEqual = (previous: ClassCardProps, next: ClassCardProps) =>
    previous.classInfo.id === next.classInfo.id
    && previous.classInfo.color === next.classInfo.color
    && previous.classInfo.name === next.classInfo.name
    && previous.classInfo.subject === next.classInfo.subject
    && previous.index === next.index
    && Boolean(previous.onOpenEvaluations) === Boolean(next.onOpenEvaluations)
    && previous.isActiveSession === next.isActiveSession
    && previous.scheduleStatus === next.scheduleStatus
    && previous.onOpenSchedule === next.onOpenSchedule
    && previous.palette?.bg === next.palette?.bg
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

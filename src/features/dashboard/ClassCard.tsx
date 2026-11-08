import { memo, useMemo, type CSSProperties, type FC } from 'react';
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

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    index?: number;
    isActiveSession?: boolean;
    scheduleStatus?: SessionScheduleStatus;
    palette?: DepartmentPalette;
}

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo,
    onSelect,
    onConfigure,
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

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    const cardStyle = useMemo<CSSProperties>(() => {
        if (!palette) return {};
        return {
            ['--class-palette-bg' as string]: palette.bg,
            ['--class-palette-bg2' as string]: palette.bg2 ?? palette.bg,
            ['--class-palette-border' as string]: palette.border,
            ['--class-palette-title' as string]: palette.title,
            ['--class-palette-secondary' as string]: palette.secondary,
        } as CSSProperties;
    }, [palette]);

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
                style={{ ...colorAttrs.style, ...cardStyle }}
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

                    <div className="class-card__actions-block">
                        <ClassActionsMenu
                            name={label.fullName}
                            tier={label.tier}
                            subject={classInfo.subject}
                            color={classInfo.color}
                            palette={palette}
                            onConfigure={onConfigure}
                            onDelete={onDelete}
                            onOpenEvaluations={onOpenEvaluations}
                            triggerClassName="class-card__menu"
                        />
                    </div>
                </div>
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
    && previous.palette?.bg === next.palette?.bg
    && previous.palette?.bg2 === next.palette?.bg2
    && previous.palette?.border === next.palette?.border
    && previous.palette?.title === next.palette?.title
    && previous.palette?.secondary === next.palette?.secondary
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

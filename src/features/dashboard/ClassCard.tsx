import { memo, useMemo, type FC } from 'react';
import { Clock } from 'lucide-react';
import type { ClassInfo, ClassEvaluationEntry } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSyncProgress } from '@/hooks/useSyncProgress';
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
import type { SessionScheduleStatus } from '@/domain/calendar/sessionScheduleStatus';
import './classCardLoading.css';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    index?: number;
    isActiveSession?: boolean;
    scheduleStatus?: SessionScheduleStatus;
}

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo, onSelect, onConfigure, onDelete, onOpenEvaluations, isActiveSession, scheduleStatus,
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const { isPhone, isNative } = useDevice();
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const label = useMemo(() => classCardLabelFor(identity, locale), [identity, locale]);
    const { surfaceRef, rippleRef, surfaceHandlers } = useCardSurface();
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className: label.fullName }) : label.fullName;
    const color = classColorAttributes(classInfo);
    // Préparation du cahier : la carte garde sa géométrie, un voile discret
    // signale que le contenu de cette classe est encore en route. Un cahier déjà
    // présent n'affiche rien — l'enseignant ne voit un scintillement que
    // lorsqu'il y a réellement quelque chose à attendre.
    const progress = useSyncProgress();
    const hasNotebook = useMemo(() => {
        try { return localStorage.getItem(`classData_v1_${classInfo.id}`) !== null; } catch { return true; }
    }, [classInfo.id, progress.done, progress.state]);
    const preparing = !hasNotebook
        && (progress.state === 'pulling' || (progress.state === 'notebooks' && progress.done < progress.total));
    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    return (
        <div className="dashboard-class-slot"><article
            ref={surfaceRef}
            {...surfaceHandlers}
            dir={isRtl ? 'rtl' : 'ltr'}
            {...color}
            data-session-active={isActiveSession ? 'true' : undefined}
            data-preparing={preparing ? 'true' : undefined}
            data-device-phone={isPhone ? 'true' : undefined}
            data-platform-native={isNative ? 'true' : undefined}
            className={cn('class-card group', isActiveSession && 'class-card--active')}
        >
            <button
                type="button"
                {...pressHandlers}
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: label.fullName })}
                className="class-card__open"
            />
            <span className="class-card__sheet" aria-hidden="true" />
            <span className="class-card__feedback" aria-hidden="true"><span ref={rippleRef} className="class-card__ripple" /></span>

            {preparing && <span className="class-card__loading" aria-hidden="true" />}
            <div className="class-card__body">
                <div className="class-card__header">
                    {label.tier && <span className="class-card__tier" title={label.tier} aria-hidden="true">{label.tier}</span>}
                    <ClassActionsMenu name={label.fullName} onConfigure={onConfigure} onDelete={onDelete} onOpenEvaluations={onOpenEvaluations}
                        triggerClassName="class-card__menu"/>
                </div>
                <div className="class-card__identity" data-has-group={label.group ? "true" : undefined}>
                    <h3 style={classTitleStyle(isRtl)} className="class-card__title">
                        <span className="sr-only">{label.fullName}</span>
                        <span aria-hidden="true" className="class-card__name">
                            <span className="class-card__stream">
                                {formatWithOrdinals(label.title)}
                                {label.group && <>{'\u00A0'}<ClassGroupWatermark group={label.group} variant="engraved" className="class-card__group" /></>}
                            </span>
                        </span>
                    </h3>
                </div>
            </div>
            {isActiveSession ? (
                <div className="class-card__footer">
                    <span className="class-card__live">
                        <span className="class-card__live-dot" aria-hidden="true" />
                        <span>{t('dashboard.welcome.nowTitle')}</span>
                        {scheduleStatus?.remainingMinutes ? (
                            <span className="class-card__live-remaining">
                                {' · '}
                                {locale === 'ar' ? `متبقي ${scheduleStatus.remainingMinutes} د` : `reste ${scheduleStatus.remainingMinutes} min`}
                            </span>
                        ) : null}
                    </span>
                </div>
            ) : scheduleStatus && scheduleStatus.state !== 'none' && scheduleStatus.shortLabel ? (
                <div className="class-card__footer class-card__footer--schedule">
                    <span className="class-card__schedule" title={scheduleStatus.label}>
                        <Clock className="class-card__schedule-icon" aria-hidden="true" />
                        <span>{scheduleStatus.shortLabel}</span>
                    </span>
                </div>
            ) : null}
        </article></div>
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
    && previous.scheduleStatus?.label === next.scheduleStatus?.label
    && previous.scheduleStatus?.remainingMinutes === next.scheduleStatus?.remainingMinutes
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

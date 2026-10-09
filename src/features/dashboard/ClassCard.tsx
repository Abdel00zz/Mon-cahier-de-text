import { memo, useMemo, type FC } from 'react';
import type { ClassInfo, ClassEvaluationEntry } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useLocale } from '@/i18n/LocaleProvider';
import { Clock } from 'lucide-react';
import { ClassActionsMenu } from './ClassActionsMenu';
import { classColorAttributes } from '@/domain/classes/classColors';
import { classOpeningLabel } from '@/infrastructure/storage/classOpening';
import { classCardLabelFor, classIdentityFor } from '@/domain/classes/classIdentity';
import { useClassPress } from '@/features/dashboard/hooks/useClassPress';
import { cn } from '@/lib/utils';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { ClassGroupWatermark } from './ClassLevelBadge';
import { formatWithOrdinals } from '@/components/typography/ordinalTypography';
import { ActiveSessionGlass } from './ActiveSessionGlass';
import './classCardLoading.css';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    index?: number;
    isActiveSession?: boolean;
}

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo, onSelect, onConfigure, onDelete, onOpenEvaluations, isActiveSession,
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const label = useMemo(() => classCardLabelFor(identity, locale), [identity, locale]);
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
    const subtext = useMemo(() => classOpeningLabel(classInfo.lastOpenedAt, locale), [classInfo.lastOpenedAt, locale]);
    const compactSubtext = useMemo(() => classOpeningLabel(classInfo.lastOpenedAt, locale, { compact: true }), [classInfo.lastOpenedAt, locale]);
    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            {...color}
            data-session-active={isActiveSession ? 'true' : undefined}
            data-preparing={preparing ? 'true' : undefined}
            className={cn('class-card group', isActiveSession && 'class-card--active')}
        >
            <button
                type="button"
                {...pressHandlers}
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: label.fullName })}
                title={displayName}
                className="class-card__open"
            />
            <span className="class-card__texture" aria-hidden="true" />

            {preparing && <span className="class-card__loading" aria-hidden="true" />}
            <div className="class-card__body">
                <div className="class-card__header">
                    {isActiveSession && (
                        <span className="class-card__live">
                            <ActiveSessionGlass label={t('dashboard.welcome.nowTitle')} />
                        </span>
                    )}
                    <ClassActionsMenu name={label.fullName} onConfigure={onConfigure} onDelete={onDelete} onOpenEvaluations={onOpenEvaluations}
                        triggerClassName="class-card__menu"/>
                </div>
                <div className="class-card__identity" data-has-group={label.group ? "true" : undefined}>
                    <h3 style={classTitleStyle(isRtl)} className="class-card__title" title={label.fullName}>
                        <span className="sr-only">{label.fullName}</span>
                        <span aria-hidden="true" className="class-card__name">
                            {label.tier && <span className="class-card__tier">{formatWithOrdinals(label.tier)}</span>}
                            <span className="class-card__stream">{formatWithOrdinals(label.title)}</span>
                        </span>
                    </h3>
                    {label.group && (
                        <ClassGroupWatermark group={label.group} variant="engraved" className="class-card__group" />
                    )}
                </div>
            </div>
            <div className="class-card__footer">
                <Clock className="class-card__clock" aria-hidden="true" />
                <span className="class-card__status" title={subtext}>
                    <span className="sr-only">{subtext}</span>
                    <span aria-hidden="true" className="class-card__status-full">{classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{subtext}</time> : subtext}</span>
                    <span aria-hidden="true" className="class-card__status-compact">{classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{compactSubtext}</time> : compactSubtext}</span>
                </span>
            </div>
        </article>
    );
};

const areCardPropsEqual = (previous: ClassCardProps, next: ClassCardProps) =>
    previous.classInfo.id === next.classInfo.id
    && previous.classInfo.color === next.classInfo.color
    && previous.classInfo.name === next.classInfo.name
    && previous.classInfo.lastOpenedAt === next.classInfo.lastOpenedAt
    && previous.classInfo.subject === next.classInfo.subject
    && previous.index === next.index
    && Boolean(previous.onOpenEvaluations) === Boolean(next.onOpenEvaluations)
    && previous.isActiveSession === next.isActiveSession
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

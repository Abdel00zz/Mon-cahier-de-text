import { memo, useMemo, type CSSProperties, type FC } from 'react';
import type { ClassInfo, ClassEvaluationEntry } from '@/types';
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
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    index?: number;
    isActiveSession?: boolean;
    palette?: DepartmentPalette;
}

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onDelete,
    onOpenEvaluations,
    isActiveSession,
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
            backgroundColor: palette.bg,
            borderColor: isActiveSession ? undefined : palette.border,
            color: palette.title,
            ['--card-bg' as string]: palette.bg,
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

                {/* Contenu (de droite à gauche en RTL) : Titre & niveau à droite, Menu ⋮ à gauche */}
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
                            <span className="class-card__tier-plain">
                                {label.tier}
                            </span>
                        )}
                    </div>
                    <div className="class-card__actions-block">
                        <ClassActionsMenu
                            name={label.fullName}
                            onConfigure={onConfigure}
                            onDelete={onDelete}
                            onOpenEvaluations={onOpenEvaluations}
                            triggerClassName="class-card__menu"
                        />
                    </div>
                </div>

                {isActiveSession && (
                    <div className="class-card__footer">
                        <span className="class-card__live">
                            <span>{t('dashboard.welcome.nowTitle')}</span>
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
    && previous.palette?.bg === next.palette?.bg
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

import { memo, useMemo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { ArrowRight, Clock, MoreVertical, Settings, Trash2 } from '@/components/ui/icons';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { keepToneForClass } from '@/utils/keepTheme';
import { classOpeningLabel } from '@/utils/classOpening';
import { classCardLabelFor, classIdentityFor } from '@/utils/classIdentity';
import { useClassPress } from '@/hooks/useClassPress';
import { cn } from '@/lib/utils';
import { formatClassGroupLabel } from '@/constants/class-levels';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { ClassGroupWatermark } from './ClassLevelBadge';
import { formatWithOrdinals } from '@/utils/ordinalTypography';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onDelete?: () => void;
    index?: number;
    isActiveSession?: boolean;
}

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo, onSelect, onConfigure, onDelete, isActiveSession,
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const label = useMemo(() => classCardLabelFor(identity, locale), [identity, locale]);
    const title = [label.tier, label.title].filter(Boolean).join(' ');
    // Le dernier mot et son groupe restent ensemble, même si le titre se replie.
    const lastSpace = title.lastIndexOf(' ');
    const titleStart = label.group && lastSpace >= 0 ? title.slice(0, lastSpace + 1) : '';
    const titleEnd = titleStart ? title.slice(lastSpace + 1) : title;
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className: label.fullName }) : label.fullName;
    // La couleur suit la classe, même après un tri ou un filtre.
    const tone = keepToneForClass(classInfo.id || classInfo.name);
    const subtext = useMemo(() => classOpeningLabel(classInfo.lastOpenedAt, locale), [classInfo.lastOpenedAt, locale]);
    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            data-keep-tone={tone}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn('class-card group', isActiveSession && 'class-card--active')}
        >
            <button
                type="button"
                {...pressHandlers}
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: label.fullName })}
                title={displayName}
                className="class-card__open"
            />
            <span className="class-card__light" aria-hidden="true" />
            <div className="class-card__body">
                <div className="class-card__header">
                    {isActiveSession && (
                        <span className="class-card__live">
                            <span aria-hidden="true" />
                            {locale === 'ar' ? 'جلسة جارية' : locale === 'en' ? 'Live' : 'En cours'}
                        </span>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                onClick={event => event.stopPropagation()}
                                className="class-card__menu"
                                title={t('dashboard.classActions', { className: label.fullName })}
                                aria-label={t('dashboard.classActions', { className: label.fullName })}
                            >
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[10.5rem]">
                            <DropdownMenuItem onSelect={() => { impact('light'); onConfigure(); }}>
                                <Settings aria-hidden="true" />
                                {t('dashboard.classSettings')}
                            </DropdownMenuItem>
                            {onDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem destructive onSelect={() => { impact('medium'); onDelete(); }}>
                                        <Trash2 aria-hidden="true" />
                                        {t('dashboard.delete')}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="class-card__identity">
                    <h3 style={classTitleStyle(isRtl)} className="class-card__title" title={label.fullName}>
                        <span className="sr-only">{label.fullName}</span>
                        <span aria-hidden="true">
                            {formatWithOrdinals(titleStart)}
                            <span className={label.group ? 'class-card__title-end' : undefined}>
                                {formatWithOrdinals(titleEnd)}
                                {label.group && (
                                    <ClassGroupWatermark
                                        group={label.group}
                                        label={formatClassGroupLabel(label.group, locale)}
                                        themeTone={tone}
                                        variant="end"
                                        className="class-card__group"
                                    />
                                )}
                            </span>
                        </span>
                    </h3>
                </div>
            </div>
            <div className="class-card__footer">
                <Clock className="class-card__clock" aria-hidden="true" />
                <span className="class-card__status" title={subtext}>
                    {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{subtext}</time> : subtext}
                </span>
                <ArrowRight className="class-card__arrow" aria-hidden="true" />
            </div>
        </article>
    );
};

const areCardPropsEqual = (previous: ClassCardProps, next: ClassCardProps) =>
    previous.classInfo.id === next.classInfo.id
    && previous.classInfo.name === next.classInfo.name
    && previous.classInfo.lastOpenedAt === next.classInfo.lastOpenedAt
    && previous.classInfo.subject === next.classInfo.subject
    && previous.index === next.index
    && previous.isActiveSession === next.isActiveSession
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

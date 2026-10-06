import { memo, useMemo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useLocale } from '@/i18n/LocaleProvider';
import { Clock, MoreVertical, Settings, Trash2 } from '@/components/ui/icons';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
                        <span aria-hidden="true">{formatWithOrdinals(title)}</span>
                    </h3>
                    {/* Le numéro de groupe suit immédiatement le nom et le dépasse en
                        taille : gravé dans la carte, il se lit comme un filigrane du
                        titre — « 2ème Bac PC · 3 » — au lieu d'un chiffre isolé dans
                        un coin. Il est décoratif (le nom accessible ET son infobulle
                        portent déjà le groupe). */}
                    {label.group && (
                        <ClassGroupWatermark
                            group={label.group}
                            variant="engraved"
                            className="class-card__group"
                        />
                    )}
                </div>
            </div>
            <div className="class-card__footer">
                <Clock className="class-card__clock" aria-hidden="true" />
                <span className="class-card__status" title={subtext}>
                    {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{subtext}</time> : subtext}
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
    && previous.isActiveSession === next.isActiveSession
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';
export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);

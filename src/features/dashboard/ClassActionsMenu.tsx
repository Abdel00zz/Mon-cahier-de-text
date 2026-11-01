import { useCallback, useEffect, useId, type CSSProperties } from 'react';
import { create } from 'zustand';
import { MoreVertical, Pencil, CalendarCheck } from 'lucide-react';
import { Trash2 } from '@/components/ui/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { ClassEvaluationEntry } from '@/types';
import { pickDepartmentPalette, type DepartmentPalette } from './departmentPalette';

/** Registre global Zustand assurant qu'un seul menu de classe ne peut être ouvert à la fois */
const useActiveClassMenuStore = create<{
    activeMenuId: string | null;
    setActiveMenu: (id: string | null) => void;
}>((set) => ({
    activeMenuId: null,
    setActiveMenu: (id) => set({ activeMenuId: id }),
}));

export function ClassActionsMenu({
    name,
    triggerClassName,
    onConfigure,
    onDelete,
    onOpenEvaluations,
    tier,
    subject,
    color,
    palette,
}: {
    name: string;
    triggerClassName: string;
    onConfigure: () => void;
    onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
    tier?: string | null;
    subject?: string | null;
    color?: string | null;
    palette?: DepartmentPalette;
}) {
    const { t, locale, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const generatedId = useId();
    const menuId = `${name}-${generatedId}`;
    const isOpen = useActiveClassMenuStore(state => state.activeMenuId === menuId);
    const setActiveMenu = useActiveClassMenuStore(state => state.setActiveMenu);
    const resolvedPalette = palette ?? pickDepartmentPalette(color ?? undefined, subject ?? undefined, 0).palette;

    useEffect(() => {
        return () => {
            if (useActiveClassMenuStore.getState().activeMenuId === menuId) {
                setActiveMenu(null);
            }
        };
    }, [menuId, setActiveMenu]);

    const handleOpenChange = useCallback((open: boolean) => {
        if (open) {
            setActiveMenu(menuId);
        } else if (useActiveClassMenuStore.getState().activeMenuId === menuId) {
            setActiveMenu(null);
        }
    }, [menuId, setActiveMenu]);

    const open = (entry: ClassEvaluationEntry) => {
        impact('light');
        setActiveMenu(null);
        onOpenEvaluations?.(entry);
    };

    const miniCardStyle: CSSProperties = {
        ['--hero-bg' as string]: resolvedPalette.bg,
        ['--hero-border' as string]: resolvedPalette.border,
        ['--hero-ink' as string]: resolvedPalette.title,
        ['--hero-secondary' as string]: resolvedPalette.secondary,
    };

    const editLabel = locale === 'ar' ? 'تعديل' : t('dashboard.classSettings');
    const deleteLabel = locale === 'ar' ? 'حذف' : t('dashboard.delete');
    const cancelLabel = locale === 'ar' ? 'إلغاء' : locale === 'en' ? 'Cancel' : 'Annuler';

    return (
        <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'} open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={event => event.stopPropagation()}
                    className={triggerClassName}
                    title={t('dashboard.classActions', { className: name })}
                    aria-label={t('dashboard.classActions', { className: name })}
                >
                    <MoreVertical className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={isRtl ? 'start' : 'end'}
                sideOffset={6}
                style={miniCardStyle}
                className="class-actions-menu w-[16.25rem] max-w-[calc(100vw-1.5rem)]"
            >
                <div className="class-menu-grab" aria-hidden="true" />

                {onOpenEvaluations && (
                    <div className="class-menu-top-action">
                        <DropdownMenuItem
                            onSelect={() => open('all')}
                            className="class-menu-eval-pill"
                        >
                            <span className="class-menu-eval-pill__icon" aria-hidden="true">
                                <CalendarCheck className="h-4 w-4 shrink-0 stroke-[2]" />
                            </span>
                            <span className="truncate">{t('dashboard.openEvaluations')}</span>
                        </DropdownMenuItem>
                    </div>
                )}

                {/* Deux boutons compacts et modernes « تعديل » et « حذف » */}
                <div className="class-menu-round-tiles">
                    <DropdownMenuItem
                        onSelect={() => {
                            impact('light');
                            setActiveMenu(null);
                            onConfigure();
                        }}
                        className="class-menu-round-tile class-menu-round-tile--edit"
                    >
                        <span className="class-menu-round-tile__icon" aria-hidden="true">
                            <Pencil className="h-4 w-4 stroke-[2]" />
                        </span>
                        <span className="class-menu-round-tile__label">{editLabel}</span>
                    </DropdownMenuItem>

                    {onDelete && (
                        <DropdownMenuItem
                            destructive
                            onSelect={() => {
                                impact('medium');
                                setActiveMenu(null);
                                onDelete();
                            }}
                            className="class-menu-round-tile class-menu-round-tile--delete"
                        >
                            <span className="class-menu-round-tile__icon" aria-hidden="true">
                                <Trash2 size={16} aria-hidden="true" />
                            </span>
                            <span className="class-menu-round-tile__label">{deleteLabel}</span>
                        </DropdownMenuItem>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setActiveMenu(null)}
                    className="class-menu-cancel"
                >
                    {cancelLabel}
                </button>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

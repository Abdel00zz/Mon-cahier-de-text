import { useCallback, useEffect, useId, type CSSProperties } from 'react';
import { create } from 'zustand';
import { MoreVertical, Pencil, CalendarCheck } from 'lucide-react';
import { Trash2 } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { ClassEvaluationEntry } from '@/types';
import { pickDepartmentPalette, type DepartmentPalette } from './departmentPalette';

const CLASS_MENU_DETENTS = [0.38, 0.52];

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

    const closeMenu = useCallback(() => {
        if (useActiveClassMenuStore.getState().activeMenuId === menuId) {
            setActiveMenu(null);
        }
    }, [menuId, setActiveMenu]);

    const openEvaluations = (entry: ClassEvaluationEntry) => {
        impact('light');
        setActiveMenu(null);
        onOpenEvaluations?.(entry);
    };

    const sheetStyle: CSSProperties = {
        ['--hero-bg' as string]: resolvedPalette.bg,
        ['--hero-border' as string]: resolvedPalette.border,
        ['--hero-ink' as string]: resolvedPalette.title,
        ['--hero-secondary' as string]: resolvedPalette.secondary,
    };

    const editLabel = locale === 'ar' ? 'تعديل' : t('dashboard.classSettings');
    const deleteLabel = locale === 'ar' ? 'حذف' : t('dashboard.delete');
    const cancelLabel = locale === 'ar' ? 'إلغاء' : locale === 'en' ? 'Cancel' : 'Annuler';

    return (
        <>
            <button
                type="button"
                data-state={isOpen ? 'open' : 'closed'}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                onClick={event => {
                    event.stopPropagation();
                    impact('light');
                    setActiveMenu(isOpen ? null : menuId);
                }}
                className={triggerClassName}
                title={t('dashboard.classActions', { className: name })}
                aria-label={t('dashboard.classActions', { className: name })}
            >
                <MoreVertical className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden="true" />
            </button>

            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={closeMenu}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    hideClose
                    dragHandle
                    swipeToDismiss
                    swipeFromBody
                    mobilePresentation="sheet"
                    mobileDetents={CLASS_MENU_DETENTS}
                    maxWidth="sm"
                    elevation="high"
                    className="class-actions-sheet"
                    bodyClassName="class-actions-sheet__body"
                >
                    <div style={sheetStyle} className="class-actions-menu-surface">
                        {onOpenEvaluations && (
                            <div className="class-menu-top-action">
                                <button
                                    type="button"
                                    onClick={() => openEvaluations('all')}
                                    className="class-menu-eval-pill"
                                >
                                    <span className="class-menu-eval-pill__icon" aria-hidden="true">
                                        <CalendarCheck className="h-4 w-4 shrink-0 stroke-[2]" />
                                    </span>
                                    <span className="truncate">{t('dashboard.openEvaluations')}</span>
                                </button>
                            </div>
                        )}

                        <div className="class-menu-round-tiles">
                            <button
                                type="button"
                                onClick={() => {
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
                            </button>

                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
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
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={closeMenu}
                            className="class-menu-cancel"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}

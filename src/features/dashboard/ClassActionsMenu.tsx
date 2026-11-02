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
                    mobileDetents={[0.38, 0.48]}
                    maxWidth="sm"
                    className="claude-sheet-dialog"
                    bodyClassName="p-0 pb-4"
                >
                    <div className="flex flex-col text-start">
                        {/* En-tête : titre serif + sous-titre discret */}
                        <div className="claude-sheet-header pb-2">
                            <div>
                                <h3 className="claude-sheet-title">
                                    {name}
                                </h3>
                                {(tier || subject) && (
                                    <p className="claude-sheet-subtitle">
                                        {[tier, subject].filter(Boolean).join(' • ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Liste groupée de 3 lignes (56px min chacune) */}
                        <div className="claude-grouped-list my-2">
                            {onOpenEvaluations && (
                                <button
                                    type="button"
                                    onClick={() => openEvaluations('all')}
                                    className="claude-list-item"
                                >
                                    <CalendarCheck className="claude-list-item-icon" />
                                    <span className="flex-1 font-medium text-[15px] sm:text-[16px]">
                                        {t('dashboard.openEvaluations')}
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    impact('light');
                                    setActiveMenu(null);
                                    onConfigure();
                                }}
                                className="claude-list-item"
                            >
                                <Pencil className="claude-list-item-icon" />
                                <span className="flex-1 font-medium text-[15px] sm:text-[16px]">
                                    {editLabel}
                                </span>
                            </button>

                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        impact('medium');
                                        setActiveMenu(null);
                                        onDelete();
                                    }}
                                    className="claude-list-item claude-list-item--danger"
                                >
                                    <Trash2 className="claude-list-item-icon" />
                                    <span className="flex-1 font-semibold text-[15px] sm:text-[16px]">
                                        {deleteLabel}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Bouton Annuler 52px en bas */}
                        <div className="px-5 pt-2">
                            <button
                                type="button"
                                onClick={closeMenu}
                                className="claude-btn-cancel"
                            >
                                {cancelLabel}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

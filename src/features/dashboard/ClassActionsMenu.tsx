import { useCallback, useEffect, useId } from 'react';
import { create } from 'zustand';
import { MoreVertical, Pencil, CalendarCheck } from 'lucide-react';
import { Trash2 } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { ClassEvaluationEntry } from '@/types';
import type { DepartmentPalette } from './departmentPalette';
import './classActionsSheet.css';

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

    const editLabel = locale === 'ar' ? 'تعديل' : t('dashboard.classSettings');
    const deleteLabel = locale === 'ar' ? 'حذف' : t('dashboard.delete');
    const title = locale === 'ar' ? 'إجراءات القسم' : locale === 'en' ? 'Class actions' : 'Actions de la classe';

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
                    title={title}
                    dragHandle
                    swipeToDismiss
                    swipeFromBody
                    mobilePresentation="sheet"
                    mobileMaxHeight={0.72}
                    maxWidth="sm"
                    className="class-quick-sheet"
                    headerClassName="class-quick-sheet__header"
                    bodyClassName="class-quick-sheet__body"
                >
                    <div className="class-quick-sheet__actions hub-grid" data-tiles>
                        {onOpenEvaluations && (
                            <button
                                type="button"
                                onClick={() => openEvaluations('all')}
                                data-tone="blue"
                                data-layout="tile"
                                className="class-quick-sheet__action hub-card"
                            >
                                <span className="hub-card__icon" aria-hidden="true"><CalendarCheck /></span>
                                <span className="hub-card__title">{t('dashboard.openEvaluations')}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                impact('light');
                                setActiveMenu(null);
                                onConfigure();
                            }}
                            data-tone="violet"
                            data-layout="tile"
                            className="class-quick-sheet__action hub-card"
                        >
                            <span className="hub-card__icon" aria-hidden="true"><Pencil /></span>
                            <span className="hub-card__title">{editLabel}</span>
                        </button>

                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    impact('medium');
                                    setActiveMenu(null);
                                    onDelete();
                                }}
                                data-tone="rose"
                                data-layout="tile"
                                className="class-quick-sheet__action class-quick-sheet__action--danger hub-card"
                            >
                                <span className="hub-card__icon" aria-hidden="true"><Trash2 /></span>
                                <span className="hub-card__title">{deleteLabel}</span>
                            </button>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
}

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { moveVisibleDashboardClass } from '../utils/classOrder';

interface ActiveDrag {
    id: string;
    originalOrder: string[];
    currentOrder: string[];
    visibleIds: Set<string>;
    lastTargetId: string | null;
    touch: boolean;
}

interface PendingTouch {
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
}

interface UseDashboardClassDragOptions {
    fullOrder: string[];
    visibleOrder: string[];
    nativeDrag: boolean;
    onCommit: (order: string[]) => void;
}

/** DnD sans dépendance : aperçu en mémoire, une seule persistance au dépôt. */
export const useDashboardClassDrag = ({ fullOrder, visibleOrder, nativeDrag, onCommit }: UseDashboardClassDragOptions) => {
    const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const activeRef = useRef<ActiveDrag | null>(null);
    const pendingTouchRef = useRef<PendingTouch | null>(null);
    const suppressClickRef = useRef(false);
    const commitRef = useRef(onCommit);
    commitRef.current = onCommit;

    const clearPendingTouch = useCallback(() => {
        const pending = pendingTouchRef.current;
        if (pending) clearTimeout(pending.timer);
        pendingTouchRef.current = null;
    }, []);

    const begin = useCallback((id: string, touch: boolean, order: string[], visible: string[]) => {
        activeRef.current = {
            id,
            originalOrder: order,
            currentOrder: order,
            visibleIds: new Set(visible),
            lastTargetId: id,
            touch,
        };
        if (touch) suppressClickRef.current = true;
        setPreviewOrder(order);
        setDraggingId(id);
    }, []);

    const moveTo = useCallback((targetId: string) => {
        const active = activeRef.current;
        if (!active || targetId === active.id || targetId === active.lastTargetId || !active.visibleIds.has(targetId)) return;
        active.lastTargetId = targetId;
        const visible = active.currentOrder.filter(id => active.visibleIds.has(id));
        const next = moveVisibleDashboardClass(active.currentOrder, visible, active.id, targetId);
        if (next.every((id, index) => id === active.currentOrder[index])) return;
        active.currentOrder = next;
        setPreviewOrder(next);
    }, []);

    const finish = useCallback((commit: boolean) => {
        clearPendingTouch();
        const active = activeRef.current;
        activeRef.current = null;
        setDraggingId(null);
        setPreviewOrder(null);
        if (commit && active && active.currentOrder.some((id, index) => id !== active.originalOrder[index])) {
            commitRef.current(active.currentOrder);
        }
        if (active?.touch) {
            window.setTimeout(() => { suppressClickRef.current = false; }, 80);
        }
    }, [clearPendingTouch]);

    useEffect(() => {
        const pointerMove = (event: globalThis.PointerEvent) => {
            const pending = pendingTouchRef.current;
            if (pending && !activeRef.current) {
                if (event.pointerId !== pending.pointerId) return;
                if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) > 12) clearPendingTouch();
                return;
            }
            const active = activeRef.current;
            if (!active?.touch) return;
            event.preventDefault();
            const target = document.elementFromPoint(event.clientX, event.clientY)
                ?.closest<HTMLElement>('[data-class-drop-id]');
            const targetId = target?.dataset.classDropId;
            if (targetId) moveTo(targetId);
        };
        const pointerUp = (event: globalThis.PointerEvent) => {
            const pending = pendingTouchRef.current;
            if (pending && event.pointerId === pending.pointerId) clearPendingTouch();
            if (activeRef.current?.touch) finish(true);
        };
        const pointerCancel = () => {
            if (activeRef.current?.touch) finish(false);
            else clearPendingTouch();
        };
        window.addEventListener('pointermove', pointerMove, { passive: false });
        window.addEventListener('pointerup', pointerUp);
        window.addEventListener('pointercancel', pointerCancel);
        return () => {
            clearPendingTouch();
            window.removeEventListener('pointermove', pointerMove);
            window.removeEventListener('pointerup', pointerUp);
            window.removeEventListener('pointercancel', pointerCancel);
        };
    }, [clearPendingTouch, finish, moveTo]);

    const propsFor = useCallback((id: string) => ({
        draggable: nativeDrag,
        'data-class-drop-id': id,
        onDragStartCapture: (event: DragEvent<HTMLElement>) => {
            if (!nativeDrag) return;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', id);
            begin(id, false, fullOrder, visibleOrder);
        },
        onDragEnterCapture: (event: DragEvent<HTMLElement>) => {
            if (!activeRef.current) return;
            event.preventDefault();
            moveTo(id);
        },
        onDragOverCapture: (event: DragEvent<HTMLElement>) => {
            if (!activeRef.current) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        },
        onDropCapture: (event: DragEvent<HTMLElement>) => {
            if (!activeRef.current) return;
            event.preventDefault();
            finish(true);
        },
        onDragEndCapture: () => finish(true),
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            if ((event.pointerType !== 'touch' && event.pointerType !== 'pen') || !event.isPrimary || event.button !== 0) return;
            if ((event.target as Element).closest('[data-class-drag-ignore]')) return;
            clearPendingTouch();
            const pending: PendingTouch = {
                id,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                timer: window.setTimeout(() => {
                    if (pendingTouchRef.current !== pending) return;
                    pendingTouchRef.current = null;
                    begin(id, true, fullOrder, visibleOrder);
                    navigator.vibrate?.(8);
                }, 260),
            };
            pendingTouchRef.current = pending;
        },
        onClickCapture: (event: MouseEvent<HTMLElement>) => {
            if (!suppressClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
        },
        onContextMenu: (event: MouseEvent<HTMLElement>) => {
            if (activeRef.current?.touch) event.preventDefault();
        },
        onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
            if (!event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            const index = visibleOrder.indexOf(id);
            const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
            const targetId = visibleOrder[index + direction];
            if (!targetId) return;
            event.preventDefault();
            event.stopPropagation();
            commitRef.current(moveVisibleDashboardClass(fullOrder, visibleOrder, id, targetId));
        },
    }), [begin, clearPendingTouch, finish, fullOrder, moveTo, nativeDrag, visibleOrder]);

    return { previewOrder, draggingId, propsFor };
};

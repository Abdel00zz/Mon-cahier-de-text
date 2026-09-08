import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { moveVisibleDashboardClass } from '../utils/classOrder';
import { classifyClassTouch } from '../utils/classTouchGesture';

interface ActiveDrag {
    id: string;
    originalOrder: string[];
    currentOrder: string[];
    visibleIds: Set<string>;
    lastTargetId: string | null;
    touch: boolean;
    pointerId?: number;
}

interface PendingTouch {
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    startedAt: number;
    order: string[];
    visible: string[];
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
        pendingTouchRef.current = null;
    }, []);

    const begin = useCallback((id: string, touch: boolean, order: string[], visible: string[], pointerId?: number) => {
        activeRef.current = {
            id,
            originalOrder: order,
            currentOrder: order,
            visibleIds: new Set(visible),
            lastTargetId: id,
            touch,
            pointerId,
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
                const gesture = classifyClassTouch(
                    performance.now() - pending.startedAt,
                    Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY),
                );
                if (gesture === 'wait') return;
                clearPendingTouch();
                if (gesture !== 'drag') return;
                begin(pending.id, true, pending.order, pending.visible, pending.pointerId);
                try { navigator.vibrate?.(8); } catch { /* Optional haptic. */ }
            }
            const active = activeRef.current;
            if (!active?.touch || event.pointerId !== active.pointerId) return;
            event.preventDefault();
            const target = document.elementFromPoint(event.clientX, event.clientY)
                ?.closest<HTMLElement>('[data-class-drop-id]');
            const targetId = target?.dataset.classDropId;
            if (targetId) moveTo(targetId);
        };
        const pointerUp = (event: globalThis.PointerEvent) => {
            const pending = pendingTouchRef.current;
            if (pending && event.pointerId === pending.pointerId) clearPendingTouch();
            if (activeRef.current?.touch && event.pointerId === activeRef.current.pointerId) finish(true);
        };
        const pointerCancel = (event: globalThis.PointerEvent) => {
            if (activeRef.current?.touch && event.pointerId === activeRef.current.pointerId) finish(false);
            else if (event.pointerId === pendingTouchRef.current?.pointerId) clearPendingTouch();
        };
        // Cancel native scrolling only after the user has actually begun reordering.
        const touchMove = (event: TouchEvent) => {
            if (activeRef.current?.touch && event.cancelable) event.preventDefault();
        };
        window.addEventListener('touchmove', touchMove, { passive: false });
        window.addEventListener('pointermove', pointerMove, { passive: false });
        window.addEventListener('pointerup', pointerUp);
        window.addEventListener('pointercancel', pointerCancel);
        return () => {
            clearPendingTouch();
            window.removeEventListener('touchmove', touchMove);
            window.removeEventListener('pointermove', pointerMove);
            window.removeEventListener('pointerup', pointerUp);
            window.removeEventListener('pointercancel', pointerCancel);
        };
    }, [begin, clearPendingTouch, finish, moveTo]);

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
            if (activeRef.current) return;
            suppressClickRef.current = false;
            clearPendingTouch();
            const pending: PendingTouch = {
                id,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startedAt: performance.now(),
                order: fullOrder,
                visible: visibleOrder,
            };
            pendingTouchRef.current = pending;
        },
        onClickCapture: (event: MouseEvent<HTMLElement>) => {
            if (!suppressClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
        },
        onContextMenu: (event: MouseEvent<HTMLElement>) => {
            clearPendingTouch();
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

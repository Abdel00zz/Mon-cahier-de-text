import { useEffect, useRef, type PointerEvent } from 'react';

/** Pointer feedback stays on the card, without React renders or a perpetual loop. */
export function useCardSurface() {
    const surfaceRef = useRef<HTMLElement>(null);
    const rippleRef = useRef<HTMLSpanElement>(null);
    const bounds = useRef<DOMRect | null>(null);
    const pending = useRef<number | null>(null);
    const point = useRef({ x: 0, y: 0 });
    const policy = useRef({ motion: false, hover: false });
    const cancel = () => {
        if (pending.current !== null) cancelAnimationFrame(pending.current);
        pending.current = null;
    };
    useEffect(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const hover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 640px)');
        const sync = () => {
            policy.current = { motion: !reduced.matches && !document.hidden, hover: hover.matches };
            if (!policy.current.motion || !policy.current.hover) cancel();
            if (!policy.current.motion) rippleRef.current?.getAnimations().forEach(animation => animation.cancel());
        };
        sync();
        reduced.addEventListener('change', sync);
        hover.addEventListener('change', sync);
        document.addEventListener('visibilitychange', sync);
        return () => {
            cancel();
            reduced.removeEventListener('change', sync);
            hover.removeEventListener('change', sync);
            document.removeEventListener('visibilitychange', sync);
        };
    }, []);
    const schedule = (card: HTMLElement) => {
        if (pending.current !== null) return;
        pending.current = requestAnimationFrame(() => {
            pending.current = null;
            const rect = bounds.current;
            if (!rect || !policy.current.motion || !policy.current.hover) return;
            const x = Math.max(0, Math.min(rect.width, point.current.x - rect.left));
            const y = Math.max(0, Math.min(rect.height, point.current.y - rect.top));
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            card.style.setProperty('--mag-x', `${(x - rect.width / 2) * .04}px`);
            card.style.setProperty('--mag-y', `${(y - rect.height / 2) * .06}px`);
        });
    };
    return {
        surfaceRef, rippleRef,
        surfaceHandlers: {
            onPointerEnter(event: PointerEvent<HTMLElement>) {
                if (event.pointerType !== 'mouse' || !policy.current.motion || !policy.current.hover) return;
                bounds.current = event.currentTarget.getBoundingClientRect();
                point.current = { x: event.clientX, y: event.clientY };
                schedule(event.currentTarget);
            },
            onPointerMove(event: PointerEvent<HTMLElement>) {
                if (event.pointerType !== 'mouse' || !policy.current.motion || !policy.current.hover || !bounds.current) return;
                point.current = { x: event.clientX, y: event.clientY };
                schedule(event.currentTarget);
            },
            onPointerLeave(event: PointerEvent<HTMLElement>) {
                cancel();
                bounds.current = null;
                for (const variable of ['--mag-x', '--mag-y']) event.currentTarget.style.setProperty(variable, '0px');
            },
            onPointerDown(event: PointerEvent<HTMLElement>) {
                if (!policy.current.motion || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('.class-card__menu')) return;
                const ripple = rippleRef.current;
                if (!ripple) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const size = Math.min(320, Math.max(rect.width, rect.height));
                Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${event.clientX - rect.left - size / 2}px`, top: `${event.clientY - rect.top - size / 2}px` });
                ripple.getAnimations().forEach(animation => animation.cancel());
                ripple.animate([{ transform: 'scale(0)', opacity: .14 }, { transform: 'scale(1)', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(.2,.7,.3,1)' });
            },
        },
    };
}

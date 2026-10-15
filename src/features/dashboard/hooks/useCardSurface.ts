import { useEffect, useRef, type PointerEvent } from 'react';

/** Short contact feedback, without pointer tracking or an idle animation loop. */
export function useCardSurface() {
    const surfaceRef = useRef<HTMLElement>(null);
    const rippleRef = useRef<HTMLSpanElement>(null);
    const motion = useRef(false);
    useEffect(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => {
            motion.current = !reduced.matches && !document.hidden;
            if (!motion.current) rippleRef.current?.getAnimations().forEach(animation => animation.cancel());
        };
        sync();
        reduced.addEventListener('change', sync);
        document.addEventListener('visibilitychange', sync);
        return () => {
            reduced.removeEventListener('change', sync);
            document.removeEventListener('visibilitychange', sync);
        };
    }, []);
    return {
        surfaceRef, rippleRef,
        surfaceHandlers: {
            onPointerDown(event: PointerEvent<HTMLElement>) {
                if (!motion.current || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('.class-card__menu')) return;
                const ripple = rippleRef.current;
                if (!ripple) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const size = Math.min(320, Math.max(rect.width, rect.height));
                Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${event.clientX - rect.left - size / 2}px`, top: `${event.clientY - rect.top - size / 2}px` });
                ripple.getAnimations().forEach(animation => animation.cancel());
                ripple.animate([{ transform: 'scale(0)', opacity: .08 }, { transform: 'scale(1)', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(.2,.7,.3,1)' });
            },
        },
    };
}

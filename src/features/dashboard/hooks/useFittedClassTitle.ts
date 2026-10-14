import { useLayoutEffect, useRef } from 'react';

/** Fit a whole class name on one line when it remains legible. Longer names
 * keep their preferred size and wrap rather than being clipped or abbreviated. */
export function useFittedClassTitle(text: string) {
    const titleRef = useRef<HTMLHeadingElement>(null);

    useLayoutEffect(() => {
        const title = titleRef.current;
        const line = title?.querySelector<HTMLElement>('.class-card__stream');
        const context = document.createElement('canvas').getContext('2d');
        if (!title || !line || !context) return;
        let disposed = false;
        const fit = () => {
            if (disposed || title.clientWidth === 0) return;
            const style = getComputedStyle(title);
            const preferred = parseFloat(style.getPropertyValue('--class-title-max'));
            const minimum = parseFloat(style.getPropertyValue('--class-title-min'));
            const multiplier = parseFloat(getComputedStyle(line).fontSize) / parseFloat(style.fontSize);
            context.font = `${style.fontWeight} ${preferred * multiplier}px ${style.fontFamily}`;
            context.direction = style.direction === 'rtl' ? 'rtl' : 'ltr';
            const width = context.measureText(line.textContent ?? '').width;
            const fitted = Math.min(preferred, preferred * (title.clientWidth - 2) / Math.max(1, width));
            const size = fitted >= minimum ? fitted : preferred;
            title.style.setProperty('--class-title-fit', `${size.toFixed(2)}px`);
        };
        const observer = new ResizeObserver(fit);
        observer.observe(title);
        document.fonts.addEventListener('loadingdone', fit);
        void document.fonts.ready.then(fit);
        fit();
        return () => {
            disposed = true;
            observer.disconnect();
            document.fonts.removeEventListener('loadingdone', fit);
        };
    }, [text]);

    return titleRef;
}

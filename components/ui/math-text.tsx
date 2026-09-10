import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { MathJax } from 'better-react-mathjax';
import { useMathRuntime, useMathTypesetRegistration } from '@/contexts/MathRuntimeContext';
import { hasMathSyntax } from '@/utils/math';

interface MathTextProps {
    children: React.ReactNode;
    source?: unknown;
    cacheKey?: string;
    inline?: boolean;
}

export const MathText: React.FC<MathTextProps> = React.memo(({ children, source, cacheKey, inline = false }) => {
    const { ready } = useMathRuntime();
    const beginTypeset = useMathTypesetRegistration();
    const text = typeof source === 'string' ? source : '';
    const hasMath = React.useMemo(() => hasMathSyntax(text), [text]);
    const finishTypesetRef = useRef<(() => void) | null>(null);

    useLayoutEffect(() => {
        if (!hasMath || !ready) return;
        const finish = beginTypeset();
        finishTypesetRef.current = finish;
        return () => {
            finish();
            if (finishTypesetRef.current === finish) finishTypesetRef.current = null;
        };
    }, [beginTypeset, hasMath, ready, text]);

    const handleTypeset = useCallback(() => {
        finishTypesetRef.current?.();
        finishTypesetRef.current = null;
    }, []);

    if (hasMath && ready) {
        // React must not reconcile new source text against MathJax's mutated DOM.
        return <MathJax key={`${cacheKey ?? ''}:${text}`} dynamic inline={inline} onTypeset={handleTypeset} className="math-text max-w-full">{children}</MathJax>;
    }
    return <>{children}</>;
});

import React, { useContext } from 'react';
import { MathJax } from 'better-react-mathjax';
import { MathRuntimeContext } from '@/contexts/MathRuntimeContext';
import { hasMathSyntax } from '@/utils/math';

interface MathTextProps {
    children: React.ReactNode;
    source?: unknown;
    cacheKey?: string;
    inline?: boolean;
}

export const MathText: React.FC<MathTextProps> = React.memo(({ children, source, cacheKey, inline = false }) => {
    const ready = useContext(MathRuntimeContext);
    const text = typeof source === 'string' ? source : '';
    const hasMath = React.useMemo(() => hasMathSyntax(text), [text]);

    if (hasMath && ready) {
        // React must not reconcile new source text against MathJax's mutated DOM.
        return <MathJax key={`${cacheKey ?? ''}:${text}`} dynamic inline={inline} className="math-text max-w-full">{children}</MathJax>;
    }
    return <>{children}</>;
});

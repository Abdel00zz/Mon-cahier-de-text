import React from 'react';
import { MathJax } from 'better-react-mathjax';

interface MathTextProps {
    children: React.ReactNode;
    source?: unknown;
    cacheKey?: string;
    inline?: boolean;
}

export const MathText: React.FC<MathTextProps> = ({ children, source }) => {
    const text = typeof source === 'string' ? source : '';
    const hasMath = text.includes('$') || text.includes('\\(') || text.includes('\\[') || text.includes('\\begin{');
    
    if (hasMath) {
        return <MathJax className="inline-block max-w-full">{children}</MathJax>;
    }
    return <>{children}</>;
};

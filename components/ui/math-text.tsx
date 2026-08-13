import React, { useContext } from 'react';
import { MathJax, MathJaxBaseContext } from 'better-react-mathjax';

interface MathTextProps {
    children: React.ReactNode;
    source?: unknown;
    cacheKey?: string;
    inline?: boolean;
}

export const MathText: React.FC<MathTextProps> = ({ children, source }) => {
    const mathJaxContext = useContext(MathJaxBaseContext);
    const text = typeof source === 'string' ? source : '';
    const hasMath = text.includes('$') || text.includes('\\(') || text.includes('\\[') || text.includes('\\begin{');

    if (hasMath && mathJaxContext) {
        return <MathJax className="inline-block max-w-full">{children}</MathJax>;
    }
    return <>{children}</>;
};

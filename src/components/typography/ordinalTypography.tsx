import { type ReactNode } from 'react';

/**
 * Détecte les suffixes ordinaux français (ex: 1er, 2ème, 2éme, 1ère, 1re, 3ème, etc.)
 * et les met en exposant comme dans les manuels scolaires officiels et livres pédagogiques.
 */
export function formatWithOrdinals(text: string): ReactNode {
    if (!text || typeof text !== 'string') return text;

    // Détecte chiffres suivis de suffixes ordinaux (er, ère, ére, ere, re, ème, éme, eme, e)
    // avec frontière de mot ou fin de chaîne
    const regex = /(\b[1-9]\d*)(er|ère|ére|ere|re|ème|éme|eme|e)(?=\b|\s|$|[.\-_/])/gi;

    if (!regex.test(text)) {
        return text;
    }

    regex.lastIndex = 0;
    const parts: ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) {
            parts.push(text.slice(lastIdx, match.index));
        }

        const num = match[1];
        const rawSuffix = match[2];

        // Rendu scolaire fidèle : 1er, 2ème (ou 2éme selon préférence), 1ère, etc.
        let displaySuffix = rawSuffix;
        const lower = rawSuffix.toLowerCase();
        if (lower === 'éme' || lower === 'eme') {
            displaySuffix = 'ème';
        } else if (lower === 'ere' || lower === 'ére') {
            displaySuffix = 'ère';
        }

        parts.push(
            <span key={match.index} className="inline-flex items-baseline whitespace-nowrap">
                <span>{num}</span>
                <sup
                    className="keep-ordinal-sup text-[0.58em] font-semibold align-super leading-none select-none pointer-events-none ms-[0.5px] me-[1.5px] opacity-90"
                    aria-hidden="true"
                >
                    {displaySuffix}
                </sup>
            </span>
        );

        lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
        parts.push(text.slice(lastIdx));
    }

    return <>{parts}</>;
}

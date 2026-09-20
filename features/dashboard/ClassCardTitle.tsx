import { titleDirection } from '@/utils/contentDirection';
import { formatWithOrdinals } from '@/utils/ordinalTypography';

/** Only a separate trailing group number is highlighted, never the level (1AC/2BAC). */
export function ClassCardTitle({ name, compact = false, intro }: { name: string; compact?: boolean; intro?: string }) {
    const renderLabel = (text: string) => {
        if (intro && text.startsWith(intro)) {
            return (
                <>
                    <span className="keep-session-intro">{intro}</span>
                    {formatWithOrdinals(text.slice(intro.length))}
                </>
            );
        }
        return formatWithOrdinals(text);
    };

    const match = name.match(/^(.*?)\s+([0-9\u0660-\u0669\u06f0-\u06f9]{1,2})$/u);
    if (!match) {
        return (
            <span dir="auto" className={compact ? 'block truncate text-start' : 'line-clamp-2 break-words text-balance text-start'}>
                <span className="sr-only">{name}</span>
                <span aria-hidden="true">{renderLabel(name)}</span>
            </span>
        );
    }

    return (
        <span dir={titleDirection(match[1])} className={compact ? 'block truncate text-start' : 'line-clamp-2 break-words text-balance text-start'}>
            <span className="sr-only">{name}</span>
            <span aria-hidden="true">
                {renderLabel(match[1])}{'\u00a0'}<bdi dir="ltr" className="keep-group-number font-serif italic font-normal tracking-tight">{match[2]}</bdi>
            </span>
        </span>
    );
}

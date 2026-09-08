import { titleDirection } from '@/utils/contentDirection';

/** Only a separate trailing group number is highlighted, never the level (1AC/2BAC). */
export function ClassCardTitle({ name, compact = false }: { name: string; compact?: boolean }) {
    const match = name.match(/^(.*?)\s+([0-9\u0660-\u0669\u06f0-\u06f9]{1,2})$/u);
    if (!match) return <span dir="auto" className={compact ? 'block truncate text-start' : 'line-clamp-2 break-words text-balance text-start'}>{name}</span>;

    return (
        <span dir={titleDirection(match[1])} className="flex min-w-0 items-center gap-2.5 text-start">
            <span className={compact ? 'min-w-0 truncate' : 'min-w-0 line-clamp-2 break-words text-balance'}>{match[1]}</span>
            {' '}
            <bdi dir="ltr" className={`keep-group-number ${compact ? 'keep-group-number-compact' : ''}`}>{match[2]}</bdi>
        </span>
    );
}

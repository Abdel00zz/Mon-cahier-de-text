import { titleDirection } from '@/utils/contentDirection';

/** Only a separate trailing group number is highlighted, never the level (1AC/2BAC). */
export function ClassCardTitle({ name, compact = false, intro }: { name: string; compact?: boolean; intro?: string }) {
    const renderLabel = (text: string) => intro && text.startsWith(intro)
        ? <><span className="keep-session-intro">{intro}</span>{text.slice(intro.length)}</>
        : text;
    const match = name.match(/^(.*?)\s+([0-9\u0660-\u0669\u06f0-\u06f9]{1,2})$/u);
    if (!match) return <span dir="auto" className={compact ? 'block truncate text-start' : 'line-clamp-2 break-words text-balance text-start'}>{renderLabel(name)}</span>;

    return (
        <span dir={titleDirection(match[1])} className={compact ? 'block truncate text-start' : 'line-clamp-2 break-words text-balance text-start'}>
            {renderLabel(match[1])}{'\u00a0'}<bdi dir="ltr" className="keep-group-number">{match[2]}</bdi>
        </span>
    );
}

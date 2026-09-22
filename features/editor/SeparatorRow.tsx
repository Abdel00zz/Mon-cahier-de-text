import React, { useRef, useState } from 'react';
import { Indices, Separator } from '@/types';
import { Button } from '@/components/ui/button';
import { CalendarDays, Trash2 } from '@/components/ui/icons';
import { MathText } from '@/components/ui/math-text';
import { useLocale } from '@/i18n/LocaleProvider';
import { DateCard } from './TableRow';

interface SeparatorRowProps {
    data: Separator;
    indices: Indices;
    onCellUpdate: (indices: Indices, field: string, value: any) => void;
    onDelete: (indices: Indices) => void;
    onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
    isNew?: boolean;
}
const TABLE_GRID_CLASS = 'grid-cols-[18%_1fr_20%] md:grid-cols-[var(--cdt-table-cols)]';

/** A separator is a normal editable row; its date stays in the shared date column. */
export const SeparatorRow = React.memo(function SeparatorRow({ data, indices, onCellUpdate, onDelete, onOpenDateModal }: SeparatorRowProps) {
    const { t } = useLocale();
    const [editing, setEditing] = useState(false);
    const cancelEdit = useRef(false);
    const separatorIndices: Indices = { ...indices, isSeparator: true };
    const stop = (event: React.SyntheticEvent) => event.stopPropagation();
    return <div className={`group relative grid w-full min-w-0 border-b border-border/70 bg-card ${TABLE_GRID_CLASS}`} onClick={stop}>
        <div className="relative flex min-w-0 items-center justify-center border-e border-border bg-muted/40 px-1">
            {onOpenDateModal ? <button type="button" className="min-h-12 w-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={t('separator.editDate')}
                onClick={() => onOpenDateModal(separatorIndices, data.date)}>
                {data.date ? <DateCard dateStr={data.date} /> : <CalendarDays className="mx-auto h-4 w-4 text-muted-foreground" />}
            </button> : <label className="relative flex min-h-12 w-full items-center justify-center">
                <DateCard dateStr={data.date} />
                {!data.date && <CalendarDays className="h-4 w-4 text-muted-foreground" />}
                <input type="date" value={data.date || ''} aria-label={t('separator.editDate')}
                    onChange={event => onCellUpdate(separatorIndices, 'date', event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>}
        </div>
        <div className="flex min-w-0 items-center self-stretch border-e border-border px-2 py-1.5 sm:px-3">
            {editing ? <textarea autoFocus defaultValue={data.content || ''} aria-label={t('addContent.separatorText')}
                rows={2} className="editor-type-item-title min-h-11 w-full resize-y rounded-md border border-border bg-background px-2 py-1 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                onBlur={event => {
                    if (!cancelEdit.current && event.currentTarget.value !== data.content) onCellUpdate(separatorIndices, 'content', event.currentTarget.value);
                    setEditing(false);
                }}
                onKeyDown={event => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === 'Escape') { cancelEdit.current = true; event.currentTarget.blur(); }
                    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); }
                }} /> : <button type="button" className="editor-type-item-title min-h-11 min-w-0 w-full whitespace-pre-wrap break-words rounded-sm text-start font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label={`${t('addContent.separatorText')} : ${data.content || ''}`}
                onClick={() => { cancelEdit.current = false; setEditing(true); }}>
                <MathText source={data.content}>{data.content || '—'}</MathText>
            </button>}
        </div>
        <div className="flex min-w-0 items-center justify-center p-1">
            <Button variant="ghost" size="icon" onClick={() => onDelete(separatorIndices)} aria-label={t('separator.delete')}
                className="h-11 w-11 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    </div>;
});

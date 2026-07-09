import React, { useRef } from 'react';
import { Indices, Separator } from '../types';
import { Button } from './ui/button';
import { Trash2 } from './ui/icons';

interface SeparatorRowProps {
    data: Separator;
    indices: Indices;
    onCellUpdate: (indices: Indices, field: string, value: any) => void;
    onDelete: (indices: Indices) => void;
    isNew?: boolean;
}

/* Palette partagée avec TableRow — un seul accent signature (or mat) */
const GOLD = '#B8935A';
const GOLD_SOFT = '#B8935A33';
const TABLE_GRID_CLASS = 'grid-cols-[19%_1fr] md:grid-cols-[var(--cdt-table-cols)]';

const SeparatorRowComponent: React.FC<SeparatorRowProps> = ({ data, indices, onCellUpdate, onDelete, isNew = false }) => {
    const separatorIndices: Indices = { ...indices, isSeparator: true };

    const contentRef = useRef<HTMLDivElement>(null);
    const isChanged = useRef(false);

    const handleContentSave = () => {
        if (contentRef.current && isChanged.current) {
            onCellUpdate(separatorIndices, 'content', contentRef.current.textContent || '');
            isChanged.current = false;
        }
    };

    const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        isChanged.current = true;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
        }
    };

    const rowClasses = [
        `group relative my-1 grid w-full ${TABLE_GRID_CLASS} transition-colors duration-150`,
        isNew ? 'new-item-highlight' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={rowClasses}>
            {/* Colonne Date */}
            <div className="flex min-w-0 flex-col items-center justify-center self-stretch border-r border-border/50 px-1 py-1.5 select-none">
                <input
                    type="date"
                    value={data.date || ''}
                    onChange={e => onCellUpdate(separatorIndices, 'date', e.target.value)}
                    className="bg-transparent text-muted-foreground/60 text-[11px] font-bold rounded-md border border-dashed border-border/80 px-1.5 py-1 transition-all focus:outline-none focus:ring-1 hover:border-primary/50 cursor-pointer text-center w-full max-w-[100px] font-mono"
                    style={{ ['--tw-ring-color' as string]: GOLD }}
                    title="Modifier la date du séparateur"
                />
            </div>

            {/* Colonne Contenu — le "signature moment" : un jalon net entre deux périodes */}
            <div className="relative flex min-w-0 items-center justify-center gap-3 self-stretch border-r border-border/50 px-4 py-2.5">
                <div className="flex-grow border-t border-dashed" style={{ borderColor: GOLD_SOFT }} />

                <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleContentSave}
                    onKeyDown={handleContentKeyDown}
                    className="relative text-center text-[11px] font-bold uppercase tracking-[0.12em] px-3.5 py-1.5 rounded-full bg-card border transition-colors focus:outline-none focus:ring-1 min-w-[120px] max-w-[80%] shadow-sm font-sans"
                    style={{
                        color: GOLD,
                        borderColor: GOLD_SOFT,
                        ['--tw-ring-color' as string]: GOLD,
                    }}
                    dangerouslySetInnerHTML={{ __html: data.content || '' }}
                />

                <div className="flex-grow border-t border-dashed" style={{ borderColor: GOLD_SOFT }} />
            </div>

            {/* Colonne Action */}
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center p-1 md:static md:translate-y-0 md:self-stretch" onClick={event => event.stopPropagation()}>
                {/* visible en permanence en tactile (< lg) ; hover-reveal sur desktop seulement */}
                <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                        variant="ghost" size="icon"
                        
                        onClick={() => onDelete(separatorIndices)}
                        data-tippy-content="Supprimer le séparateur"
                        className="h-9 w-9 text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors lg:h-7 lg:w-7"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const SeparatorRow = React.memo(SeparatorRowComponent, (prev, next) => (
    prev.data === next.data &&
    prev.indices === next.indices &&
    prev.onCellUpdate === next.onCellUpdate &&
    prev.onDelete === next.onDelete &&
    prev.isNew === next.isNew
));

SeparatorRow.displayName = 'SeparatorRow';

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
        'group relative flex items-center w-full transition-colors duration-150 my-1',
        isNew ? 'new-item-highlight' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={rowClasses}>
            {/* Colonne Date */}
            <div className="w-[17%] sm:w-[15%] flex flex-col items-center justify-center px-1 py-1.5 self-stretch select-none">
                <input
                    type="date"
                    value={data.date || ''}
                    onChange={e => onCellUpdate(separatorIndices, 'date', e.target.value)}
                    className="bg-transparent text-[#A79C87] text-[11px] font-bold rounded-md border border-dashed border-[#E4D3AC]/80 px-1.5 py-1 transition-all focus:outline-none focus:ring-1 hover:border-primary/50 cursor-pointer text-center w-full max-w-[100px] font-mono"
                    style={{ ['--tw-ring-color' as string]: GOLD }}
                    title="Modifier la date du séparateur"
                />
            </div>

            {/* Colonne Contenu — le "signature moment" : un jalon net entre deux périodes */}
            <div className="min-w-0 flex-1 px-4 py-2.5 flex items-center justify-center gap-3 relative self-stretch">
                <div className="flex-grow border-t border-dashed" style={{ borderColor: GOLD_SOFT }} />

                <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleContentSave}
                    onKeyDown={handleContentKeyDown}
                    className="relative text-center text-[11px] font-bold uppercase tracking-[0.12em] px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border transition-colors focus:outline-none focus:ring-1 min-w-[120px] max-w-[80%] shadow-sm font-sans"
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
            <div className="w-[15%] flex items-center justify-center self-stretch p-1" onClick={event => event.stopPropagation()}>
                {/* visible en permanence en tactile (< lg) ; hover-reveal sur desktop seulement */}
                <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                        variant="icon"
                        size="sm"
                        onClick={() => onDelete(separatorIndices)}
                        data-tippy-content="Supprimer le séparateur"
                        className="h-9 w-9 text-xs text-[#A79C87] hover:text-red-600 hover:bg-rose-500/10 rounded-full transition-colors lg:h-7 lg:w-7"
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
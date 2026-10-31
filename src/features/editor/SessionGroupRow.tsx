import React from 'react';
import type { Indices } from '@/types';
import type { ContentDateOrder } from '@/domain/calendar/dateOrder';
import { getMergeableDate, getMergeableRemark, type FlatDataItem } from '@/domain/notebook/tableRows';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { useLocale } from '@/i18n/LocaleProvider';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { hasHomeworkMention, splitRemarkContent } from '@/domain/evaluations/homeworkNumbering';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import { DateCard, MultiDateCard, TableRow } from './TableRow';
import { SessionDocuments } from './SessionDocuments';
import { sortAttributes } from './tableSortAttributes';

const TABLE_GRID_CLASS = 'editor-table-grid';
const NO_DESCRIPTION_TYPES: string[] = [];

interface SessionGroupRowProps {
    getSortId: (data: object) => string;
    items: FlatDataItem[];
    selectedKeys: ReadonlySet<string>;
    newlyAddedIds: string[];
    editingKey?: string;
    focusKey?: string | null;
    onToggleSelect: (indices: Indices) => void;
    onToggleSelectGroup?: (indices: Indices[]) => void;
    onDoubleClickEdit?: (indices: Indices) => void;
    onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
    onOpenRemark?: (indices: Indices) => void;
    showDescriptions?: boolean;
    descriptionTypes?: string[];
    searchQuery?: string;
    getDateWarnings?: (date: string) => { type: string; message: string }[];
    getDateOrder?: (indices: Indices) => ContentDateOrder | undefined;
    /** numéro de série du contenu : « définition 1 », « exemple 2 »… */
    getContentNumber?: (indices: Indices) => string | undefined;
    /**
     * Annotation de la séance (contrôle des cahiers), par date : elle se lit
     * SOUS la remarque écrite, dans la même cellule — la date de l'activité
     * décide de la séance annotée, pas un identifiant de devoir.
     */
    getSessionAnnotation?: (date?: string) => string | undefined;
    /** sujet écrit par le professeur, par ligne du cahier */
    getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
    getSessionDocuments?: (date: string) => readonly NotebookDocumentPreview[] | undefined;
    onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
    sortable?: boolean;
}

export const SessionGroupRow: React.FC<SessionGroupRowProps> = React.memo(({
    getSortId,
    items,
    selectedKeys,
    newlyAddedIds,
    editingKey,
    focusKey,
    onToggleSelect,
    onToggleSelectGroup,
    onDoubleClickEdit,
    onOpenDateModal,
    onOpenRemark,
    showDescriptions,
    descriptionTypes = NO_DESCRIPTION_TYPES,
    searchQuery,
    getDateWarnings,
    getDateOrder,
    getContentNumber,
    getSessionAnnotation,
    getDocumentPreview,
    getSessionDocuments,
    onOpenDocumentPreview,
    sortable,
}) => {
    const { t } = useLocale();
    const mergeContent = items[0].dateMerge?.mergeType === 'content';
    const toggleMerged = () => {
        if (onToggleSelectGroup) {
            onToggleSelectGroup(items.map(item => item.indices));
            return;
        }
        const shouldSelect = !items.every(item => selectedKeys.has(item.key));
        items.forEach(item => {
            if (selectedKeys.has(item.key) !== shouldSelect) onToggleSelect(item.indices);
        });
    };
    const allDates = items.map(it => getMergeableDate(it)).filter(Boolean) as string[];
    const uniqueDates = Array.from(new Set(allDates));
    const warnings = allDates.flatMap(d => (getDateWarnings ? getDateWarnings(d) : []));
    const hasWarning = warnings.length > 0;
    // Une seule source de vérité : la séance fusionnée porte sa remarque
    // unifiée et centrée pour tout le groupe de contenus.
    const allRemarks = Array.from(new Set(items.map(getMergeableRemark).filter(Boolean)));
    const sharedRemark = items[0].dateMerge?.sharedRemark ?? allRemarks.join('\n');
    const displayRemark = sharedRemark || allRemarks.join('\n');
    const homeworkNote = splitRemarkContent(displayRemark).homeworkLine;
    // Contrôle des cahiers : la trace de l'activité vit dans la cellule
    // « remarque » de la séance du même jour, sans ajouter la moindre ligne au
    // cahier. Elle n'est écrite qu'UNE fois par date — la première ligne datée
    // la porte — pour ne pas la répéter quand la séance garde une cellule de
    // remarque par contenu.
    const annotationsByDate = new Map<string, string>();
    const annotationOwners = new Map<string, string>();
    for (const item of items) {
      const date = getMergeableDate(item);
      if (!date) continue;
      const text = getSessionAnnotation?.(date);
      if (!text) continue;
      annotationsByDate.set(date, text);
      annotationOwners.set(date, item.key);
    }
    const sessionAnnotations = [...annotationsByDate.values()];
    /*
     * La déduplication se fait sur le SENS, pas sur la chaîne exacte : la
     * ligne d'attribution du cahier (« Devoir maison 1 donné ») et l'annotation
     * projetée peuvent différer d'un numéro, et se répétaient alors à l'écran.
     * Dès que la ligne d'attribution est affichée, aucune annotation qui parle
     * de devoir maison n'est répétée sous elle.
     */
    const visibleAnnotations = sessionAnnotations.filter(annotation =>
      !(displayRemark && displayRemark.includes(annotation))
      && !(homeworkNote && hasHomeworkMention(annotation)));
    const groupIsSelected = items.some(item => selectedKeys.has(item.key));
    // Une grille commune garde les traits de contenu et de remarque sur le
    // même axe, même si une remarque ou une description occupe plusieurs lignes.
    const visualRowCount = mergeContent ? 1 : items.length;
    const firstMerge = items[0].dateMerge;
    const lastMerge = items[items.length - 1].dateMerge;

    const dividerClass = groupIsSelected
        ? 'border-e border-e-primary/45'
        : hasWarning
            ? 'border-e border-e-alert/45'
            : 'border-e border-e-border';

    // Separateur INTERNE d'une seance (contenus d'une MEME date) : filet fin
    // POINTILLE, plus discret qu'un trait plein, pour marquer la suite sans
    // couper la seance. Le « ! » final (importance, syntaxe Tailwind v4) est
    // necessaire car `border-b` impose un style plein ; il ne porte que sur
    // le bas, donc le filet vertical `border-e` reste net. Les autres
    // frontieres (bornes de sequence datee, fin de seance) restent pleines.
    const innerLineClass = `${groupIsSelected
        ? 'border-b border-b-primary/25'
        : hasWarning
            ? 'border-b border-b-alert/35'
            : 'border-b border-b-border/50'} [border-bottom-style:dotted]!`;
    const hasAssignedDate = uniqueDates.length > 0;
    const topBoundaryClass = (hasAssignedDate && firstMerge?.isDatedSequenceStart)
        ? (hasWarning ? 'border-t-2 border-t-warning/70' : 'border-t-2 border-t-foreground/30')
        : '';
    // Une seule bordure porte la limite avec la séance suivante : aucun
    // empilement border-bottom + border-top entre deux groupes datés.
    const bottomBoundaryClass = hasAssignedDate
        ? (lastMerge?.isDatedSequenceEnd
            ? (hasWarning ? 'border-b-2 border-b-warning/70' : 'border-b-2 border-b-foreground/30')
            : (hasWarning ? 'border-b border-b-warning/60' : 'border-b border-b-border/70'))
        : (groupIsSelected ? 'border-b border-b-primary/15' : '');

    const renderContent = (item: FlatDataItem, merged: boolean) => {
        const isSelected = merged ? groupIsSelected : selectedKeys.has(item.key);
        const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
        return (
            <TableRow
                data={item.data}
                indices={item.indices}
                elementType={item.elementType}
                dateMerge={item.dateMerge}
                lineClassOverride=""
                layout="content-only"
                sortable={sortable}
                onToggleSelect={merged ? toggleMerged : onToggleSelect}
                onDoubleClickEdit={onDoubleClickEdit}
                onOpenRemark={onOpenRemark}
                isSelected={isSelected}
                isNew={isNew}
                isEditing={editingKey === item.key}
                showDescriptions={showDescriptions}
                descriptionTypes={descriptionTypes}
                searchQuery={searchQuery}
                getDateWarnings={getDateWarnings}
                getDateOrder={getDateOrder}
                getContentNumber={getContentNumber}
                getDocumentPreview={getDocumentPreview}
                onOpenDocumentPreview={onOpenDocumentPreview}
            />
        );
    };

    return (
        <div
            data-session-group="true"
            className={[
                `group relative grid ${TABLE_GRID_CLASS} transition-colors duration-200`,
                topBoundaryClass,
                bottomBoundaryClass,
                hasWarning
                    ? 'bg-alert/[0.07]'
                    : 'bg-card',
                // La séance garde la surface de la carte : l’accent ne teinte que
                // les lignes visées, ce qui les rend d’autant plus lisibles.
            ].filter(Boolean).join(' ')}
            style={{ gridTemplateRows: `repeat(${visualRowCount}, minmax(52px, auto))` }}
        >
            <button
                type="button"
                data-session-cell="date"
                className={`flex min-h-[52px] min-w-0 items-center justify-center self-stretch px-1 py-1 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary hover:bg-primary/5 active:bg-primary/10 transition-colors ${dividerClass} ${hasWarning ? 'bg-warning/10' : (hasAssignedDate ? 'bg-muted/10' : 'bg-transparent')}`}
                style={{ gridColumn: 1, gridRow: `1 / span ${visualRowCount}` }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenDateModal && items[0]) {
                        const selected = items.filter(item => selectedKeys.has(item.key));
                        // A shared date cell still belongs to separate content rows.
                        // Honour a single selected row, otherwise the row at click height.
                        const cells = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[data-session-cell="content"]');
                        const hit = e.detail > 0 ? Array.from(cells ?? []).find(cell => {
                            const rect = cell.getBoundingClientRect();
                            return e.clientY >= rect.top && e.clientY <= rect.bottom;
                        })?.dataset.sessionContentKey : undefined;
                        const item = selected.length === 1 ? selected[0] : items.find(item => item.key === hit) ?? items[0];
                        onOpenDateModal(item.indices, typeof item.data?.date === 'string' ? item.data.date : undefined);
                    }
                }}
                title={t('selection.chooseDate')}
                aria-label={t('selection.chooseDate')}
                disabled={!onOpenDateModal}
            >
                {uniqueDates.length > 1 ? (
                    <MultiDateCard dates={uniqueDates} hasWarning={hasWarning} />
                ) : (
                    <DateCard dateStr={uniqueDates[0]} hasWarning={hasWarning} />
                )}
            </button>

            {mergeContent ? (
                <div
                    data-session-cell="content"
                    {...(sortable ? sortAttributes(items[0], `combined-${getSortId(items[0].data)}`) : {})}
                    data-editor-sort-last-key={items[items.length - 1].key}
                    data-focus-key={items.some(item => item.key === focusKey) ? focusKey : undefined}
                    data-session-content-key={items[0].key}
                    className={`min-w-0 self-stretch ${dividerClass} flex flex-col justify-center [&>div]:w-full`}
                    style={{ gridColumn: 2, gridRow: `1 / span ${visualRowCount}` }}
                >
                    {renderContent(items[0], true)}
                </div>
            ) : items.map((item, index) => (
                <div
                    key={`content-${item.key}`}
                    data-session-cell="content"
                    {...(sortable ? sortAttributes(item, getSortId(item.data)) : {})}
                    data-focus-key={item.key === focusKey ? focusKey : undefined}
                    data-session-content-key={item.key}
                    data-session-row-divider={index < items.length - 1 ? 'true' : undefined}
                    className={`min-w-0 self-stretch ${dividerClass} ${index < items.length - 1 ? innerLineClass : ''}`}
                    style={{ gridColumn: 2, gridRow: index + 1 }}
                >
                    {renderContent(item, false)}
                </div>
            ))}

            {/* Colonne 3 : Remarque unique et fusionnée pour toute la séance, parfaitement centrée */}
            <div
                data-session-cell="remark"
                className={`flex flex-col justify-center items-center min-w-0 self-stretch p-1 sm:p-1.5 cursor-pointer hover:bg-primary/[0.03] transition-colors ${hasWarning ? 'bg-alert/[0.055]' : 'bg-transparent'}`}
                style={{ gridColumn: 3, gridRow: `1 / span ${visualRowCount}` }}
                onClick={() => onOpenRemark?.(items[0].indices)}
            >
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenRemark?.(items[0].indices); }}
                    title={t('remark.editTitle')}
                    aria-label={t('remark.editTitle')}
                    data-remark-cell="true"
                    className="flex min-h-11 h-full flex-1 w-full cursor-pointer flex-col items-center justify-center text-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    {(() => {
                      const { homeworkLine, otherRemark } = splitRemarkContent(displayRemark);
                      return (
                        <>
                          {homeworkLine && (
                            <span
                              data-session-homework="true"
                              dir={textDirectionAttribute(homeworkLine)}
                              className="editor-session-note block w-full whitespace-pre-line break-words text-center text-[11px] font-semibold leading-snug text-muted-foreground"
                            >
                              {homeworkLine}
                            </span>
                          )}
                          {otherRemark && (
                            <div
                              dir={textDirectionAttribute(otherRemark)}
                              className="editor-type-remark w-full whitespace-pre-wrap break-words text-center font-semibold leading-snug text-foreground/80 text-xs sm:text-sm"
                            >
                              {renderDescriptionWithBold(otherRemark)}
                            </div>
                          )}
                          {!homeworkLine && !otherRemark && (
                            <span className="opacity-0 select-none text-xs">·</span>
                          )}
                        </>
                      );
                    })()}
                    {visibleAnnotations.map(annotation => (
                      <span
                        key={annotation}
                        data-session-annotation="true"
                        dir={textDirectionAttribute(annotation)}
                        className="editor-session-note mt-0.5 block w-full whitespace-pre-line break-words text-center text-[11px] font-semibold leading-snug text-muted-foreground"
                      >
                        {annotation}
                      </span>
                    ))}
                </button>
                <SessionDocuments documents={uniqueDates.flatMap(date => getSessionDocuments?.(date) ?? [])} onOpen={onOpenDocumentPreview}/>
            </div>
        </div>
    );
}, (previous, next) => {
    if (previous.items !== next.items || previous.onToggleSelect !== next.onToggleSelect
        || previous.onToggleSelectGroup !== next.onToggleSelectGroup
        || previous.editingKey !== next.editingKey
        || previous.focusKey !== next.focusKey
        || previous.onDoubleClickEdit !== next.onDoubleClickEdit || previous.onOpenDateModal !== next.onOpenDateModal
        || previous.onOpenRemark !== next.onOpenRemark || previous.showDescriptions !== next.showDescriptions
        || previous.sortable !== next.sortable
        || previous.descriptionTypes !== next.descriptionTypes || previous.searchQuery !== next.searchQuery
        || previous.getDateWarnings !== next.getDateWarnings || previous.getDateOrder !== next.getDateOrder
        || previous.getContentNumber !== next.getContentNumber || previous.newlyAddedIds !== next.newlyAddedIds
        || previous.getSessionAnnotation !== next.getSessionAnnotation
        || previous.getDocumentPreview !== next.getDocumentPreview
        || previous.getSessionDocuments !== next.getSessionDocuments
        || previous.onOpenDocumentPreview !== next.onOpenDocumentPreview) return false;
    return previous.items.every(item => previous.selectedKeys.has(item.key) === next.selectedKeys.has(item.key));
});

SessionGroupRow.displayName = 'SessionGroupRow';


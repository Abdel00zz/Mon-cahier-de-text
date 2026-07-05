import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LessonsData, Indices, Section, SubSection, SubSubSection, LessonItem, ElementType, Separator, TopLevelItem, EmbeddableTopLevelItem } from '../types';
import { DateMergeMeta, TableRow } from './TableRow';
import { SeparatorRow } from './SeparatorRow';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '../constants';
import { logger } from '../utils/logger';
import { useWindowVirtualizer, VirtualListRow, type VirtualItem } from './ui/virtual-list';
import { BookOpen, Plus } from './ui/icons';

/* Accent partagé avec TableRow / SeparatorRow */
const GOLD = '#B8935A';

interface InlineEditRowProps {
    data: LessonItem;
    onSave: (updatedData: Partial<LessonItem>) => void;
    onCancel: () => void;
    /** garde intelligente : alertes live sur la date saisie (emploi du temps, fériés, vacances, absences) */
    getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const LESSON_TYPE_OPTIONS = [...new Set(Object.values(TYPE_MAP))].sort((a, b) => a.localeCompare(b));

const EDITABLE_FIELDS = ['date', 'type', 'number', 'page', 'title', 'description', 'remark'] as const;

const InlineEditRow: React.FC<InlineEditRowProps> = ({ data, onSave, onCancel, getDateWarnings }) => {
    const [formData, setFormData] = useState<Partial<LessonItem>>(data);
    const titleRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
        // garde le formulaire visible même s'il était en bord de fenêtre
        rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    // Détection de modification : annuler/enregistrer sans changement ne
    // pollue pas l'historique undo/redo ni la file de synchronisation.
    const isDirty = React.useMemo(
        () => EDITABLE_FIELDS.some(field => (formData[field] ?? '') !== ((data as any)[field] ?? '')),
        [formData, data]
    );

    // Alertes intelligentes recalculées quand la date change dans le formulaire.
    const dateWarnings = React.useMemo(
        () => (getDateWarnings && formData.date && formData.date !== data.date ? getDateWarnings(formData.date) : []),
        [getDateWarnings, formData.date, data.date]
    );

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSave = (e: React.MouseEvent | React.FormEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isDirty) {
            onCancel(); // rien n'a changé : fermeture propre, zéro écriture
            return;
        }
        onSave(formData);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCancel();
    };

    return (
        <form
            ref={rootRef}
            className="relative my-2.5 grid gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-card p-3 pl-4 shadow-[0_8px_24px_rgba(31,36,48,0.08)] animate-fade-in md:grid-cols-[minmax(8rem,0.16fr)_1fr_minmax(8rem,0.16fr)]"
            onSubmit={handleSave}
            onClick={e => e.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === 'Escape') onCancel();
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onSave(event);
            }}
        >
            {/* Liseré signature indiquant le mode édition */}
            <span aria-hidden className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: GOLD }} />

            <div className="flex flex-col items-center justify-center gap-1.5 md:border-r md:border-border md:pr-3">
                <Input type="date" name="date" value={formData.date || ''} onChange={handleChange} className="min-h-11 text-center" />
                {formData.date && (
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, date: '' }))}
                        className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                    >
                        Dissocier la date
                    </button>
                )}
            </div>
            <div className="min-w-0 space-y-2 md:border-r md:border-border md:pr-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_0.7fr_0.7fr]">
                    <Select name="type" value={formData.type} onChange={handleChange} required className="min-h-11">
                        {LESSON_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
                    </Select>
                    <Input type="text" name="number" value={formData.number || ''} onChange={handleChange} placeholder="N°" className="min-h-11" />
                    <Input type="text" name="page" value={formData.page || ''} onChange={handleChange} placeholder="Page" className="min-h-11" />
                </div>
                <Input ref={titleRef} type="text" name="title" value={formData.title || ''} onChange={handleChange} placeholder="Titre de l'élément" className="min-h-11" />
                <Textarea name="description" rows={2} value={formData.description || ''} onChange={handleChange} className="min-h-16 resize-y" placeholder="Description / contenu..." />

                {/* Garde intelligente : conflits de date affichés dans le formulaire */}
                {dateWarnings.length > 0 && (
                    <div className="space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5" role="alert">
                        {dateWarnings.map((warning, i) => (
                            <p key={i} className="text-[11px] font-medium leading-snug text-amber-800">⚠ {warning.message}</p>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span className="hidden items-center gap-1.5 sm:inline-flex">
                        <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">Échap</kbd> annule
                        <kbd className="ml-2 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">⌘/Ctrl+Entrée</kbd> sauvegarde
                    </span>
                    <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
                        <Button type="button" onClick={handleCancel} variant="secondary" size="sm" className="min-h-10">Annuler</Button>
                        <Button type="submit" variant="primary" size="sm" className="min-h-10" disabled={!isDirty}>
                            {isDirty ? 'Enregistrer' : 'Aucun changement'}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex min-w-0 items-stretch">
                <Textarea name="remark" rows={3} value={formData.remark || ''} onChange={handleChange} className="h-full resize-y" placeholder="Remarque..." />
            </div>
        </form>
    );
};

interface MainTableProps {
  lessonsData: LessonsData;
  onCellUpdate: (indices: Indices, field: string, value: any) => void;
  onDeleteSeparator: (indices: Indices) => void;
  onOpenAddContentModal: (indices?: Indices) => void;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (indices: Indices) => void;
  editingIndices: Indices | null;
  onInitiateInlineEdit: (indices: Indices) => void;
  onConfirmInlineEdit: (indices: Indices, updatedData: Partial<LessonItem>) => void;
  onCancelInlineEdit: () => void;
  newlyAddedIds: string[];
  /** garde intelligente : alertes live sur la date saisie */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** terme de recherche actif (surlignage dans les lignes) */
  searchQuery?: string;
}

interface FlatDataItem {
    data: TopLevelItem | Section | SubSection | SubSubSection | LessonItem | Separator | EmbeddableTopLevelItem;
    indices: Indices;
    elementType: ElementType;
    key: string;
    dateMerge?: DateMergeMeta;
}


const VIRTUALIZATION_THRESHOLD = 140;
const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 16;

const TableHeader: React.FC = React.memo(() => (
  <div className="sticky top-0 z-10 hidden border-b border-slate-100 bg-white/95 backdrop-blur-md print:static md:block px-3 sm:px-4">
    <div className="flex">
      <div className="w-[15%] sm:w-[13%] p-2.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Date
      </div>
      <div className="flex-1 p-2.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Contenu
      </div>
      <div className="hidden w-[16%] p-2.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 md:block">
        Remarque
      </div>
    </div>
    {/* filet signature discret sous l'en-tête */}
    <div aria-hidden className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }} />
  </div>
));
TableHeader.displayName = 'TableHeader';

const makeKey = (idx: Indices): string =>
    `${idx.chapterIndex}|${idx.sectionIndex ?? ''}|${idx.subsectionIndex ?? ''}|${idx.subsubsectionIndex ?? ''}|${idx.itemIndex ?? ''}|${idx.isSeparator ? 1 : 0}`;

const getMergeableDate = (item: FlatDataItem): string | null => {
    if (item.elementType === 'separator') return null;
    const date = (item.data as any).date;
    return typeof date === 'string' && date.trim() ? date.trim() : null;
};

const getMergeableRemark = (item: FlatDataItem): string => {
    const remark = (item.data as any).remark;
    return typeof remark === 'string' ? remark.trim() : '';
};

const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
    let start = 0;

    while (start < items.length) {
        const date = getMergeableDate(items[start]);
        if (!date) {
            start += 1;
            continue;
        }

        let end = start + 1;
        while (end < items.length && getMergeableDate(items[end]) === date) {
            end += 1;
        }

        const count = end - start;
        const group = items.slice(start, end);
        const firstRemark = getMergeableRemark(group[0]);
        const shouldMergeRemark = count > 1 && group.every(item => getMergeableRemark(item) === firstRemark);

        for (let index = start; index < end; index += 1) {
            items[index].dateMerge = {
                isMerged: count > 1,
                isStart: index === start,
                isContinuation: index !== start,
                isEnd: index === end - 1,
                count,
                indexInGroup: index - start,
                shouldMergeRemark,
            };
        }

        start = end;
    }

    return items;
};

/* État vide — invite claire à l'action, dans le même esprit signature */
const EmptyState: React.FC<{ onOpenAddContentModal: (indices?: Indices) => void }> = ({ onOpenAddContentModal }) => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-16 text-center">
        <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${GOLD}1A`, color: GOLD }}
        >
            <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-slate-700">Le cahier de textes est vide</h3>
        <p className="max-w-sm text-sm text-slate-500">
            Ajoutez un premier chapitre pour commencer à construire la progression.
        </p>
        <Button onClick={() => onOpenAddContentModal()} className="mt-1" style={{ backgroundColor: GOLD, borderColor: GOLD }}>
            <Plus className="mr-2 h-4 w-4" /> Créer un chapitre
        </Button>
    </div>
);

export const MainTable: React.FC<MainTableProps> = React.memo(({
  lessonsData,
  onOpenAddContentModal,
  showDescriptions,
  descriptionTypes = [],
  selectedKeys,
  onToggleSelect,
  editingIndices,
  newlyAddedIds,
  onCellUpdate,
  onDeleteSeparator,
  onInitiateInlineEdit,
  onConfirmInlineEdit,
  onCancelInlineEdit,
  getDateWarnings,
  searchQuery,
}) => {
  const editingKey = editingIndices ? makeKey(editingIndices) : null;
  const flatData = useMemo(() => {
    const result: FlatDataItem[] = [];

    const processElement = (
        element: any,
        indices: Indices,
        elementType: ElementType
    ): void => {
        const key = makeKey(indices);
        result.push({ data: element, indices, elementType, key });

        if (element.sections?.length > 0) {
            element.sections.forEach((sec: Section, i: number) =>
                processElement(sec, { ...indices, sectionIndex: i }, 'section')
            );
        }
        if (element.subsections?.length > 0) {
            element.subsections.forEach((sub: SubSection, i: number) =>
                processElement(sub, { ...indices, subsectionIndex: i }, 'subsection')
            );
        }
        if (element.subsubsections?.length > 0) {
            element.subsubsections.forEach((ssub: SubSubSection, i: number) =>
                processElement(ssub, { ...indices, subsubsectionIndex: i }, 'subsubsection')
            );
        }
        if (element.items?.length > 0) {
            element.items.forEach((item: LessonItem | EmbeddableTopLevelItem, i: number) => {
                if (item.type === 'chapter') {
                    processElement(item, { ...indices, itemIndex: i }, 'chapter');
                } else if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type)) {
                    processElement(item, { ...indices, itemIndex: i }, item.type as ElementType);
                } else {
                    processElement(item, { ...indices, itemIndex: i }, 'item');
                }
            });
        }

        if (element.separatorAfter) {
            result.push({
                data: element.separatorAfter,
                indices: { ...indices, isSeparator: true },
                elementType: 'separator',
                key: `${key}-sep`,
            });
        }
    };

    lessonsData.forEach((topLevelItem, index) => {
        processElement(topLevelItem, { chapterIndex: index }, topLevelItem.type);
    });

    return applyDateMerges(result);
  }, [lessonsData]);

  // La virtualisation reste ACTIVE pendant l'édition : la ligne éditée est
  // simplement « épinglée » (keepIndices) pour ne jamais être démontée.
  // Avant, éditer dans un gros cahier désactivait la virtualisation et
  // re-rendait toutes les lignes d'un coup.
  const editingIndex = useMemo(
    () => (editingKey === null ? -1 : flatData.findIndex(item => item.key === editingKey)),
    [editingKey, flatData]
  );
  const keepIndices = useMemo(() => (editingIndex >= 0 ? [editingIndex] : []), [editingIndex]);

  const shouldVirtualize = flatData.length > VIRTUALIZATION_THRESHOLD;
  const { scrollRef, totalSize, virtualItems, measureElement, renderedCount } = useWindowVirtualizer({
    count: flatData.length,
    enabled: shouldVirtualize,
    estimateSize: ESTIMATED_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
    keepIndices,
  });
  useEffect(() => {
    logger.debug('MainTable profile', {
      totalRowsInMemory: flatData.length,
      renderedRows: renderedCount,
      virtualized: shouldVirtualize,
      virtualWindow: shouldVirtualize && virtualItems.length > 0 ? `${virtualItems[0].index}-${virtualItems[virtualItems.length - 1].index}` : 'full',
      measuredCanvasHeight: shouldVirtualize ? Math.round(totalSize) : flatData.length * ESTIMATED_ROW_HEIGHT,
      estimatedRowsSkipped: shouldVirtualize ? Math.max(0, flatData.length - renderedCount) : 0,
      estimatedDomReductionPercent: shouldVirtualize
        ? Math.round((1 - renderedCount / Math.max(1, flatData.length)) * 100)
        : 0,
    });
  }, [flatData.length, renderedCount, shouldVirtualize, totalSize, virtualItems]);

  if (!lessonsData || lessonsData.length === 0) {
      return <EmptyState onOpenAddContentModal={onOpenAddContentModal} />;
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border bg-card/95 shadow-xl shadow-slate-950/5">
      <TableHeader />
      <CardContent className="p-0">
        <div ref={scrollRef} className="relative" style={shouldVirtualize ? { height: totalSize } : undefined}>
          {(() => {
              const rows: Array<{ item: typeof flatData[number]; virtualItem?: VirtualItem; absoluteIndex: number }> = shouldVirtualize
                ? virtualItems.map(virtualItem => ({ item: flatData[virtualItem.index], virtualItem, absoluteIndex: virtualItem.index })).filter(row => !!row.item)
                : flatData.map((item, absoluteIndex) => ({ item, absoluteIndex }));

              return rows.map(({ item, virtualItem, absoluteIndex }) => {
                  if (item.elementType === 'separator') {
                      const originalItemIndices = item.indices;
                      const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                      return (
                          <VirtualListRow key={item.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement}>
                          <SeparatorRow
                              data={item.data as Separator}
                              indices={originalItemIndices}
                              onCellUpdate={onCellUpdate}
                              onDelete={onDeleteSeparator}
                              isNew={isNew}
                          />
                          </VirtualListRow>
                      );
                  }

                  const isEditing = editingKey !== null && editingKey === item.key;

                  if (isEditing && item.elementType === 'item') {
                      return (
                          <VirtualListRow key={`${item.key}-edit`} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement}>
                          <InlineEditRow
                              data={item.data as LessonItem}
                              onSave={(updatedData) => onConfirmInlineEdit(item.indices, updatedData)}
                              onCancel={onCancelInlineEdit}
                              getDateWarnings={getDateWarnings}
                          />
                          </VirtualListRow>
                      );
                  }

                  const isSelected = selectedKeys.has(item.key);
                  const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));

                  return (
                      <VirtualListRow key={item.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement}>
                          <TableRow
                              data={item.data}
                              indices={item.indices}
                              elementType={item.elementType}
                              dateMerge={item.dateMerge}
                              onCellUpdate={onCellUpdate}
                              onToggleSelect={onToggleSelect}
                              onDoubleClickEdit={onInitiateInlineEdit}
                              isSelected={isSelected}
                              isNew={isNew}
                              showDescriptions={showDescriptions}
                              descriptionTypes={descriptionTypes}
                              searchQuery={searchQuery}
                          />
                      </VirtualListRow>
                  );
              });
          })()}
        </div>
      </CardContent>
    </Card>
  );
});
MainTable.displayName = 'MainTable';
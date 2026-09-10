import React, { useEffect, useMemo, useRef } from 'react';
import { LessonsData, Indices, Separator, ContentDirection } from '@/types';
import { type LessonRow } from '@/utils/lessonRows';
import { DateCard, MultiDateCard, TableRow } from './TableRow';
import { SeparatorRow } from './SeparatorRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from '@/components/ui/icons';
import { getMergeableDate, getMergeableRemark, groupLessonRows, type FlatDataItem, type RenderRow } from '@/utils/tableRows';
import { logger } from '@/utils/logger';
import { useWindowVirtualizer, VirtualListRow, type VirtualItem } from '@/components/ui/virtual-list';
import { useLocale } from '@/i18n/LocaleProvider';
import { hasOnlyPristineStarterDiagnostic } from '@/utils/starterDiagnostic';

const TABLE_GRID_COLUMNS = 'minmax(8.5rem, 13%) minmax(0, 1fr) minmax(9.5rem, 16%)';
const TABLE_GRID_CLASS = 'grid-cols-[18%_1fr_20%] md:grid-cols-[var(--cdt-table-cols)]';

interface MainTableProps {
  lessonsData: LessonsData;
  visibleRows: LessonRow[];
  onClearSearch: () => void;
  /** Sens de lecture du cahier importé, indépendant de l'interface générale. */
  contentDirection: ContentDirection;
  onCellUpdate: (indices: Indices, field: string, value: any) => void;
  onDeleteSeparator: (indices: Indices) => void;
  onOpenAddContentModal: (indices?: Indices) => void;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (indices: Indices) => void;
  onOpenContentEditor: (indices: Indices) => void;
  newlyAddedIds: string[];
  /** garde intelligente : alertes live sur la date saisie */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** terme de recherche actif (surlignage dans les lignes) */
  searchQuery?: string;
  /** rangée à rejoindre automatiquement après une suggestion de séance */
  focusKey?: string | null;
  /** programme officiel proposé lorsque le cahier est encore vide */
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}

const VIRTUALIZATION_THRESHOLD = 140;
const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 16;

const TableHeader: React.FC = React.memo(() => {
  const { t } = useLocale();
  return (
  /* §G : aucun padding externe, les colonnes de l'en-tête restent alignées
     avec celles des rangées. Style épuré inspiré de Google Keep. */
  <div className="border-b border-border bg-muted/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
    {/* filets verticaux : prolongent ceux des rangées (Date|Contenu|Remarque) */}
    <div className={`grid min-h-9 sm:min-h-11 ${TABLE_GRID_CLASS}`}>
      <div className="flex items-center justify-center border-e border-border px-1 py-1.5 text-center sm:px-2.5 sm:py-2">
        <span className="editor-type-table-side font-sans font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('editor.date')}</span>
      </div>
      <div className="flex items-center justify-center border-e border-border px-2 py-1.5 text-center sm:px-3 sm:py-2">
        <span className="editor-type-table-main font-sans font-bold uppercase tracking-[0.08em] text-foreground">{t('editor.content')}</span>
      </div>
      <div className="flex items-center justify-center px-1 py-1.5 sm:px-2.5 sm:py-2 text-center">
        <span className="editor-type-table-side font-sans font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('editor.remark')}</span>
      </div>
    </div>
  </div>
  );
});
TableHeader.displayName = 'TableHeader';


interface SessionGroupRowProps {
    items: FlatDataItem[];
    selectedKeys: ReadonlySet<string>;
    newlyAddedIds: string[];
    onToggleSelect: (indices: Indices) => void;
    onDoubleClickEdit?: (indices: Indices) => void;
    showDescriptions?: boolean;
    descriptionTypes?: string[];
    searchQuery?: string;
    getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const SessionGroupRow: React.FC<SessionGroupRowProps> = ({
    items,
    selectedKeys,
    newlyAddedIds,
    onToggleSelect,
    onDoubleClickEdit,
    showDescriptions,
    descriptionTypes = [],
    searchQuery,
    getDateWarnings,
}) => {
    const mergeContent = items[0].dateMerge?.mergeType === 'content';
    const toggleMerged = () => {
        const shouldSelect = !items.every(item => selectedKeys.has(item.key));
        items.forEach(item => {
            if (selectedKeys.has(item.key) !== shouldSelect) onToggleSelect(item.indices);
        });
    };
    const allDates = items.map(it => getMergeableDate(it)).filter(Boolean) as string[];
    const uniqueDates = Array.from(new Set(allDates));
    const warnings = allDates.flatMap(d => (getDateWarnings ? getDateWarnings(d) : []));
    const hasWarning = warnings.length > 0;
    const sameRemark = items.every(item => getMergeableRemark(item) === getMergeableRemark(items[0]));
    const groupIsSelected = items.some(item => selectedKeys.has(item.key));
    const sharedRemark = getMergeableRemark(items[0]);
    // Une grille commune garde les traits de contenu et de remarque sur le
    // même axe, même si une remarque ou une description occupe plusieurs lignes.
    const visualRowCount = mergeContent && sameRemark ? 1 : items.length;
    const firstMerge = items[0].dateMerge;
    const lastMerge = items[items.length - 1].dateMerge;

    const dividerClass = groupIsSelected
        ? 'border-e border-e-primary/45'
        : hasWarning
            ? 'border-e border-e-warning/45'
            : 'border-e border-e-border';

    const innerLineClass = groupIsSelected
        ? 'border-b border-b-primary/25'
        : hasWarning
            ? 'border-b border-b-warning/35'
            : 'border-b border-b-border/50';
    const topBoundaryClass = firstMerge?.isDatedSequenceStart
        ? (hasWarning ? 'border-t-2 border-t-warning/70' : 'border-t-2 border-t-foreground/30')
        : '';
    // Une seule bordure porte la limite avec la séance suivante : aucun
    // empilement border-bottom + border-top entre deux groupes datés.
    const bottomBoundaryClass = lastMerge?.isDatedSequenceEnd
        ? (hasWarning ? 'border-b-2 border-b-warning/70' : 'border-b-2 border-b-foreground/30')
        : (hasWarning ? 'border-b border-b-warning/60' : 'border-b border-b-border/70');

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
                onToggleSelect={merged ? toggleMerged : onToggleSelect}
                onDoubleClickEdit={onDoubleClickEdit}
                isSelected={isSelected}
                isNew={isNew}
                showDescriptions={showDescriptions}
                descriptionTypes={descriptionTypes}
                searchQuery={searchQuery}
                getDateWarnings={getDateWarnings}
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
                    ? 'bg-warning/[0.07]'
                    : 'bg-card',
                groupIsSelected ? 'bg-zinc-100 dark:bg-zinc-800/60' : '',
            ].filter(Boolean).join(' ')}
            style={{ gridTemplateRows: `repeat(${visualRowCount}, minmax(52px, auto))` }}
        >
            <div
                data-session-cell="date"
                className={`flex min-h-[52px] min-w-0 items-center justify-center self-stretch px-1 py-1 ${dividerClass} ${hasWarning ? 'bg-warning/10' : 'bg-muted/30'}`}
                style={{ gridColumn: 1, gridRow: `1 / span ${visualRowCount}` }}
            >
                {uniqueDates.length > 1 ? (
                    <MultiDateCard dates={uniqueDates} hasWarning={hasWarning} />
                ) : (
                    <DateCard dateStr={uniqueDates[0]} hasWarning={hasWarning} />
                )}
            </div>

            {mergeContent ? (
                <div
                    data-session-cell="content"
                    className={`min-w-0 self-stretch ${dividerClass} flex flex-col justify-center [&>div]:w-full [&_.editor-type-item-title]:text-center`}
                    style={{ gridColumn: 2, gridRow: `1 / span ${visualRowCount}` }}
                >
                    {renderContent(items[0], true)}
                </div>
            ) : items.map((item, index) => (
                <div
                    key={`content-${item.key}`}
                    data-session-cell="content"
                    data-session-row-divider={index < items.length - 1 ? 'true' : undefined}
                    className={`min-w-0 self-stretch ${dividerClass} ${index < items.length - 1 ? innerLineClass : ''}`}
                    style={{ gridColumn: 2, gridRow: index + 1 }}
                >
                    {renderContent(item, false)}
                </div>
            ))}

            {sameRemark ? (
                <div
                    data-session-cell="remark"
                    className={`flex min-w-0 self-stretch p-0.5 sm:p-1 ${hasWarning ? 'bg-warning/[0.055]' : 'bg-card/[0.28] dark:bg-slate-950/[0.18]'}`}
                    style={{ gridColumn: 3, gridRow: `1 / span ${visualRowCount}` }}
                    onClick={event => event.stopPropagation()}
                >
                    <div className="flex min-h-full w-full flex-col justify-center">
                        <div className="editor-type-remark h-full w-full whitespace-pre-wrap break-words p-0.5 font-semibold text-muted-foreground sm:p-1">{sharedRemark}</div>
                    </div>
                </div>
            ) : items.map((item, index) => (
                <div
                    key={`remark-${item.key}`}
                    data-session-cell="remark"
                    data-session-row-divider={index < items.length - 1 ? 'true' : undefined}
                    className={`flex min-w-0 self-stretch p-0.5 sm:p-1 ${index < items.length - 1 ? innerLineClass : ''} ${hasWarning ? 'bg-warning/[0.055]' : 'bg-card/[0.28] dark:bg-slate-950/[0.18]'}`}
                    style={{ gridColumn: 3, gridRow: index + 1 }}
                    onClick={event => event.stopPropagation()}
                >
                    <div className="editor-type-remark h-full w-full whitespace-pre-wrap break-words p-0.5 font-semibold text-muted-foreground sm:p-1">{getMergeableRemark(item)}</div>
                </div>
            ))}
        </div>
    );
};

SessionGroupRow.displayName = 'SessionGroupRow';

/* État vide, une seule décision, sans bannière concurrente. */
const EmptyState: React.FC<{
  onOpenAddContentModal: (indices?: Indices) => void;
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}> = ({ onOpenAddContentModal, predefinedProgramTitle, onLoadPredefined }) => {
    const { t } = useLocale();
    const canLoadPredefined = Boolean(predefinedProgramTitle && onLoadPredefined);

    return (
        <section className="rounded-[var(--radius-xl,0.875rem)] border border-border bg-card px-5 py-12 shadow-[0_8px_30px_rgba(63,58,52,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:px-8 sm:py-14">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg,0.75rem)] border border-primary/20 bg-primary/10 text-primary">
                    <BookOpen className="h-8 w-8 stroke-[2.2]" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-primary">{t('emptyNotebook.label')}</p>
                <p className="mt-3 max-w-md text-base leading-7 text-foreground">
                    {canLoadPredefined ? (
                        <>
                            <strong className="font-bold text-foreground">{t('emptyNotebook.programAvailable')}</strong> {t('emptyNotebook.programHint')}
                        </>
                    ) : (
                        <>
                            {t('emptyNotebook.createPrefix')} <strong className="font-bold text-foreground">{t('emptyNotebook.firstChapter')}</strong> {t('emptyNotebook.createSuffix')}
                        </>
                    )}
                </p>

                <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                    {canLoadPredefined && (
                        <Button type="button" onClick={onLoadPredefined} className="w-full shadow-lg shadow-primary/20 sm:w-auto" variant="default">
                            {t('emptyNotebook.importProgram')}
                        </Button>
                    )}
                    {canLoadPredefined && <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('emptyNotebook.or')}</span>}
                    <Button
                        type="button"
                        onClick={() => onOpenAddContentModal()}
                        className="w-full sm:w-auto"
                        variant={canLoadPredefined ? 'outline' : 'default'}
                    >
                        {t('emptyNotebook.createChapter')}
                    </Button>
                </div>
            </div>
        </section>
    );
};

export const MainTable: React.FC<MainTableProps> = React.memo(({
  lessonsData,
  visibleRows,
  onClearSearch,
  contentDirection,
  onOpenAddContentModal,
  showDescriptions,
  descriptionTypes = [],
  selectedKeys,
  onToggleSelect,
  newlyAddedIds,
  onCellUpdate,
  onDeleteSeparator,
  onOpenContentEditor,
  getDateWarnings,
  searchQuery,
  focusKey,
  predefinedProgramTitle,
  onLoadPredefined,
}) => {
  const { t } = useLocale();
  const { flatData, renderRows } = useMemo(() => groupLessonRows(visibleRows), [visibleRows]);

  const measurementIds = useRef(new WeakMap<object, number>());
  const nextMeasurementId = useRef(0);
  const itemKeys = useMemo(() => renderRows.map(row => {
    const items = row.kind === 'single' ? [row.item] : row.items;
    return items.map(item => {
      let id = measurementIds.current.get(item.data);
      if (id === undefined) {
        id = ++nextMeasurementId.current;
        measurementIds.current.set(item.data, id);
      }
      return id;
    }).join(':') + ':' + contentDirection + ':' + showDescriptions + ':' + descriptionTypes.join(',');
  }), [renderRows, contentDirection, showDescriptions, descriptionTypes]);
  const shouldVirtualize = flatData.length > VIRTUALIZATION_THRESHOLD;
  const estimateSizes = useMemo(() => renderRows.map(row =>
    (row.kind === 'session' ? row.items.length : 1) * ESTIMATED_ROW_HEIGHT
  ), [renderRows]);
  const { scrollRef, scrollToIndex, totalSize, virtualItems, measureElement, renderedCount } = useWindowVirtualizer({
    count: renderRows.length,
    itemKeys,
    enabled: shouldVirtualize,
    estimateSize: ESTIMATED_ROW_HEIGHT,
    estimateSizes,
    overscan: VIRTUAL_OVERSCAN,
  });

  useEffect(() => {
    if (!focusKey) return;

    const targetIndex = renderRows.findIndex(row => (
        row.kind === 'single'
            ? row.item.key === focusKey
            : row.items.some(item => item.key === focusKey)
    ));
    if (targetIndex < 0) return;

    const scrollNearTarget = () => scrollToIndex(targetIndex);

    const refineToRenderedRow = () => {
        const row = Array.from(document.querySelectorAll<HTMLElement>('[data-focus-key]'))
            .find(element => element.dataset.focusKey === focusKey);
        row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const frame = window.requestAnimationFrame(scrollNearTarget);
    const refineTimer = window.setTimeout(refineToRenderedRow, shouldVirtualize ? 260 : 80);
    return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(refineTimer);
    };
  }, [focusKey, renderRows, scrollToIndex, shouldVirtualize]);

  useEffect(() => {
    logger.debug('MainTable profile', {
      totalRowsInMemory: flatData.length,
      renderedLogicalRows: renderRows.length,
      renderedRows: renderedCount,
      virtualized: shouldVirtualize,
      virtualWindow: shouldVirtualize && virtualItems.length > 0 ? `${virtualItems[0].index}-${virtualItems[virtualItems.length - 1].index}` : 'full',
      measuredCanvasHeight: shouldVirtualize ? Math.round(totalSize) : renderRows.length * ESTIMATED_ROW_HEIGHT,
      estimatedRowsSkipped: shouldVirtualize ? Math.max(0, renderRows.length - renderedCount) : 0,
      estimatedDomReductionPercent: shouldVirtualize
        ? Math.round((1 - renderedCount / Math.max(1, renderRows.length)) * 100)
        : 0,
    });
  }, [flatData.length, renderRows.length, renderedCount, shouldVirtualize, totalSize, virtualItems]);

  if (!lessonsData || lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData)) {
      return (
          <div dir={contentDirection} data-content-direction={contentDirection}>
              <EmptyState
                  onOpenAddContentModal={onOpenAddContentModal}
                  predefinedProgramTitle={predefinedProgramTitle}
                  onLoadPredefined={onLoadPredefined}
              />
          </div>
      );
  }

  if (visibleRows.length === 0 && searchQuery?.trim()) {
    return (
      <div className="border border-border bg-card p-8 text-center" dir={contentDirection}>
        <BookOpen className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="mb-4 text-muted-foreground">{t('print.noContent')}</p>
        <Button variant="outline" onClick={onClearSearch}>{t('toolbar.clearSearch')}</Button>
      </div>
    );
  }

  return (
    /* Cadre complet Sharp UI : angles droits, bordure nette et ombre douce */
    <Card
      data-editor-table
      data-content-direction={contentDirection}
      dir={contentDirection}
      className="rtl-table mx-0 overflow-hidden rounded-[var(--radius-xl,0.875rem)] border border-border bg-card shadow-[0_8px_30px_rgba(63,58,52,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-shadow duration-200"
      style={{ '--cdt-table-cols': TABLE_GRID_COLUMNS } as React.CSSProperties}
    >
      <TableHeader />
      <CardContent className="!p-0">
        <div ref={scrollRef} className="relative" style={shouldVirtualize ? { height: totalSize, overflowAnchor: 'none' } : undefined}>
          {(() => {
              const rows: Array<{ row: RenderRow; virtualItem?: VirtualItem; absoluteIndex: number }> = shouldVirtualize
                ? virtualItems.map(virtualItem => ({ row: renderRows[virtualItem.index], virtualItem, absoluteIndex: virtualItem.index })).filter(entry => !!entry.row)
                : renderRows.map((row, absoluteIndex) => ({ row, absoluteIndex }));

              return rows.map(({ row, virtualItem, absoluteIndex }) => {
                  if (row.kind === 'session') {
                      const rowFocusKey = row.items.some(item => item.key === focusKey) ? focusKey : undefined;
                      return (
                          <VirtualListRow key={row.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={rowFocusKey ?? undefined} className={rowFocusKey ? 'action-source-highlight' : undefined}>
                              <SessionGroupRow
                                  items={row.items}
                                  selectedKeys={selectedKeys}
                                  newlyAddedIds={newlyAddedIds}
                                  onToggleSelect={onToggleSelect}
                                  onDoubleClickEdit={onOpenContentEditor}
                                  showDescriptions={showDescriptions}
                                  descriptionTypes={descriptionTypes}
                                  searchQuery={searchQuery}
                                  getDateWarnings={getDateWarnings}
                              />
                          </VirtualListRow>
                      );
                  }

                  const { item } = row;

                  if (item.elementType === 'separator') {
                      const originalItemIndices = item.indices;
                      const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                      return (
                          <VirtualListRow key={item.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
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

                  const isSelected = selectedKeys.has(item.key);
                  const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));

                  return (
                      <VirtualListRow key={item.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
                          <TableRow
                              data={item.data}
                              indices={item.indices}
                              elementType={item.elementType}
                              dateMerge={item.dateMerge}
                              onToggleSelect={onToggleSelect}
                              onDoubleClickEdit={onOpenContentEditor}
                              isSelected={isSelected}
                              isNew={isNew}
                              showDescriptions={showDescriptions}
                              descriptionTypes={descriptionTypes}
                              searchQuery={searchQuery}
                              getDateWarnings={getDateWarnings}
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

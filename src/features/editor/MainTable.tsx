import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { LessonsData, Indices, ContentDirection, ClassInfo } from '@/types';
import { withAbsenceRows, groupRowsWithAbsences, absenceRemarkGroups, type AbsenceSession, type AbsenceDisplayRow } from '@/domain/notebook/absenceSessions';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { type LessonRow } from '@/domain/notebook/lessonRows';
import type { ContentDateOrder } from '@/domain/calendar/dateOrder';
import { MultiDateCard, TableRow } from './TableRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getMergeableDate, type RenderRow } from '@/domain/notebook/tableRows';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { logger } from '@/lib/logger';
import { useWindowVirtualizer, VirtualListRow, type VirtualItem } from '@/components/ui/virtual-list';
import { useLocale } from '@/i18n/LocaleProvider';
import { hasOnlyPristineStarterDiagnostic } from '@/domain/notebook/starterDiagnostic';
import { LessonSearchIllustration } from '@/components/ui/DynamicIllustration';
import { useEditorRowReorder } from './useEditorRowReorder';
import { SessionGroupRow } from './SessionGroupRow';
import { NotebookEmptyState } from './NotebookEmptyState';
import { sortAttributes } from './tableSortAttributes';
import './editorRowReorder.css';

// Une seule source de largeurs pour toute l'application : `.editor-table-grid`
// résout `--cdt-table-cols`, redéfini par `index.css` pour le téléphone
// (largeurs MINIMALES comprises) puis pour le desktop. Des pourcentages
// codés en dur ici écrasaient ces bornes sur téléphone et tassaient les
// colonnes — donc les rails et la lisibilité.
const TABLE_GRID_CLASS = 'editor-table-grid';

interface MainTableProps {
  supportClass?: Pick<ClassInfo, 'id' | 'name'> & Partial<Pick<ClassInfo, 'createdAt' | 'subject'>>;
  lessonsData: LessonsData;
  visibleRows: LessonRow[];
  absenceSessions?: readonly AbsenceSession[];
  onClearSearch: () => void;
  /** Sens de lecture du cahier importé, indépendant de l'interface générale. */
  contentDirection: ContentDirection;
  onOpenAddContentModal: (indices?: Indices) => void;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (indices: Indices) => void;
  onToggleSelectGroup?: (indices: Indices[]) => void;
  onOpenContentEditor: (indices: Indices) => void;
  onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
  /** saisie de la remarque de la séance (ligne ou groupe fusionné) */
  onOpenRemark?: (indices: Indices) => void;
  newlyAddedIds: string[];
  /** clé de la ligne dont le contenu est ouvert dans l’éditeur */
  editingKey?: string;
  /** garde intelligente : alertes live sur la date saisie */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** ordre chronologique : voisins datés du contenu (alerte de recul de date) */
  getDateOrder?: (indices: Indices) => ContentDateOrder | undefined;
  /** numéro de série du contenu : « définition 1 », « exemple 2 »… */
  getContentNumber?: (indices: Indices) => string | undefined;
  /** tracé automatique d'une séance (contrôle des cahiers), indexé par date */
  getSessionAnnotation?: (date?: string) => string | undefined;
  /**
   * Sujet écrit par le professeur, lu par la LIGNE du cahier : la pastille
   * « Document » ne s'affiche que sur un devoir qui a réellement un sujet
   * (voir `notebookDocumentPreviews`). Lecture pure, aucun parcours par rangée.
   */
  getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
  getSessionDocuments?: (date: string) => readonly NotebookDocumentPreview[] | undefined;
  /** ouvre l'aperçu du sujet en lecture seule */
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
  /** terme de recherche actif (surlignage dans les lignes) */
  searchQuery?: string;
  /** rangée à rejoindre automatiquement après une suggestion de séance */
  focusKey?: string | null;
  /** programme officiel proposé lorsque le cahier est encore vide */
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
  onReorder?: (sourceKey: string, targetKey: string, side: 'before' | 'after') => boolean;
  canReorder?: (sourceKey: string, targetKey: string, side: 'before' | 'after') => boolean;
}

const VIRTUALIZATION_THRESHOLD = 140;
const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 16;
/** Référence stable : un `[]` littéral par défaut créait un nouveau tableau à
 *  chaque rendu et invalidait les `useMemo` dont il est une dépendance. */
const NO_DESCRIPTION_TYPES: string[] = [];
const NO_ABSENCES: readonly AbsenceSession[] = [];

const TableHeader: React.FC = React.memo(() => {
  const { t } = useLocale();
  return (
  /* §G : aucun padding externe, les colonnes de l'en-tête restent alignées
     avec celles des rangées. Style épuré inspiré de Google Keep. */
  <div className="border-b border-border/60 bg-muted/30">
    {/* filets verticaux : prolongent ceux des rangées (Date|Contenu|Remarque) */}
    <div className={`grid min-h-9 sm:min-h-11 ${TABLE_GRID_CLASS}`}>
      <div className="flex items-center justify-center border-e border-border/60 px-1 py-1.5 text-center sm:px-2.5 sm:py-2">
        <span dir={textDirectionAttribute(t('editor.date'))} className="editor-type-table-side font-sans font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('editor.date')}</span>
      </div>
      <div className="flex items-center justify-center border-e border-border px-2 py-1.5 text-center sm:px-3 sm:py-2">
        <span dir={textDirectionAttribute(t('editor.content'))} className="editor-type-table-main font-sans font-bold uppercase tracking-[0.08em] text-foreground">{t('editor.content')}</span>
      </div>
      <div className="flex items-center justify-center px-1 py-1.5 sm:px-2.5 sm:py-2 text-center">
        <span dir={textDirectionAttribute(t('editor.remark'))} className="editor-type-table-side font-sans font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span className="sr-only sm:not-sr-only">{t('editor.remark')}</span>
          <span className="sm:hidden" aria-hidden="true">{t('editor.remarkShort')}</span>
        </span>
      </div>
    </div>
  </div>
  );
});
TableHeader.displayName = 'TableHeader';


export const MainTable: React.FC<MainTableProps> = React.memo(({
  supportClass,
  lessonsData,
  visibleRows,
  absenceSessions = NO_ABSENCES,
  onClearSearch,
  contentDirection,
  onOpenAddContentModal,
  showDescriptions,
  descriptionTypes = NO_DESCRIPTION_TYPES,
  selectedKeys,
  onToggleSelect,
  onToggleSelectGroup,
  newlyAddedIds,
  editingKey,
  onOpenContentEditor,
  onOpenDateModal,
  onOpenRemark,
  getDateWarnings,
  getDateOrder,
  getContentNumber,
  getSessionAnnotation,
  getDocumentPreview,
  getSessionDocuments,
  onOpenDocumentPreview,
  searchQuery,
  focusKey,
  predefinedProgramTitle,
  onLoadPredefined,
  onReorder,
  canReorder,
}) => {
  const { t } = useLocale();
  const { flatData, renderRows: courseRows } = useMemo(() => groupRowsWithAbsences(hasOnlyPristineStarterDiagnostic(lessonsData) ? [] : visibleRows, absenceSessions), [visibleRows, absenceSessions, lessonsData]);
  const renderRows = useMemo(() => {
    const query = searchQuery?.trim().toLocaleLowerCase();
    const sessions = query ? absenceSessions.filter(session =>
      [session.date, formatDateDDMMYYYY(session.date) ?? session.date, t('notifications.absenceCertificate'), ...session.reasons]
        .some(text => text.toLocaleLowerCase().includes(query))) : absenceSessions;
    return withAbsenceRows(courseRows, sessions, row =>
      (row.kind === 'single' ? [row.item] : row.items).map(item => getMergeableDate(item)).filter((date): date is string => !!date));
  }, [courseRows, absenceSessions, searchQuery, t]);

  const measurementIds = useRef(new WeakMap<object, number>());
  const nextMeasurementId = useRef(0);
  const getSortId = useCallback((data: object) => {
    let id = measurementIds.current.get(data);
    if (id === undefined) {
      id = ++nextMeasurementId.current;
      measurementIds.current.set(data, id);
    }
    return String(id);
  }, []);
  const itemKeys = useMemo(() => renderRows.map(row => {
    if (row.kind === 'absence') return row.key + ':' + JSON.stringify(row.sessions) + ':' + contentDirection;
    const items = row.kind === 'single' ? [row.item] : row.items;
    return items.map(item => getSortId(item.data)).join(':') + ':' + contentDirection + ':' + showDescriptions + ':' + descriptionTypes.join(',');
  }), [renderRows, contentDirection, showDescriptions, descriptionTypes, getSortId]);
  const sortRootRef = useRef<HTMLDivElement>(null);
  const sort = useEditorRowReorder(sortRootRef, itemKeys, {
    started: t('editor.reorderStarted'), moved: t('editor.reorderMoved'), cancelled: t('editor.reorderCancelled'),
    before: t('editor.reorderBefore'), after: t('editor.reorderAfter'), inside: t('editor.reorderInside'),
    choose: t('editor.reorderChoose'), unavailable: t('editor.reorderUnavailable'),
    cancel: t('common.cancel'),
  }, searchQuery?.trim() ? undefined : onReorder, canReorder);
  const sortable = Boolean(onReorder && canReorder && !searchQuery?.trim());
  const shouldVirtualize = flatData.length > VIRTUALIZATION_THRESHOLD;
  const focusIndex = useMemo(() => focusKey ? renderRows.findIndex(row => row.kind !== 'absence' && (
    row.kind === 'single' ? row.item.key === focusKey : row.items.some(item => item.key === focusKey)
  )) : -1, [focusKey, renderRows]);
  const keepIndices = useMemo(() => focusIndex < 0 ? [] : [focusIndex], [focusIndex]);
  const estimateSizes = useMemo(() => renderRows.map(row =>
    row.kind === 'absence' ? Math.max(ESTIMATED_ROW_HEIGHT, row.sessions.length * 24, absenceRemarkGroups(row.sessions).length * 52) :
    (row.kind === 'session' && !(row.items[0].dateMerge?.mergeType === 'content'
      && row.items[0].dateMerge?.shouldMergeRemark) ? row.items.length : 1) * ESTIMATED_ROW_HEIGHT
  ), [renderRows]);
  const { scrollRef, scrollToIndex, totalSize, virtualItems, measureElement, renderedCount } = useWindowVirtualizer({
    count: renderRows.length,
    itemKeys,
    enabled: shouldVirtualize,
    estimateSize: ESTIMATED_ROW_HEIGHT,
    estimateSizes,
    overscan: VIRTUAL_OVERSCAN,
    keepIndices,
  });

  useEffect(() => {
    if (!focusKey) return;

    if (focusIndex < 0) return;

    const scrollNearTarget = () => { if (shouldVirtualize) scrollToIndex(focusIndex); };

    const refineToRenderedRow = () => {
        const row = Array.from(scrollRef.current?.querySelectorAll<HTMLElement>('[data-focus-key]') ?? [])
            .find(element => element.dataset.focusKey === focusKey);
        row?.scrollIntoView({ block: 'center', behavior: 'instant', inline: 'nearest' });
    };

    const frame = window.requestAnimationFrame(scrollNearTarget);
    let refineTimer = window.setTimeout(refineToRenderedRow, shouldVirtualize ? 100 : 0);
    // Measured virtual rows and fonts can change the offsets after the first
    // jump. Refine once geometry settles, until the temporary focus expires.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      window.clearTimeout(refineTimer);
      refineTimer = window.setTimeout(refineToRenderedRow, 50);
    });
    if (scrollRef.current) observer?.observe(scrollRef.current);
    const stopPlacement = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(refineTimer);
      observer?.disconnect();
    };
    const gestures = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    gestures.forEach(event => window.addEventListener(event, stopPlacement, { passive: true, once: true }));
    return () => {
        stopPlacement();
        gestures.forEach(event => window.removeEventListener(event, stopPlacement));
    };
  }, [focusKey, focusIndex, scrollRef, scrollToIndex, shouldVirtualize]);

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

  if ((!lessonsData || lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData)) && absenceSessions.length === 0) {
      return (
          <div dir={contentDirection} data-content-direction={contentDirection}>
              <NotebookEmptyState
                  supportClass={supportClass}
                  onOpenAddContentModal={onOpenAddContentModal}
                  predefinedProgramTitle={predefinedProgramTitle}
                  onLoadPredefined={onLoadPredefined}
              />
          </div>
      );
  }

  if (renderRows.length === 0 && searchQuery?.trim()) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" dir={contentDirection}>
        <LessonSearchIllustration size={120} className="mx-auto mb-3" />
        <p className="mb-4 text-muted-foreground">{t('print.noContent')}</p>
        <Button variant="outline" onClick={onClearSearch}>{t('toolbar.clearSearch')}</Button>
      </div>
    );
  }

  return (
    <Card
      data-editor-table
      data-content-direction={contentDirection}
      dir={contentDirection}
      className="rtl-table mx-0 overflow-clip rounded-lg border-2 border-border/80 dark:border-border/90 bg-card shadow-xs transition-shadow duration-200 print:border-none"
    >
      <TableHeader />
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={sort.announcement.sequence}>{sort.announcement.text}</span></span>
      {(sort.announcement.text === t('editor.reorderStarted') || sort.announcement.text === t('editor.reorderChoose')) && <div className="editor-reorder-notice"><span role="status">{t('editor.reorderChoose')}</span><button type="button" onClick={sort.cancelReorder}>{t('common.cancel')}</button></div>}
      <CardContent className="!p-0">
        <div ref={element => { scrollRef.current = element; sortRootRef.current = element; }} className="relative" style={shouldVirtualize ? { height: totalSize, overflowAnchor: 'none' } : undefined}
          onPointerDown={sort.onPointerDown} onTouchStart={sort.onTouchStart} onClickCapture={sort.onClickCapture} onDoubleClickCapture={sort.onClickCapture}
          onContextMenuCapture={sort.onContextMenu} onKeyDown={sort.onKeyDown}>
          {(() => {
              const rows: Array<{ row: RenderRow | AbsenceDisplayRow; virtualItem?: VirtualItem; absoluteIndex: number }> = shouldVirtualize
                ? virtualItems.map(virtualItem => ({ row: renderRows[virtualItem.index], virtualItem, absoluteIndex: virtualItem.index })).filter(entry => !!entry.row)
                : renderRows.map((row, absoluteIndex) => ({ row, absoluteIndex }));

              return rows.map(({ row, virtualItem, absoluteIndex }) => {
                  if (row.kind === 'absence') {
                    const dates = row.sessions.map(session => session.date);
                    const remarks = absenceRemarkGroups(row.sessions);
                    return (
                      <VirtualListRow key={row.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement}>
                          <div data-absence-session={row.session.date} data-absence-dates={dates.join(',')} className={`grid min-h-14 border-b border-border bg-muted/20 ${TABLE_GRID_CLASS}`}>
                              <div title={dates.map(date => formatDateDDMMYYYY(date) ?? date).join(' · ')} className="flex min-w-0 items-center justify-center border-e border-border px-1 py-3 text-center editor-type-table-side"><MultiDateCard dates={dates} /></div>
                              <div dir={textDirectionAttribute(t('notifications.absenceCertificate'))} className="flex items-center justify-center text-center border-e border-border px-3 py-3 font-medium editor-type-table-main">{t('notifications.absenceCertificate')}</div>
                              <div className="flex min-w-0 flex-col justify-center gap-2 whitespace-pre-wrap break-words px-2 py-3 text-muted-foreground editor-type-remark">
                                  {remarks.map(remark => <div key={remark.dates[0]} dir={textDirectionAttribute(remark.reasons.join(' · '))}>
                                      {remarks.length > 1 && <div className="mb-1 text-xs font-medium tabular-nums">{remark.dates.map(date => <bdi key={date} dir="ltr" title={formatDateDDMMYYYY(date) ?? date} className="inline-block max-w-full me-1">
                                          <span className="sm:hidden">{formatDateDDMMYYYY(date)?.slice(0, 5)}</span><span className="hidden sm:inline">{formatDateDDMMYYYY(date)}</span>
                                      </bdi>)}</div>}
                                      {remark.reasons.join(' · ')}
                                  </div>)}
                              </div>
                          </div>
                      </VirtualListRow>
                    );
                  }
                  if (row.kind === 'session') {
                      const rowFocusKey = row.items.some(item => item.key === focusKey) ? focusKey : undefined;
                      return (
                          <VirtualListRow key={row.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} className={rowFocusKey ? 'action-source-highlight' : undefined}>
                              <SessionGroupRow
                                  getSortId={getSortId}
                                  items={row.items}
                                  selectedKeys={selectedKeys}
                                  newlyAddedIds={newlyAddedIds}
                                  editingKey={editingKey}
                                  focusKey={rowFocusKey}
                                  onToggleSelect={onToggleSelect}
                                  onToggleSelectGroup={onToggleSelectGroup}
                                  onDoubleClickEdit={onOpenContentEditor}
                                  onOpenDateModal={onOpenDateModal}
                                  onOpenRemark={onOpenRemark}
                                  showDescriptions={showDescriptions}
                                  descriptionTypes={descriptionTypes}
                                  searchQuery={searchQuery}
                                  getDateWarnings={getDateWarnings}
                                  getDateOrder={getDateOrder}
                                  getContentNumber={getContentNumber}
                                  getSessionAnnotation={getSessionAnnotation}
                                  getDocumentPreview={getDocumentPreview}
                                  getSessionDocuments={getSessionDocuments}
                                  onOpenDocumentPreview={onOpenDocumentPreview}
                                  sortable={sortable}
                              />
                          </VirtualListRow>
                      );
                  }

                  const { item } = row;
                  const itemDate = getMergeableDate(item);

                  const isSelected = selectedKeys.has(item.key);
                  const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));

                  return (
                      <VirtualListRow key={item.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
                        <div {...sortAttributes(item, getSortId(item.data))}>
                          <TableRow
                              data={item.data}
                              indices={item.indices}
                              elementType={item.elementType}
                              dateMerge={item.dateMerge}
                              onToggleSelect={onToggleSelect}
                              onDoubleClickEdit={onOpenContentEditor}
                              onOpenDateModal={onOpenDateModal}
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
                              sessionAnnotation={itemDate ? getSessionAnnotation?.(itemDate) : undefined}
                              sessionDocuments={itemDate ? getSessionDocuments?.(itemDate) : undefined}
                              sortable={sortable}
                          />
                        </div>
                      </VirtualListRow>
                  );
              });
          })()}
        </div>
        {(lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData)) && (
          <div className="border-t border-border p-3"><Button variant="outline" className="min-h-11 w-full" onClick={() => onOpenAddContentModal()}>{t('emptyNotebook.createChapter')}</Button></div>
        )}
      </CardContent>
    </Card>
  );
});
MainTable.displayName = 'MainTable';

import React, { useEffect, useMemo } from 'react';
import { LessonsData, Indices, Section, SubSection, SubSubSection, LessonItem, ElementType, Separator, TopLevelItem, EmbeddableTopLevelItem, ContentDirection } from '@/types';
import { DateCard, MultiDateCard, DateMergeMeta, TableRow } from './TableRow';
import { SeparatorRow } from './SeparatorRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from '@/components/ui/icons';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { logger } from '@/utils/logger';
import { useWindowVirtualizer, VirtualListRow, type VirtualItem } from '@/components/ui/virtual-list';
import { useLocale } from '@/i18n/LocaleProvider';

const TABLE_GRID_COLUMNS = 'minmax(8.5rem, 13%) minmax(0, 1fr) minmax(9.5rem, 16%)';
const TABLE_GRID_CLASS = 'grid-cols-[18%_1fr_20%] md:grid-cols-[var(--cdt-table-cols)]';

interface MainTableProps {
  lessonsData: LessonsData;
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
  /** Surface de chapitre déduite du niveau de la classe ouverte. */
  chapterSurfaceClass?: string;
}

interface FlatDataItem {
    data: TopLevelItem | Section | SubSection | SubSubSection | LessonItem | Separator | EmbeddableTopLevelItem;
    indices: Indices;
    elementType: ElementType;
    key: string;
    dateMerge?: DateMergeMeta;
}

type RenderRow =
    | { kind: 'single'; item: FlatDataItem; key: string; flatIndex: number }
    | { kind: 'session'; items: FlatDataItem[]; key: string; flatIndex: number };


const VIRTUALIZATION_THRESHOLD = 140;
const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 16;

const TableHeader: React.FC = React.memo(() => {
  const { t } = useLocale();
  return (
  /* §G : aucun padding externe, les colonnes de l'en-tête restent alignées
     avec celles des rangées (elles aussi sans padding de cadre). En-tête
     de colonnes NON collant : il défile avec le tableau (seule la barre
     d'outils reste épinglée en haut). */
  <div className="border-b border-slate-300/80 bg-slate-100/95 shadow-[inset_0_-1px_0_rgba(148,163,184,0.16)] dark:border-slate-700/80 dark:bg-slate-800/90 dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
    {/* filets verticaux : prolongent ceux des rangées (Date|Contenu|Remarque) */}
    <div className={`grid min-h-9 sm:min-h-11 ${TABLE_GRID_CLASS}`}>
      <div className="flex items-center justify-center border-e border-slate-300/75 px-1 py-1.5 text-center dark:border-slate-700/80 sm:px-2.5 sm:py-2">
        <span className="font-sans text-[9px] max-sm:portrait:text-[7.2px] sm:text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">{t('editor.date')}</span>
      </div>
      <div className="flex items-center justify-center border-e border-slate-300/75 px-2 py-1.5 text-center dark:border-slate-700/80 sm:px-3 sm:py-2">
        <span className="font-sans text-[10px] max-sm:portrait:text-[8px] sm:text-[11px] font-black uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">{t('editor.content')}</span>
      </div>
      <div className="flex items-center justify-center px-1 py-1.5 sm:px-2.5 sm:py-2 text-center">
        <span className="font-sans text-[9px] max-sm:portrait:text-[7.2px] sm:text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">{t('editor.remark')}</span>
      </div>
    </div>
  </div>
  );
});
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

/**
 * Identité pédagogique normalisée pour la fusion intelligente :
 * Type, numéro et titre normalisés (minuscule, sans espaces superflus).
 * Un séparateur, un chapitre, une section ou un contenu différent brise
 * immédiatement la continuité.
 */
const getPedagogicalIdentity = (item: FlatDataItem): string | null => {
    if (item.elementType !== 'item' && !TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.elementType)) return null;
    const data = item.data as any;
    const normType = (data.type || '').toString().trim().toLowerCase();
    const normNumber = (data.number || '').toString().trim().toLowerCase();
    const normTitle = (data.title || '').toString().trim().toLowerCase();
    if (!normType && !normTitle) return null;
    return `${normType}:::${normNumber}:::${normTitle}`;
};

const parseDateTimestamp = (dateStr: string | null): number => {
    if (!dateStr) return 0;
    try {
        if (dateStr.includes('-')) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
            }
        } else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
            }
        }
        const time = new Date(dateStr).getTime();
        return isNaN(time) ? 0 : time;
    } catch {
        return 0;
    }
};

/**
 * Fusion intelligente des séances et contenus :
 * 1. Même date : toutes les lignes consécutives ayant la même date de séance
 *    sont fusionnées dans une cellule de date commune.
 * 2. Même contenu multi-dates : les lignes consécutives de même identité pédagogique
 *    (type, numéro, titre) sur des dates successives sont regroupées avec MultiDateCard.
 */
const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
    let start = 0;
    while (start < items.length) {
        const itemStart = items[start];
        const dateStart = getMergeableDate(itemStart);
        const identityStart = getPedagogicalIdentity(itemStart);
        const isDatedSequenceStart = Boolean(dateStart && (start === 0 || !getMergeableDate(items[start - 1])));

        if (!dateStart || itemStart.elementType === 'separator') {
            const isDatedSequenceEnd = start === items.length - 1 || !getMergeableDate(items[start + 1]);
            itemStart.dateMerge = {
                isMerged: false,
                mergeType: 'date',
                isStart: true,
                isContinuation: false,
                isEnd: true,
                count: 1,
                indexInGroup: 0,
                isDatedSequenceStart: !!isDatedSequenceStart,
                isDatedSequenceEnd: !!isDatedSequenceEnd,
            };
            start += 1;
            continue;
        }

        // 1. Détection des lignes consécutives de MÊME DATE
        let sameDateEnd = start + 1;
        while (sameDateEnd < items.length) {
            const nextItem = items[sameDateEnd];
            const nextDate = getMergeableDate(nextItem);
            if (nextItem.elementType === 'separator' || !nextDate || nextDate !== dateStart) {
                break;
            }
            sameDateEnd += 1;
        }

        // 2. Détection des lignes consécutives de MÊME CONTENU sur dates distinctes (Multi-date)
        let sameContentEnd = start + 1;
        if (identityStart) {
            let lastDate = dateStart;
            let lastTimestamp = parseDateTimestamp(dateStart);
            while (sameContentEnd < items.length) {
                const nextItem = items[sameContentEnd];
                const nextDate = getMergeableDate(nextItem);
                const nextIdentity = getPedagogicalIdentity(nextItem);

                if (nextItem.elementType === 'separator' || !nextIdentity || nextIdentity !== identityStart || !nextDate) {
                    break;
                }
                const nextTimestamp = parseDateTimestamp(nextDate);
                if (nextDate === lastDate || (lastTimestamp > 0 && nextTimestamp < lastTimestamp)) {
                    break;
                }
                lastDate = nextDate;
                lastTimestamp = nextTimestamp;
                sameContentEnd += 1;
            }
        }

        const sameDateCount = sameDateEnd - start;
        const sameContentCount = sameContentEnd - start;

        let end = start + 1;
        let mergeType: 'date' | 'content' = 'date';

        if (sameDateCount > 1) {
            end = sameDateEnd;
            mergeType = 'date';
        } else if (sameContentCount > 1) {
            end = sameContentEnd;
            mergeType = 'content';
        } else {
            end = start + 1;
            mergeType = 'date';
        }

        const count = end - start;
        const isMerged = count > 1;
        const group = items.slice(start, end);
        const firstRemark = getMergeableRemark(group[0]);
        const shouldMergeRemark = isMerged && group.every(item => getMergeableRemark(item) === firstRemark);
        const isDatedSequenceEnd = end === items.length || !getMergeableDate(items[end]);

        for (let index = start; index < end; index += 1) {
            items[index].dateMerge = {
                isMerged,
                mergeType,
                isStart: index === start,
                isContinuation: index !== start,
                isEnd: index === end - 1,
                count,
                indexInGroup: index - start,
                shouldMergeRemark,
                isDatedSequenceStart: !!isDatedSequenceStart && index === start,
                isDatedSequenceEnd: !!isDatedSequenceEnd && index === end - 1,
            };
        }

        start = end;
    }
    return items;
};

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
    chapterSurfaceClass?: string;
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
    chapterSurfaceClass,
}) => {
    const allDates = items.map(it => getMergeableDate(it)).filter(Boolean) as string[];
    const uniqueDates = Array.from(new Set(allDates));
    const warnings = allDates.flatMap(d => (getDateWarnings ? getDateWarnings(d) : []));
    const hasWarning = warnings.length > 0;
    const sameRemark = items.every(item => getMergeableRemark(item) === getMergeableRemark(items[0]));
    const groupIsSelected = items.some(item => selectedKeys.has(item.key));
    const sharedRemark = getMergeableRemark(items[0]);

    const dividerClass = groupIsSelected
        ? 'border-e border-primary/45'
        : hasWarning
            ? 'border-e border-warning/45'
            : 'border-e border-border/90';

    return (
        <div
            className={[
                `group relative grid ${TABLE_GRID_CLASS} border-y-2 border-border/80 transition-colors duration-200`,
                hasWarning
                    ? 'border-warning/[0.6] bg-warning/[0.07]'
                    : 'bg-card/[0.18] dark:bg-slate-950/[0.14]',
                groupIsSelected ? 'bg-primary/[0.085]' : '',
            ].filter(Boolean).join(' ')}
        >
            <div className={`flex min-h-[52px] min-w-0 items-center justify-center self-stretch px-1 py-1 ${dividerClass} ${hasWarning ? 'bg-warning/10' : 'bg-card/[0.32] dark:bg-slate-950/[0.25]'}`}>
                {uniqueDates.length > 1 ? (
                    <MultiDateCard dates={uniqueDates} hasWarning={hasWarning} />
                ) : (
                    <DateCard dateStr={uniqueDates[0]} hasWarning={hasWarning} />
                )}
            </div>

            <div className={`min-w-0 self-stretch ${dividerClass}`}>
                {items.map((item, idx) => {
                    const isSelected = selectedKeys.has(item.key);
                    const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                    const isLast = idx === items.length - 1;
                    return (
                        <TableRow
                            key={item.key}
                            data={item.data}
                            indices={item.indices}
                            elementType={item.elementType}
                            dateMerge={item.dateMerge}
                            lineClassOverride={isLast ? '' : 'border-b border-border/40'}
                            layout="content-only"
                            onToggleSelect={onToggleSelect}
                            onDoubleClickEdit={onDoubleClickEdit}
                            isSelected={isSelected}
                            isNew={isNew}
                            showDescriptions={showDescriptions}
                            descriptionTypes={descriptionTypes}
                            searchQuery={searchQuery}
                            getDateWarnings={getDateWarnings}
                            chapterSurfaceClass={chapterSurfaceClass}
                        />
                    );
                })}
            </div>

            <div className={`flex min-w-0 self-stretch p-0.5 sm:p-1 ${hasWarning ? 'bg-warning/[0.055]' : 'bg-card/[0.28] dark:bg-slate-950/[0.18]'}`} onClick={event => event.stopPropagation()}>
                {sameRemark ? (
                    <div className="flex min-h-full w-full flex-col justify-center">
                        <div className="h-full w-full whitespace-pre-wrap break-words p-0.5 text-[10px] max-sm:portrait:text-[8px] font-semibold text-muted-foreground sm:p-1 sm:text-[11px]">{sharedRemark}</div>
                    </div>
                ) : (
                    <div className="flex w-full flex-col">
                        {items.map(item => (
                            <div key={item.key} className="min-h-[40px] p-0.5 sm:p-1">
                                <div className="h-full w-full whitespace-pre-wrap break-words p-0.5 text-[10px] max-sm:portrait:text-[8px] font-semibold text-muted-foreground sm:p-1 sm:text-[11px]">{getMergeableRemark(item)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
        <section className="rounded-xl border border-border/80 bg-card px-5 py-12 shadow-xs sm:px-8 sm:py-14">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
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
  chapterSurfaceClass,
}) => {
  const flatData = useMemo(() => {
    const result: FlatDataItem[] = [];

    const processElement = (
        element: any,
        indices: Indices,
        elementType: ElementType
    ): void => {
        const key = makeKey(indices);
        result.push({ data: element, indices, elementType, key });

        // Les items directement sous un nœud (activity, introduction…) passent
        // AVANT les sous-niveaux : activity → introduction → section → contenu.
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

  const renderRows = useMemo<RenderRow[]>(() => {
    const rows: RenderRow[] = [];

    for (let index = 0; index < flatData.length; index += 1) {
        const item = flatData[index];

        if (item.dateMerge?.isMerged && item.dateMerge.isStart) {
            const group = flatData.slice(index, index + item.dateMerge.count);
            rows.push({
                kind: 'session',
                items: group,
                key: `session-${item.key}`,
                flatIndex: index,
            });
            index += item.dateMerge.count - 1;
            continue;
        }

        rows.push({
            kind: 'single',
            item,
            key: item.key,
            flatIndex: index,
        });
    }

    return rows;
  }, [flatData]);

  const shouldVirtualize = renderRows.length > VIRTUALIZATION_THRESHOLD;
  const { scrollRef, totalSize, virtualItems, measureElement, renderedCount } = useWindowVirtualizer({
    count: renderRows.length,
    enabled: shouldVirtualize,
    estimateSize: ESTIMATED_ROW_HEIGHT,
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

    const scrollNearTarget = () => {
        const table = scrollRef.current;
        if (!table) return;
        const tableTop = table.getBoundingClientRect().top + window.scrollY;
        const estimatedTop = tableTop + targetIndex * ESTIMATED_ROW_HEIGHT;
        window.scrollTo({ top: Math.max(0, estimatedTop - 150), behavior: 'smooth' });
    };

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
  }, [focusKey, renderRows, scrollRef, shouldVirtualize]);

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

  if (!lessonsData || lessonsData.length === 0) {
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

  return (
    /* Cadre complet : le tableau reste lisible comme un seul objet sur ses quatre côtés. */
    <Card
      data-editor-table
      data-content-direction={contentDirection}
      dir={contentDirection}
      className="rtl-table mx-0 overflow-hidden rounded-[22px] border border-border/80 bg-card/[0.58] shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-slate-950/[0.52] sm:rounded-[24px]"
      style={{ '--cdt-table-cols': TABLE_GRID_COLUMNS } as React.CSSProperties}
    >
      <TableHeader />
      <CardContent className="!p-0">
        <div ref={scrollRef} className="relative" style={shouldVirtualize ? { height: totalSize } : undefined}>
          {(() => {
              const rows: Array<{ row: RenderRow; virtualItem?: VirtualItem; absoluteIndex: number }> = shouldVirtualize
                ? virtualItems.map(virtualItem => ({ row: renderRows[virtualItem.index], virtualItem, absoluteIndex: virtualItem.index })).filter(entry => !!entry.row)
                : renderRows.map((row, absoluteIndex) => ({ row, absoluteIndex }));

              return rows.map(({ row, virtualItem, absoluteIndex }) => {
                  if (row.kind === 'session') {
                      const rowFocusKey = row.items.some(item => item.key === focusKey) ? focusKey : undefined;
                      return (
                          <VirtualListRow key={row.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={rowFocusKey ?? undefined} className={rowFocusKey ? 'action-source-highlight' : undefined}>
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
                                  chapterSurfaceClass={chapterSurfaceClass}
                              />
                          </VirtualListRow>
                      );
                  }

                  const { item } = row;

                  if (item.elementType === 'separator') {
                      const originalItemIndices = item.indices;
                      const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                      return (
                          <VirtualListRow key={item.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
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
                      <VirtualListRow key={item.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
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
                              chapterSurfaceClass={chapterSurfaceClass}
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

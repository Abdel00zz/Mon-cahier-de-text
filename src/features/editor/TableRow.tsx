import { dateOrderWarnings } from '@/domain/calendar/dateOrder';
import React, { useCallback, FC, memo } from 'react';
import { ContentRenderer } from './ContentRenderer';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { detectTextDirection } from '@/lib/text/textDirection';
import { indicesKey } from '@/domain/notebook/lessonRows';
import { DateCell, RemarkCell } from './tableRowCells';
import type { TableRowProps } from './tableRowTypes';
export { DateCard, MultiDateCard } from './tableRowCells';
import './editorRowStates.css';
import { GripVertical } from 'lucide-react';
import { TABLE_GRID_CLASS } from './editorConstants';

const TableRowComponent: FC<TableRowProps> = ({
  data,
  indices,
  elementType,
  dateMerge,
  layout = 'full',
  lineClassOverride,
  onToggleSelect,
  onDoubleClickEdit,
  onOpenDateModal,
  onOpenRemark,
  isSelected,
  isEditing,
  showDescriptions,
  descriptionTypes = [],
  searchQuery,
  getDateWarnings,
  getDateOrder,
  getContentNumber,
  getDocumentPreview,
  onOpenDocumentPreview,
  sessionAnnotation,
  sessionDocuments,
  sortable,
}) => {
  const handleToggle = useCallback(() => onToggleSelect(indices), [indices, onToggleSelect]);
  const { locale, t } = useLocale();

  const reorderDirection = detectTextDirection(data.title) ?? detectTextDirection(data.name) ?? detectTextDirection(data.description) ?? undefined;

  const handleContentDoubleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onDoubleClickEdit) return;

    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-row-content="true"]')) return;
    // Mêmes exclusions que le clic de sélection (`.cursor-text` compris) :
    // si le clic a été ignoré, il n'y a aucun basculement à rétablir.
    if (target.closest('button,input,textarea,select,a,[contenteditable="true"],.cursor-text')) return;

    event.preventDefault();
    event.stopPropagation();
    // Un double-clic est un geste d'ÉDITION : le premier clic du double-clic
    // a déjà basculé la ligne (ou toute la séance fusionnée) via le clic de
    // sélection. On rétablit cet état AVANT d'ouvrir la modale, sinon
    // double-cliquer un titre modifie la sélection en cours.
    onToggleSelect(indices);
    onDoubleClickEdit(indices);
  }, [indices, onDoubleClickEdit, onToggleSelect]);

  const hasAssignedDate = typeof data.date === 'string' && data.date.trim().length > 0;
  const dateWarnings = (hasAssignedDate && getDateWarnings) ? getDateWarnings(data.date) : [];
  const orderWarnings = hasAssignedDate ? dateOrderWarnings(data.date, getDateOrder?.(indices), locale) : [];
  const warnings = [...dateWarnings, ...orderWarnings];
  const hasWarning = warnings.length > 0;

  /*
   * Ligne horizontale intelligente :
   * - les éléments non datés ne dessinent pas de traits entre les textes ;
   * - une séance datée, seule ou fusionnée sur plusieurs lignes, est marquée
   *   par une entrée/sortie visuelle, sans couper l'intérieur du groupe.
   */
  const isMergedDateGroup = !!dateMerge?.isMerged;
  const isDatedGroupEnd = hasAssignedDate && (!isMergedDateGroup || dateMerge?.isEnd);

  const isDatedSequenceStart = !!dateMerge?.isDatedSequenceStart;
  const isDatedSequenceEnd = !!dateMerge?.isDatedSequenceEnd;

  const topBorderClass = isDatedSequenceStart
    ? (hasWarning ? 'border-t-[2px] border-t-alert/[0.7]' : 'border-t-[2px] border-t-foreground/30')
    : '';

  const bottomBorderClass = isDatedSequenceEnd
    ? (hasWarning ? 'border-b-[2px] border-b-alert/[0.7]' : 'border-b-[2px] border-b-foreground/30')
    : isDatedGroupEnd
      ? (hasWarning ? 'border-b border-b-alert/[0.65]' : 'border-b border-b-border/70')
      : '';

  const datedLineClass = [topBorderClass, bottomBorderClass].filter(Boolean).join(' ');
  const undatedLineClass = isSelected ? 'border-b border-b-primary/15' : '';
  const rowLineClass = hasAssignedDate ? datedLineClass : undatedLineClass;

  const dateBottomBorder = rowLineClass;
  const contentBottomBorder = lineClassOverride ?? rowLineClass;

  const datedWash = hasWarning ? 'bg-alert/[0.07]' : 'bg-transparent';
  const rowState = [isSelected ? 'selected' : null, isEditing ? 'editing' : null].filter(Boolean).join(' ') || undefined;
  const rowWash = (isSelected || isEditing) ? '' : datedWash;
  const hoverWash = isSelected
    ? ''
    : hasWarning
      ? 'hover:bg-alert/[0.11]'
      : hasAssignedDate
        ? 'hover:bg-muted/20'
        : 'hover:bg-muted/30';
  const frameClasses = `editor-row group relative ${rowWash} ${hoverWash} transition-colors duration-150`;

  const dividerClass = isSelected
    ? 'border-e border-e-border'
    : hasAssignedDate && hasWarning
      ? 'border-e border-e-alert/40'
      : 'border-e border-e-border';
  const contentDividerClass = layout === 'content-only' ? '' : dividerClass;

  const isCorrection = elementType.startsWith('correction_');
  const isTopLevelBlock = (elementType in TOP_LEVEL_TYPE_CONFIG && elementType !== 'chapter') || isCorrection;

  const renderedContent = (
    <ContentRenderer
      data={data}
      indices={indices}
      elementType={elementType}
      showDescriptions={showDescriptions}
      descriptionTypes={descriptionTypes}
      highlight={searchQuery}
      contentNumber={getContentNumber?.(indices)}
      getDocumentPreview={getDocumentPreview}
      onOpenDocumentPreview={onOpenDocumentPreview}
    />
  );

  const contentCell = (
    <div
      className={`relative min-w-0 flex-1 ${isTopLevelBlock ? 'flex items-center justify-start' : ''} cursor-pointer py-0.5 ps-2.5 pe-10 sm:ps-3 sm:pe-11 ${sortable ? 'editor-row-content--sortable' : ''} ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-alert/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-colors duration-150 ${contentBottomBorder}`}
      data-row-content="true"
      data-reorder-direction={reorderDirection}
      tabIndex={sortable ? 0 : undefined}
      onClick={event => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('button,input,textarea,select,a,[contenteditable="true"],.cursor-text')) {
          return;
        }
        event.stopPropagation();
        if (event.detail > 1) return;
        handleToggle();
      }}
    >
      {isTopLevelBlock ? (
        <div className="min-w-0 w-full pe-1">
          <div className="flex w-full items-center justify-start py-0.5">
            {renderedContent}
          </div>
        </div>
      ) : (
        renderedContent
      )}
      {sortable && (
        <button
          type="button"
          data-reorder-handle
          onClick={event => event.stopPropagation()}
          className="editor-reorder-handle"
          aria-label={t('editor.reorderHandle')}
          title={t('editor.reorderHandle')}
        >
          <GripVertical size={13} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  const hasRowMetadata = Boolean(hasAssignedDate || data.remark || sessionAnnotation || sessionDocuments?.length) || undefined;

  if (layout === 'content-only') {
    return (
      <div
        className={['relative touch-manipulation transition-colors duration-100', frameClasses].filter(Boolean).join(' ')}
        data-row-state={rowState}
        data-row-metadata={hasRowMetadata}
        onDoubleClickCapture={handleContentDoubleClickCapture}
        onDoubleClick={event => event.stopPropagation()}
      >
        {contentCell}
      </div>
    );
  }

  return (
    <div
      className={[`grid ${TABLE_GRID_CLASS} touch-manipulation transition-colors duration-100`, frameClasses].filter(Boolean).join(' ')}
      data-row-state={rowState}
      data-row-metadata={hasRowMetadata}
      onDoubleClickCapture={handleContentDoubleClickCapture}
      onDoubleClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        data-editor-cell="date"
        className={`min-w-0 flex flex-col items-stretch justify-center self-stretch select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${dividerClass} ${dateBottomBorder} cursor-pointer hover:bg-primary/5 active:bg-primary/10 transition-colors`}
        onClick={(event) => {
          event.stopPropagation();
          if (onOpenDateModal) {
            onOpenDateModal(indices, typeof data.date === 'string' ? data.date : undefined);
          } else {
            handleToggle();
          }
        }}
        title={t('selection.chooseDate')}
        aria-label={t('selection.chooseDate')}
      >
        <DateCell dateStr={data.date} merge={dateMerge} hasWarning={hasWarning} isSelected={isSelected} hasAssignedDate={hasAssignedDate} />
      </button>

      {contentCell}

      <RemarkCell
        value={data.remark || ''}
        merge={dateMerge}
        lineClass={contentBottomBorder}
        hasAssignedDate={hasAssignedDate}
        isSelected={isSelected}
        hasWarning={hasWarning}
        onOpenRemark={onOpenRemark ? () => onOpenRemark(indices) : undefined}
        sessionAnnotation={sessionAnnotation}
        sessionDocuments={sessionDocuments}
        onOpenDocumentPreview={onOpenDocumentPreview}
      />
    </div>
  );
};

export const TableRow = memo(TableRowComponent, (prev, next) => {
  if (prev.sortable !== next.sortable) return false;
  if (
    prev.onToggleSelect !== next.onToggleSelect ||
    prev.onDoubleClickEdit !== next.onDoubleClickEdit ||
    prev.onOpenDateModal !== next.onOpenDateModal ||
    prev.onOpenRemark !== next.onOpenRemark ||
    prev.getDateWarnings !== next.getDateWarnings ||
    prev.getDocumentPreview !== next.getDocumentPreview ||
    prev.onOpenDocumentPreview !== next.onOpenDocumentPreview
  ) {
    return false;
  }
  if (prev.data !== next.data) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isNew !== next.isNew) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.sessionAnnotation !== next.sessionAnnotation || prev.sessionDocuments !== next.sessionDocuments) return false;
  if (prev.showDescriptions !== next.showDescriptions) return false;
  if (prev.elementType !== next.elementType) return false;
  if (prev.searchQuery !== next.searchQuery) return false;
  if (prev.layout !== next.layout) return false;
  if (prev.lineClassOverride !== next.lineClassOverride) return false;

  // Compare les résultats résolus pour cette ligne plutôt que la seule référence
  // des fonctions de lookup : évite de re-rendre tout le tableau quand une ligne est supprimée.
  if (prev.getContentNumber?.(prev.indices) !== next.getContentNumber?.(next.indices)) return false;
  if (prev.getDocumentPreview?.(indicesKey(prev.indices)) !== next.getDocumentPreview?.(indicesKey(next.indices))) return false;
  const hasDate = typeof next.data?.date === 'string' && next.data.date.trim().length > 0;
  if (hasDate && prev.getDateOrder !== next.getDateOrder) {
    const prevOrder = prev.getDateOrder?.(prev.indices);
    const nextOrder = next.getDateOrder?.(next.indices);
    if (prevOrder?.previous !== nextOrder?.previous || prevOrder?.following !== nextOrder?.following) {
      return false;
    }
  }

  const pIdx = prev.indices;
  const nIdx = next.indices;
  if (
    pIdx.chapterIndex !== nIdx.chapterIndex ||
    pIdx.sectionIndex !== nIdx.sectionIndex ||
    pIdx.subsectionIndex !== nIdx.subsectionIndex ||
    pIdx.subsubsectionIndex !== nIdx.subsubsectionIndex ||
    pIdx.itemIndex !== nIdx.itemIndex
  ) {
    return false;
  }

  const pMerge = prev.dateMerge;
  const nMerge = next.dateMerge;
  if (pMerge !== nMerge) {
    if (!pMerge || !nMerge) return false;
    if (
      pMerge.isMerged !== nMerge.isMerged ||
      pMerge.mergeType !== nMerge.mergeType ||
      pMerge.isDatedSequenceStart !== nMerge.isDatedSequenceStart ||
      pMerge.isDatedSequenceEnd !== nMerge.isDatedSequenceEnd ||
      pMerge.isStart !== nMerge.isStart ||
      pMerge.isContinuation !== nMerge.isContinuation ||
      pMerge.isEnd !== nMerge.isEnd ||
      pMerge.count !== nMerge.count ||
      pMerge.indexInGroup !== nMerge.indexInGroup ||
      pMerge.shouldMergeRemark !== nMerge.shouldMergeRemark
    ) {
      return false;
    }
  }

  const pTypes = prev.descriptionTypes;
  const nTypes = next.descriptionTypes;
  if (pTypes !== nTypes) {
    if (!pTypes || !nTypes) return false;
    if (pTypes.length !== nTypes.length) return false;
    for (let i = 0; i < pTypes.length; i++) {
      if (pTypes[i] !== nTypes[i]) return false;
    }
  }

  return true;
});

TableRow.displayName = 'TableRow';

import { dateOrderWarnings } from '@/domain/calendar/dateOrder';
import React, { useCallback, FC, memo } from 'react';
import { ContentRenderer } from './ContentRenderer';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { detectTextDirection } from '@/lib/text/textDirection';
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
    // Memes exclusions que le clic de selection (`.cursor-text` compris) :
    // si le clic a ete ignore, il n'y a aucun basculement a retablir.
    if (target.closest('button,input,textarea,select,a,[contenteditable="true"],.cursor-text')) return;

    event.preventDefault();
    event.stopPropagation();
    // Un double-clic est un geste d'EDITION : le premier clic du double-clic
    // a deja bascule la ligne (ou toute la seance fusionnee) via le clic de
    // selection. On retablit cet etat AVANT d'ouvrir la modale, sinon
    // double-cliquer un titre modifie la selection en cours.
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
   * - les elements non dates ne dessinent pas de traits entre les textes ;
   * - une seance datee, seule ou fusionnee sur plusieurs lignes, est marquee
   *   par une entree/sortie visuelle, sans couper l'interieur du groupe.
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

  /*
   * SÉLECTION PLEINE LIGNE : l'état sélectionné s'applique à la rangée
   * entière (date + contenu + remarque), pas à une seule cellule -
   * teinte primaire subtile + rail primaire, lisible et professionnel.
   */
  const datedWash = hasWarning
    ? 'bg-alert/[0.07]'
    : hasAssignedDate
      ? 'bg-transparent'
      : 'bg-transparent';
  /*
   * États d’ACTION portés par un seul attribut, pour que les deux se
   * cumulent sans se confondre (`~=` cherche un mot) : « selected » pose
   * l’aplat d’accent, « editing » le même aplat un cran plus dense et
   * son filet de 1 px. Les visuels vivent dans `editorRowStates.css`,
   * registre PLAT (Keep / Vercel) : aucun rail, aucune ombre.
   */
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
    : hasAssignedDate
      ? hasWarning
        ? 'border-e border-e-alert/40'
        : 'border-e border-e-border'
      : 'border-e border-e-border';
  const contentDividerClass = layout === 'content-only'
    ? ''
    : isSelected
      ? 'border-e border-e-border'
      : hasAssignedDate
        ? hasWarning
          ? 'border-e border-e-alert/40'
          : 'border-e border-e-border'
        : 'border-e border-e-border';

  const rowGridClass = TABLE_GRID_CLASS;

  const isCorrection = elementType.startsWith('correction_');
  const isTopLevelBlock = (elementType in TOP_LEVEL_TYPE_CONFIG && elementType !== 'chapter') || isCorrection;

  if (isTopLevelBlock) {

    const contentCell = (
      <div
        className={`relative flex min-w-0 flex-1 items-center justify-start py-1.5 pe-1.5 ps-7 sm:pe-2 sm:ps-8 cursor-pointer ${sortable ? 'editor-row-content--sortable' : ''} ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-alert/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-colors ${contentBottomBorder}`}
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
        {sortable && <button type="button" data-reorder-handle onClick={event => event.stopPropagation()} className="editor-reorder-handle" aria-label={t('editor.reorderHandle')} title={t('editor.reorderHandle')}><GripVertical size={14} strokeWidth={2.25} aria-hidden="true" /></button>}
        <div className="min-w-0 w-full">
          <div className="flex w-full items-center justify-start py-1">
            <ContentRenderer data={data} indices={indices} elementType={elementType} highlight={searchQuery} showDescriptions={showDescriptions} descriptionTypes={descriptionTypes} contentNumber={getContentNumber?.(indices)} getDocumentPreview={getDocumentPreview} onOpenDocumentPreview={onOpenDocumentPreview} />
          </div>
        </div>
      </div>
    );

    if (layout === 'content-only') {
      return (
        <div
          className={[
            'relative transition-colors duration-100',
            frameClasses,
          ].filter(Boolean).join(' ')}
          data-row-state={rowState}
        data-row-metadata={Boolean(hasAssignedDate || data.remark || sessionAnnotation || sessionDocuments?.length) || undefined}
          onDoubleClickCapture={handleContentDoubleClickCapture}
          onDoubleClick={event => event.stopPropagation()}
        >
          {contentCell}
        </div>
      );
    }

    return (
      <div
        className={[
          `grid ${rowGridClass} transition-colors duration-100`,
          frameClasses,
        ].filter(Boolean).join(' ')}
        data-row-state={rowState}
        data-row-metadata={Boolean(hasAssignedDate || data.remark || sessionAnnotation || sessionDocuments?.length) || undefined}
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
        <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} onOpenRemark={onOpenRemark ? () => onOpenRemark(indices) : undefined} sessionAnnotation={sessionAnnotation} sessionDocuments={sessionDocuments} onOpenDocumentPreview={onOpenDocumentPreview} />
      </div>
    );
  }

  const contentCell = (
    <div
      className={`relative min-w-0 flex-1 cursor-pointer py-1.5 pe-1.5 ps-7 sm:pe-2 sm:ps-8 ${sortable ? 'editor-row-content--sortable' : ''} ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-alert/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-colors duration-150 ${contentBottomBorder}`}
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
      {sortable && <button type="button" data-reorder-handle onClick={event => event.stopPropagation()} className="editor-reorder-handle" aria-label={t('editor.reorderHandle')} title={t('editor.reorderHandle')}><GripVertical size={14} strokeWidth={2.25} aria-hidden="true" /></button>}
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
    </div>
  );

  if (layout === 'content-only') {
    return (
      <div
        className={[
          'relative touch-manipulation transition-colors duration-100',
          frameClasses,
        ].filter(Boolean).join(' ')}
        data-row-state={rowState}
        data-row-metadata={Boolean(hasAssignedDate || data.remark || sessionAnnotation || sessionDocuments?.length) || undefined}
        onDoubleClickCapture={handleContentDoubleClickCapture}
        onDoubleClick={event => event.stopPropagation()}
      >
        {contentCell}
      </div>
    );
  }

  const rowClasses = [
    `grid ${rowGridClass} touch-manipulation transition-colors duration-100`,
    frameClasses,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClasses}
      data-row-state={rowState}
        data-row-metadata={Boolean(hasAssignedDate || data.remark || sessionAnnotation || sessionDocuments?.length) || undefined}
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

      <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} onOpenRemark={onOpenRemark ? () => onOpenRemark(indices) : undefined} sessionAnnotation={sessionAnnotation} sessionDocuments={sessionDocuments} onOpenDocumentPreview={onOpenDocumentPreview} />
    </div>
  );
};

export const TableRow = memo(TableRowComponent, (prev, next) => {
  if (prev.sortable !== next.sortable) return false;
  // La fonction d'aperçu fait partie du contrat : l'oublier ici figerait les
  // pastilles « Document » sur l'état du premier rendu.
  if (prev.onToggleSelect !== next.onToggleSelect || prev.onDoubleClickEdit !== next.onDoubleClickEdit || prev.onOpenDateModal !== next.onOpenDateModal || prev.onOpenRemark !== next.onOpenRemark || prev.getDateWarnings !== next.getDateWarnings || prev.getDateOrder !== next.getDateOrder || prev.getContentNumber !== next.getContentNumber || prev.getDocumentPreview !== next.getDocumentPreview || prev.onOpenDocumentPreview !== next.onOpenDocumentPreview) return false;
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

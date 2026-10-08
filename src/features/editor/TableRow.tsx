import type { DateMergeMeta } from '@/domain/notebook/tableRows';
import { dateOrderWarnings, type ContentDateOrder } from '@/domain/calendar/dateOrder';
import React, { useCallback, FC, memo } from 'react';
import { Indices, ElementType } from '@/types';
import { ContentRenderer } from './ContentRenderer';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { parseDateInput } from '@/domain/notebook/dataUtils';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import './editorRowStates.css';

interface TableRowProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  dateMerge?: DateMergeMeta;
  layout?: 'full' | 'content-only';
  lineClassOverride?: string;
  onToggleSelect: (indices: Indices) => void;
  onDoubleClickEdit?: (indices: Indices) => void;
  onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
  /** saisie de la remarque : la cible (ligne ou séance fusionnée) vient du moteur */
  onOpenRemark?: (indices: Indices) => void;
  isSelected: boolean;
  isNew?: boolean;
  /** contenu ouvert dans l’éditeur : la ligne doit rester identifiable
   *  même au milieu d’une séance fusionnée (plusieurs contenus, même date) */
  isEditing?: boolean;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  /** terme de recherche actif, surligné dans les titres/remarques */
  searchQuery?: string;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** ordre chronologique : voisins datés du contenu (alerte de recul de date) */
  getDateOrder?: (indices: Indices) => ContentDateOrder | undefined;
  /** numéro de série du contenu, calculé par chapitre */
  getContentNumber?: (indices: Indices) => string | undefined;
  /**
   * Sujet écrit par le professeur, lu PAR LIGNE du cahier : la pastille
   * « Document » n'apparaît que si un sujet existe pour cette ligne
   * (voir `notebookDocumentPreviews`).
   */
  getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
  sessionAnnotation?: string;
}




const parseDate = (dateStr: string | undefined, locale: AppLocale) => {
  try {
    // Un seul parseur pour tout le cahier (ISO, jj/mm/aaaa, horodatage).
    const dateObj = parseDateInput(dateStr);
    if (!dateObj) return null;

    if (isNaN(dateObj.getTime())) return null;

    const numberFormatter = numberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
    return {
      day: numberFormatter.format(dateObj.getDate()),
      numericMonth: numberFormatter.format(dateObj.getMonth() + 1),
    };
  } catch {
    return null;
  }
};

/** Les dates simples et fusionnées partagent exactement la même typographie. */
export const DateCard: FC<{ dateStr?: string; hasWarning?: boolean }> = memo(({ dateStr, hasWarning }) => (
  <MultiDateCard dates={dateStr ? [dateStr] : []} hasWarning={hasWarning} />
));

DateCard.displayName = 'DateCard';

export const MultiDateCard: FC<{ dates: string[]; hasWarning?: boolean }> = memo(({ dates, hasWarning }) => {
  const { locale } = useLocale();
  const parsedDates = [...new Set(dates)].flatMap(date => {
    const parsed = parseDate(date, locale);
    return parsed ? [{ ...parsed, source: date }] : [];
  });
  if (parsedDates.length === 0) return null;
  const conjunction = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`flex min-w-0 max-w-full flex-wrap items-baseline justify-center gap-x-1 gap-y-0.5 py-1 text-center text-[0.9rem] font-semibold leading-snug tabular-nums sm:text-[1.0125rem] ${hasWarning ? 'text-alert-strong' : 'text-primary'}`}>
      {parsedDates.map((date, index) => (
        <span key={date.source} data-date-token className="inline-flex shrink-0 items-baseline gap-0.5 whitespace-nowrap">
          {index > 0 ? <span className="font-normal text-foreground">{conjunction}</span> : null}
          <bdi dir="ltr" className="whitespace-nowrap">{date.day}/{date.numericMonth}</bdi>
        </span>
      ))}
    </div>
  );
});

MultiDateCard.displayName = 'MultiDateCard';

const DateCell: FC<{ dateStr?: string; merge?: DateMergeMeta; hasWarning?: boolean; isSelected?: boolean; hasAssignedDate?: boolean }> = memo(({ dateStr, merge, hasWarning, isSelected, hasAssignedDate }) => {
  const isMerged = !!merge?.isMerged;
  const bgClass = isSelected
    ? 'bg-muted dark:bg-muted/80'
    : hasWarning
      ? 'bg-alert/[0.12]'
    : hasAssignedDate
      ? 'bg-muted/40'
      : 'bg-card';

  if (isMerged) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className={`flex h-full min-h-[48px] w-full flex-col items-center justify-center px-1 py-1 transition-colors duration-200 ${bgClass}`}>
        {isMiddle && <DateCard dateStr={dateStr} hasWarning={hasWarning} />}
      </div>
    );
  }

  // Not merged
  return (
    <div className={`flex h-full min-h-[48px] w-full flex-col items-center justify-center px-1 py-1 transition-colors duration-200 ${bgClass}`}>
      <DateCard dateStr={dateStr} hasWarning={hasWarning} />
    </div>
  );
});

DateCell.displayName = 'DateCell';

const TABLE_GRID_CLASS = 'editor-table-grid';

const RemarkCell: FC<{
  value?: string;
  merge?: DateMergeMeta;
  lineClass: string;
  hasAssignedDate?: boolean;
  isSelected?: boolean;
  hasWarning?: boolean;
  onOpenRemark?: () => void;
  sessionAnnotation?: string;
}> = memo(({ value, merge, lineClass, hasAssignedDate, isSelected, hasWarning, onOpenRemark, sessionAnnotation }) => {
  const { t } = useLocale();
  const shouldMerge = !!merge?.isMerged && !!merge.shouldMergeRemark;

  const bgClass = isSelected
    ? 'bg-muted dark:bg-muted/80'
    : hasWarning
      ? 'bg-alert/[0.055]'
    : hasAssignedDate
      ? 'bg-card/55'
      : 'bg-card';

  const borderClass = '';

  // La remarque d'une séance fusionnée s'écrit PARTOUT : une seule cible, donc
  // une seule saisie et une seule annulation pour tout le groupe.
  const editable = typeof onOpenRemark === 'function';
  const cellTitle = editable ? t('remark.editTitle') : undefined;
  const body = (isMergedCell: boolean) => (
    <button
      type="button"
      onClick={onOpenRemark}
      disabled={!editable}
      title={cellTitle}
      aria-label={cellTitle}
      data-remark-cell="true"
      className={`flex min-h-[44px] w-full flex-col justify-center items-center text-start ${editable ? 'cursor-pointer rounded-lg transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40' : ''}`}
    >
      {(!isMergedCell || merge!.indexInGroup === Math.floor(merge!.count / 2)) && (
        <div dir={textDirectionAttribute(merge?.sharedRemark ?? value)} className="editor-type-remark h-full w-full whitespace-pre-wrap break-words p-0.5 text-center font-semibold leading-snug text-foreground/80">{merge?.sharedRemark ?? value}</div>
      )}
      {sessionAnnotation && <span data-session-annotation="true" dir={textDirectionAttribute(sessionAnnotation)} title={sessionAnnotation} className="mt-0.5 w-full whitespace-pre-line break-words text-start rounded-md bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-primary">{sessionAnnotation}</span>}
    </button>
  );

  if (shouldMerge) {
    return (
      <div className={`relative flex min-w-0 p-1 md:p-1.5 ${borderClass} ${lineClass} ${bgClass}`} onClick={event => event.stopPropagation()}>
        <div className="relative z-10 h-full flex flex-col justify-center w-full">
          {body(true)}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 p-1 md:p-1.5 ${borderClass} ${lineClass} ${bgClass}`} onClick={event => event.stopPropagation()}>
      {body(false)}
    </div>
  );
});
RemarkCell.displayName = 'RemarkCell';

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
}) => {
  const handleToggle = useCallback(() => onToggleSelect(indices), [indices, onToggleSelect]);
  const { locale, t } = useLocale();

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
  // §G tableau serré : AUCUN padding de cadre, les filets verticaux
  // Date|Contenu|Remarque courent jusqu'aux bords ; le padding de lisibilité
  // reste porté par les cellules internes.
  const frameClasses = `editor-row group relative ${rowWash} ${hoverWash} transition-colors duration-150`;

  // Séparateurs verticaux Date|Contenu|Remarque, filets nets et discrets style Keep
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

  /* Rail latéral supprimé selon la demande. */
  const stateRail = null;
  const rowGridClass = TABLE_GRID_CLASS;
  const dateCellVisibility = 'flex';

  const isCorrection = elementType.startsWith('correction_');
  const isTopLevelBlock = (elementType in TOP_LEVEL_TYPE_CONFIG && elementType !== 'chapter') || isCorrection;

  if (isTopLevelBlock) {


    const contentCell = (
      <div
        className={`flex min-w-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 cursor-pointer ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-alert/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-colors ${contentBottomBorder}`}
        data-row-content="true"
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
        <div className="min-w-0 w-full">
          <div className="flex w-full items-center justify-center py-1">
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
        onDoubleClickCapture={handleContentDoubleClickCapture}
        onDoubleClick={event => event.stopPropagation()}
      >
        {stateRail}
        <button
          type="button"
          className={`min-w-0 ${dateCellVisibility} flex-col items-stretch justify-center self-stretch select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${dividerClass} ${dateBottomBorder} cursor-pointer hover:bg-primary/5 active:bg-primary/10 transition-colors`}
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
        <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} onOpenRemark={onOpenRemark ? () => onOpenRemark(indices) : undefined} sessionAnnotation={sessionAnnotation} />
      </div>
    );
  }

  const contentCell = (
    <div
      className={`relative min-w-0 flex-1 cursor-pointer px-2 py-1.5 sm:px-3 ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-alert/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-all duration-150 ${contentBottomBorder}`}
      data-row-content="true"
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
      onDoubleClickCapture={handleContentDoubleClickCapture}
      onDoubleClick={event => event.stopPropagation()}
    >
      {stateRail}
      <button
        type="button"
        className={`min-w-0 ${dateCellVisibility} flex-col items-stretch justify-center self-stretch select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${dividerClass} ${dateBottomBorder} cursor-pointer hover:bg-primary/5 active:bg-primary/10 transition-colors`}
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

      <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} onOpenRemark={onOpenRemark ? () => onOpenRemark(indices) : undefined} sessionAnnotation={sessionAnnotation} />
    </div>
  );
};

export const TableRow = memo(TableRowComponent, (prev, next) => {
  // La fonction d'aperçu fait partie du contrat : l'oublier ici figerait les
  // pastilles « Document » sur l'état du premier rendu.
  if (prev.onToggleSelect !== next.onToggleSelect || prev.onDoubleClickEdit !== next.onDoubleClickEdit || prev.onOpenDateModal !== next.onOpenDateModal || prev.onOpenRemark !== next.onOpenRemark || prev.getDateWarnings !== next.getDateWarnings || prev.getDateOrder !== next.getDateOrder || prev.getContentNumber !== next.getContentNumber || prev.getDocumentPreview !== next.getDocumentPreview || prev.onOpenDocumentPreview !== next.onOpenDocumentPreview) return false;
  if (prev.data !== next.data) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isNew !== next.isNew) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.sessionAnnotation !== next.sessionAnnotation) return false;
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

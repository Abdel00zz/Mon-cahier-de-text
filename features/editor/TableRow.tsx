import type { DateMergeMeta } from '@/utils/tableRows';
import React, { useCallback, FC, memo } from 'react';
import { Indices, ElementType } from '@/types';
import { ContentRenderer } from './ContentRenderer';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';

interface TableRowProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  dateMerge?: DateMergeMeta;
  layout?: 'full' | 'content-only';
  lineClassOverride?: string;
  onToggleSelect: (indices: Indices) => void;
  onDoubleClickEdit?: (indices: Indices) => void;
  isSelected: boolean;
  isNew?: boolean;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  /** terme de recherche actif, surligné dans les titres/remarques */
  searchQuery?: string;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
}



const DATE_LOCALES: Record<AppLocale, string> = { fr: 'fr-MA', en: 'en-GB', ar: 'ar-MA' };

const parseDate = (dateStr: string | undefined, locale: AppLocale) => {
  if (!dateStr) return null;
  try {
    let dateObj: Date;
    let y: number, m: number, d: number;
    
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        y = Number(parts[0]);
        m = Number(parts[1]);
        d = Number(parts[2]);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = new Date(dateStr);
      }
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        d = Number(parts[0]);
        m = Number(parts[1]);
        y = Number(parts[2]);
        dateObj = new Date(y, m - 1, d);
      } else {
        dateObj = new Date(dateStr);
      }
    } else {
      dateObj = new Date(dateStr);
    }
    
    if (isNaN(dateObj.getTime())) return null;

    const dateLocale = DATE_LOCALES[locale];
    const numberFormatter = new Intl.NumberFormat(dateLocale, { minimumIntegerDigits: 2, useGrouping: false });
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
    <div className={`min-w-0 max-w-full py-1 text-center text-base font-semibold leading-snug tabular-nums sm:text-lg ${hasWarning ? 'text-destructive' : 'text-primary'}`}>
      {parsedDates.map((date, index) => (
        <React.Fragment key={date.source}>
          {index > 0 ? <>{' '}<span className="font-normal text-foreground">{conjunction}</span>{' '}</> : null}
          <bdi dir="ltr" className="whitespace-nowrap">{date.day}/{date.numericMonth}</bdi>
        </React.Fragment>
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
      ? 'bg-warning/[0.12]'
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

const TABLE_GRID_CLASS = 'grid-cols-[18%_1fr_20%] md:grid-cols-[var(--cdt-table-cols)]';

const RemarkCell: FC<{
  value?: string;
  merge?: DateMergeMeta;
  lineClass: string;
  hasAssignedDate?: boolean;
  isSelected?: boolean;
  hasWarning?: boolean;
}> = memo(({ value, merge, lineClass, hasAssignedDate, isSelected, hasWarning }) => {
  const shouldMerge = !!merge?.isMerged && !!merge.shouldMergeRemark;
  
  const bgClass = isSelected 
    ? 'bg-muted dark:bg-muted/80'
    : hasWarning
      ? 'bg-warning/[0.055]'
    : hasAssignedDate
      ? 'bg-card/55'
      : 'bg-card';

  const borderClass = '';

  if (shouldMerge) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className={`relative flex min-w-0 p-1 md:p-1.5 ${borderClass} ${lineClass} ${bgClass}`} onClick={event => event.stopPropagation()}>
        {isMiddle && (
          <div className="relative z-10 h-full flex flex-col justify-center w-full">
            <div className="editor-type-remark h-full w-full whitespace-pre-wrap break-words p-0.5 font-semibold text-muted-foreground">{value}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 p-1 md:p-1.5 ${borderClass} ${lineClass} ${bgClass}`} onClick={event => event.stopPropagation()}>
      <div className="editor-type-remark h-full w-full whitespace-pre-wrap break-words p-0.5 font-semibold text-muted-foreground">{value}</div>
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
  isSelected,
  showDescriptions,
  descriptionTypes = [],
  searchQuery,
  getDateWarnings,
}) => {
  const handleToggle = useCallback(() => onToggleSelect(indices), [indices, onToggleSelect]);

  const handleContentDoubleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (elementType !== 'item' || !onDoubleClickEdit) return;

    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-row-content="true"]')) return;
    if (target.closest('button,input,textarea,select,a,[contenteditable="true"]')) return;

    event.preventDefault();
    event.stopPropagation();
    onDoubleClickEdit(indices);
  }, [indices, elementType, onDoubleClickEdit]);

  const hasAssignedDate = typeof data.date === 'string' && data.date.trim().length > 0;
  const warnings = (hasAssignedDate && getDateWarnings) ? getDateWarnings(data.date) : [];
  const hasWarning = warnings.length > 0;

  /*
   * Ligne horizontale intelligente :
   * - les elements non dates ne dessinent pas de traits entre les textes ;
   * - une seance datee, seule ou fusionnee sur plusieurs lignes, est marquee
   *   par une entree/sortie visuelle, sans couper l'interieur du groupe.
   */
  const isMergedDateGroup = !!dateMerge?.isMerged;
  const isDatedGroupStart = hasAssignedDate && (!isMergedDateGroup || dateMerge?.isStart);
  const isDatedGroupEnd = hasAssignedDate && (!isMergedDateGroup || dateMerge?.isEnd);
  
  const isDatedSequenceStart = !!dateMerge?.isDatedSequenceStart;
  const isDatedSequenceEnd = !!dateMerge?.isDatedSequenceEnd;

  const topBorderClass = isDatedSequenceStart 
    ? (hasWarning ? 'border-t-[2px] border-warning/[0.7]' : 'border-t-[2px] border-foreground/30') 
    : isDatedGroupStart 
      ? (hasWarning ? 'border-t border-warning/[0.5]' : 'border-t border-border/70') 
      : '';
      
  const bottomBorderClass = isDatedSequenceEnd 
    ? (hasWarning ? 'border-b-[2px] border-warning/[0.7]' : 'border-b-[2px] border-foreground/30') 
    : isDatedGroupEnd 
      ? (hasWarning ? 'border-b border-warning/[0.65]' : 'border-b border-border/70') 
      : '';

  const datedLineClass = [topBorderClass, bottomBorderClass].filter(Boolean).join(' ');
  const undatedLineClass = isSelected ? 'border-b border-primary/15' : '';
  const rowLineClass = hasAssignedDate ? datedLineClass : undatedLineClass;

  const dateBottomBorder = rowLineClass;
  const contentBottomBorder = lineClassOverride ?? rowLineClass;

  /*
   * SÉLECTION PLEINE LIGNE : l'état sélectionné s'applique à la rangée
   * entière (date + contenu + remarque), pas à une seule cellule -
   * teinte primaire subtile + rail primaire, lisible et professionnel.
   */
  const datedWash = hasWarning
    ? 'bg-warning/[0.07]'
    : hasAssignedDate
      ? 'bg-card/70'
      : 'bg-transparent';
  const rowWash = isSelected ? 'bg-muted dark:bg-muted/80' : datedWash;
  const hoverWash = isSelected
    ? ''
    : hasWarning
      ? 'hover:bg-warning/[0.11]'
      : hasAssignedDate
        ? 'hover:bg-muted/40'
        : 'hover:bg-muted/50';
  // §G tableau serré : AUCUN padding de cadre, les filets verticaux
  // Date|Contenu|Remarque courent jusqu'aux bords ; le padding de lisibilité
  // reste porté par les cellules internes.
  const frameClasses = `group relative ${rowWash} ${hoverWash} transition-colors duration-150`;
  
  // Séparateurs verticaux Date|Contenu|Remarque, filets nets et discrets style Keep
  const dividerClass = isSelected
    ? 'border-e border-border'
    : hasAssignedDate
      ? hasWarning
        ? 'border-e border-warning/40'
        : 'border-e border-border'
      : 'border-e border-border';
  const contentDividerClass = layout === 'content-only'
    ? ''
    : isSelected
      ? 'border-e border-border'
      : hasAssignedDate
        ? hasWarning
          ? 'border-e border-warning/40'
          : 'border-e border-border'
        : 'border-e border-border';

  /* Rail latéral supprimé selon la demande. */
  const stateRail = null;
  const rowGridClass = TABLE_GRID_CLASS;
  const dateCellVisibility = 'flex';

  const isCorrection = elementType.startsWith('correction_');
  const isTopLevelBlock = (elementType in TOP_LEVEL_TYPE_CONFIG && elementType !== 'chapter') || isCorrection;

  if (isTopLevelBlock) {


    const contentCell = (
      <div
        className={`flex min-w-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 cursor-pointer ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-warning/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-colors ${contentBottomBorder}`}
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
            <ContentRenderer data={data} indices={indices} elementType={elementType} highlight={searchQuery} showDescriptions={showDescriptions} descriptionTypes={descriptionTypes} />
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
        onDoubleClickCapture={handleContentDoubleClickCapture}
        onDoubleClick={event => event.stopPropagation()}
      >
        {stateRail}
        <div className={`min-w-0 ${dateCellVisibility} flex-col items-stretch justify-center self-stretch select-none ${dividerClass} ${dateBottomBorder}`}>
          <DateCell dateStr={data.date} merge={dateMerge} hasWarning={hasWarning} isSelected={isSelected} hasAssignedDate={hasAssignedDate} />
        </div>
        {contentCell}
        <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} />
      </div>
    );
  }

  const contentCell = (
    <div
      className={`relative min-w-0 flex-1 cursor-pointer px-2 py-1.5 sm:px-3 ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-warning/[0.08]' : hasAssignedDate ? 'hover:bg-muted/40' : 'hover:bg-muted/50'} transition-all duration-150 ${contentBottomBorder}`}
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
      onDoubleClickCapture={handleContentDoubleClickCapture}
      onDoubleClick={event => event.stopPropagation()}
    >
      {stateRail}
      <div className={`min-w-0 ${dateCellVisibility} flex-col items-stretch justify-center self-stretch select-none ${dividerClass} ${dateBottomBorder}`}>
        <DateCell dateStr={data.date} merge={dateMerge} hasWarning={hasWarning} isSelected={isSelected} hasAssignedDate={hasAssignedDate} />
      </div>

      {contentCell}

      <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} />
    </div>
  );
};

export const TableRow = memo(TableRowComponent, (prev, next) => {
  if (prev.onToggleSelect !== next.onToggleSelect || prev.onDoubleClickEdit !== next.onDoubleClickEdit || prev.getDateWarnings !== next.getDateWarnings) return false;
  if (prev.data !== next.data) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isNew !== next.isNew) return false;
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
    pIdx.itemIndex !== nIdx.itemIndex ||
    pIdx.isSeparator !== nIdx.isSeparator
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

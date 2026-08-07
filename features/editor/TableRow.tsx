import React, { useCallback, FC, memo } from 'react';
import { Indices, ElementType, TopLevelItem } from '@/types';
import { ContentRenderer } from './ContentRenderer';
import { EditableCell } from '@/components/ui/EditableCell';
import { EditableTitle } from '@/components/ui/EditableTitle';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';

interface TableRowProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  dateMerge?: DateMergeMeta;
  layout?: 'full' | 'content-only';
  lineClassOverride?: string;
  onCellUpdate: (indices: Indices, field: string, value: any) => void;
  onToggleSelect: (indices: Indices) => void;
  onDoubleClickEdit?: (indices: Indices) => void;
  isSelected: boolean;
  isNew?: boolean;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  /** terme de recherche actif — surligné dans les titres/remarques */
  searchQuery?: string;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
}

export interface DateMergeMeta {
  isMerged: boolean;
  isStart: boolean;
  isContinuation: boolean;
  isEnd: boolean;
  count: number;
  indexInGroup: number;
  shouldMergeRemark?: boolean;
}

const parseDate = (dateStr?: string) => {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const local = new Date(dateObj);
    local.setHours(0, 0, 0, 0);
    
    return {
      isToday: local.getTime() === today.getTime(),
      day: local.getDate().toString().padStart(2, '0'),
      month: local.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      year: local.getFullYear().toString(),
    };
  } catch {
    return null;
  }
};

/*
 * Date « super affichée » : typographie pure, sans badge ni encadré.
 * Grand jour, mois en petites capitales, année discrète. Le jour courant
 * est signalé par la couleur primaire et un point, rien d'autre.
 */
export const DateCard: FC<{ dateStr?: string; hasWarning?: boolean }> = memo(({ dateStr, hasWarning }) => {
  const parsed = parseDate(dateStr);

  if (!parsed) {
    return (
      <div className="flex min-h-[18px] w-full items-center justify-center py-1.5 select-none" aria-hidden />
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none leading-none animate-fade-in">
      <span
        className={`font-mono text-xl font-extrabold tracking-[-0.08em] tabular-nums transition-colors ${
          hasWarning ? 'text-destructive' : parsed.isToday ? 'text-primary' : 'text-foreground'
        }`}
      >
        {parsed.day}
      </span>
      <span className={`mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${hasWarning ? 'text-destructive' : 'text-muted-foreground/65'}`}>
        {parsed.month} {parsed.year.slice(2)}
      </span>
      {!hasWarning && parsed.isToday && <span className="mt-1 h-1 w-1 rounded-full bg-primary" aria-hidden />}
    </div>
  );
});

DateCard.displayName = 'DateCard';

const DateCell: FC<{ dateStr?: string; merge?: DateMergeMeta; hasWarning?: boolean; isSelected?: boolean; hasAssignedDate?: boolean }> = memo(({ dateStr, merge, hasWarning, isSelected, hasAssignedDate }) => {
  const isMerged = !!merge?.isMerged;
  const bgClass = isSelected 
    ? 'bg-primary/[0.12]'
    : hasWarning
      ? 'bg-warning/[0.12]'
    : hasAssignedDate
      ? 'bg-zinc-50/80'
      : 'bg-card';

  if (isMerged) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className={`flex h-full min-h-[44px] w-full flex-col items-center justify-center py-1.5 px-2 transition-colors duration-150 ${bgClass}`}>
        {isMiddle && <DateCard dateStr={dateStr} hasWarning={hasWarning} />}
      </div>
    );
  }

  // Not merged
  return (
    <div className={`flex h-full min-h-[44px] w-full flex-col items-center justify-center py-1.5 px-2 transition-colors duration-150 ${bgClass}`}>
      <DateCard dateStr={dateStr} hasWarning={hasWarning} />
    </div>
  );
});

DateCell.displayName = 'DateCell';

const TABLE_GRID_CLASS = 'grid-cols-[19%_1fr] md:grid-cols-[var(--cdt-table-cols)]';

const RemarkCell: FC<{
  value?: string;
  merge?: DateMergeMeta;
  lineClass: string;
  onSave: (value: string) => void;
  hasAssignedDate?: boolean;
  isSelected?: boolean;
  hasWarning?: boolean;
}> = memo(({ value, merge, lineClass, onSave, hasAssignedDate, isSelected, hasWarning }) => {
  const shouldMerge = !!merge?.isMerged && !!merge.shouldMergeRemark;
  
  const bgClass = isSelected 
    ? 'bg-primary/[0.065]'
    : hasWarning
      ? 'bg-warning/[0.055]'
    : hasAssignedDate
      ? 'bg-white/55'
      : 'bg-card';

  const borderClass = '';

  if (shouldMerge) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className={`relative hidden min-w-0 p-1.5 md:block ${borderClass} ${lineClass} ${bgClass}`} onClick={event => event.stopPropagation()}>
        {isMiddle && (
          <div className="relative z-10 h-full flex flex-col justify-center">
            <EditableCell
              value={value || ''}
              onSave={onSave}
              className="w-full h-full p-1 text-[11px] text-muted-foreground font-semibold font-sans"
              multiline
              placeholder=""
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`hidden min-w-0 p-1.5 md:block ${borderClass} ${lineClass} ${bgClass}`} onClick={event => event.stopPropagation()}>
      <div className="h-full">
        <EditableCell
          value={value || ''}
          onSave={onSave}
          className="h-full p-1 text-[11px] text-muted-foreground font-semibold font-sans"
          multiline
          placeholder=""
        />
      </div>
    </div>
  );
});
RemarkCell.displayName = 'RemarkCell';

/*
 * Remarque visible sur MOBILE (< md) : la colonne Remarque est masquée sur
 * petit écran ; sans ceci, la donnée était invisible et non modifiable sur
 * téléphone. Affichée en italique sous le contenu, éditable au tap.
 */
const MobileRemark: FC<{ value?: string; onSave: (value: string) => void }> = memo(({ value, onSave }) => {
  if (!value?.trim()) return null;
  return (
    <div className="mt-1 flex items-start gap-1.5 md:hidden" onClick={event => event.stopPropagation()}>
      <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-border" />
      <EditableCell
        value={value}
        onSave={onSave}
        className="min-h-6 flex-1 p-0.5 text-[11px] italic text-muted-foreground font-sans"
        multiline
        placeholder=""
      />
    </div>
  );
});
MobileRemark.displayName = 'MobileRemark';

const TableRowComponent: FC<TableRowProps> = ({
  data,
  indices,
  elementType,
  dateMerge,
  layout = 'full',
  lineClassOverride,
  onCellUpdate,
  onToggleSelect,
  onDoubleClickEdit,
  isSelected,
  isNew = false,
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

  const datedLineClass = [
    isDatedGroupStart ? (hasWarning ? 'border-t border-warning/[0.5]' : 'border-t border-zinc-200') : '',
    isDatedGroupEnd ? (hasWarning ? 'border-b border-warning/[0.65]' : 'border-b border-zinc-200') : '',
  ].filter(Boolean).join(' ');
  const undatedLineClass = isSelected ? 'border-b border-primary/15' : '';
  const rowLineClass = hasAssignedDate ? datedLineClass : undatedLineClass;

  const dateBottomBorder = rowLineClass;
  const contentBottomBorder = lineClassOverride ?? rowLineClass;

  /*
   * SÉLECTION PLEINE LIGNE : l'état sélectionné s'applique à la rangée
   * entière (date + contenu + remarque), pas à une seule cellule —
   * teinte primaire subtile + rail primaire, lisible et professionnel.
   */
  const datedWash = hasWarning
    ? 'bg-warning/[0.07]'
    : hasAssignedDate
      ? 'bg-zinc-50/40'
      : 'bg-card';
  const rowWash = isSelected ? 'bg-primary/[0.085]' : datedWash;
  const hoverWash = isSelected
    ? ''
    : hasWarning
      ? 'hover:bg-warning/[0.11]'
      : hasAssignedDate
        ? 'hover:bg-primary/[0.07]'
        : 'hover:bg-muted/60';
  // §G tableau serré : AUCUN padding de cadre — les filets verticaux
  // Date|Contenu|Remarque courent jusqu'aux bords ; le padding de lisibilité
  // reste porté par les cellules internes.
  const frameClasses = `group relative ${rowWash} ${hoverWash} transition-colors duration-150`;
  
  // Séparateurs verticaux Date|Contenu|Remarque — filets AFFIRMÉS (2 px) mais
  // harmonieux : ton neutre doux au repos, chaud sur les rangées datées,
  // primaire sur la sélection. Une seule épaisseur partout = rythme régulier.
  const dividerClass = isSelected
    ? 'border-r border-primary/30'
    : hasAssignedDate
      ? hasWarning
        ? 'border-r border-warning/40'
        : 'border-r border-zinc-200/90'
      : 'border-r border-border/80';
  const contentDividerClass = layout === 'content-only'
    ? ''
    : isSelected
      ? 'md:border-r md:border-primary/30'
      : hasAssignedDate
        ? hasWarning
          ? 'md:border-r md:border-warning/40'
          : 'md:border-r md:border-zinc-200/90'
        : 'md:border-r md:border-border/80';

  /* Rail latéral supprimé selon la demande. */
  const stateRail = null;
  const rowGridClass = hasAssignedDate
    ? TABLE_GRID_CLASS
    : 'grid-cols-1 md:grid-cols-[var(--cdt-table-cols)]';
  const dateCellVisibility = hasAssignedDate ? 'flex' : 'hidden md:flex';

  const isCorrection = elementType.startsWith('correction_');
  const isTopLevelBlock = (elementType in TOP_LEVEL_TYPE_CONFIG && elementType !== 'chapter') || isCorrection;

  if (isTopLevelBlock) {
    const item = data as TopLevelItem;
    const cfg = TOP_LEVEL_TYPE_CONFIG[item.type];
    const contentCell = (
      <div
        className={`flex min-w-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 cursor-pointer ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-warning/[0.08]' : hasAssignedDate ? 'hover:bg-primary/[0.055]' : 'hover:bg-muted/60'} transition-colors ${contentBottomBorder}`}
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
        <div className="min-w-0">
          <div className={`flex min-w-0 items-center justify-center gap-2 text-center text-[13px] font-bold ${cfg?.color ?? 'text-foreground'}`}>
            {cfg?.icon && <cfg.icon className="h-3.5 w-3.5 shrink-0" />}
            <EditableTitle value={item.title} onSave={value => onCellUpdate(indices, 'title', value)} />
          </div>
          <MobileRemark value={data.remark} onSave={value => onCellUpdate(indices, 'remark', value)} />
        </div>
      </div>
    );

    if (layout === 'content-only') {
      return (
        <div
          className={[
            'relative transition-colors duration-100',
            frameClasses,
            isNew ? 'new-item-highlight' : '',
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
          isNew ? 'new-item-highlight' : '',
        ].filter(Boolean).join(' ')}
        onDoubleClickCapture={handleContentDoubleClickCapture}
        onDoubleClick={event => event.stopPropagation()}
      >
        {stateRail}
        <div className={`min-w-0 ${dateCellVisibility} flex-col items-stretch justify-center self-stretch select-none ${dividerClass} ${dateBottomBorder}`}>
          <DateCell dateStr={data.date} merge={dateMerge} hasWarning={hasWarning} isSelected={isSelected} hasAssignedDate={hasAssignedDate} />
        </div>
        {contentCell}
        <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} onSave={value => onCellUpdate(indices, 'remark', value)} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} />
      </div>
    );
  }

  const contentCell = (
    <div
      className={`min-w-0 flex-1 px-2 py-1.5 cursor-pointer sm:px-3 ${contentDividerClass} ${isSelected ? '' : hasWarning ? 'hover:bg-warning/[0.08]' : hasAssignedDate ? 'hover:bg-primary/[0.055]' : 'hover:bg-muted/60'} transition-all duration-150 ${contentBottomBorder}`}
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
        onCellUpdate={onCellUpdate}
        highlight={searchQuery}
      />
      <MobileRemark value={data.remark} onSave={value => onCellUpdate(indices, 'remark', value)} />
    </div>
  );

  if (layout === 'content-only') {
    return (
      <div
        className={[
          'relative touch-manipulation transition-colors duration-100',
          frameClasses,
          isNew ? 'new-item-highlight' : '',
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
    isNew ? 'new-item-highlight' : '',
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

      <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} onSave={value => onCellUpdate(indices, 'remark', value)} hasAssignedDate={hasAssignedDate} isSelected={isSelected} hasWarning={hasWarning} />
    </div>
  );
};

export const TableRow = memo(TableRowComponent, (prev, next) => {
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

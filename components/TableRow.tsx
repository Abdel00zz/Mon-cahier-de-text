import React, { useCallback, FC, memo } from 'react';
import { Indices, ElementType, TopLevelItem } from '../types';
import { ContentRenderer } from './ContentRenderer';
import { EditableCell } from './ui/EditableCell';
import { EditableTitle } from './ui/EditableTitle';
import { TOP_LEVEL_TYPE_CONFIG } from '../constants';

interface TableRowProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  dateMerge?: DateMergeMeta;
  onCellUpdate: (indices: Indices, field: string, value: any) => void;
  onToggleSelect: (indices: Indices) => void;
  onDoubleClickEdit?: (indices: Indices) => void;
  isSelected: boolean;
  isNew?: boolean;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  /** terme de recherche actif — surligné dans les titres/remarques */
  searchQuery?: string;
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
const DateCard: FC<{ dateStr?: string }> = memo(({ dateStr }) => {
  const parsed = parseDate(dateStr);

  if (!parsed) {
    return (
      <div className="flex items-center justify-center w-full py-1.5 select-none">
        <span className="text-slate-200 text-[10px] select-none tracking-widest">·</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center select-none leading-none animate-fade-in">
      <span
        className={`font-slab text-xl font-bold tracking-tight transition-colors ${
          parsed.isToday ? 'text-primary' : 'text-slate-700'
        }`}
      >
        {parsed.day}
      </span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {parsed.month} {parsed.year.slice(2)}
      </span>
      {parsed.isToday && <span className="mt-1 h-1 w-1 rounded-full bg-primary" aria-hidden />}
    </div>
  );
});

DateCard.displayName = 'DateCard';

const DateCell: FC<{ dateStr?: string; merge?: DateMergeMeta }> = memo(({ dateStr, merge }) => {
  const isMerged = !!merge?.isMerged;

  if (isMerged) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className="flex h-full min-h-[44px] w-full flex-col items-center justify-center bg-transparent py-1.5 px-2">
        {isMiddle && <DateCard dateStr={dateStr} />}
      </div>
    );
  }

  // Not merged
  return (
    <div className="flex h-full min-h-[44px] w-full flex-col items-center justify-center py-1.5 px-2">
      <DateCard dateStr={dateStr} />
    </div>
  );
});

DateCell.displayName = 'DateCell';

const RemarkCell: FC<{
  value?: string;
  merge?: DateMergeMeta;
  lineClass: string;
  onSave: (value: string) => void;
  hasAssignedDate?: boolean;
}> = memo(({ value, merge, lineClass, onSave, hasAssignedDate }) => {
  const shouldMerge = !!merge?.isMerged && !!merge.shouldMergeRemark;
  // Plus de séparation verticale : le rythme des colonnes vient de l'alignement.
  const borderClass = '';
  void hasAssignedDate;

  if (shouldMerge) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className={`hidden w-[16%] p-1.5 md:block relative ${borderClass} ${merge.isEnd ? lineClass : ''}`} onClick={event => event.stopPropagation()}>
        {isMiddle && (
          <div className="relative z-10 h-full flex flex-col justify-center">
            <EditableCell
              value={value || ''}
              onSave={onSave}
              className="w-full h-full p-1 text-[11px] text-slate-500 font-medium font-sans"
              multiline
              placeholder=""
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`hidden w-[16%] p-1.5 md:block ${borderClass} ${lineClass}`} onClick={event => event.stopPropagation()}>
      <div className="h-full">
        <EditableCell
          value={value || ''}
          onSave={onSave}
          className="h-full p-1 text-[11px] text-slate-500 font-medium font-sans"
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
      <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
      <EditableCell
        value={value}
        onSave={onSave}
        className="min-h-6 flex-1 p-0.5 text-[11px] italic text-slate-500"
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
  onCellUpdate,
  onToggleSelect,
  onDoubleClickEdit,
  isSelected,
  isNew = false,
  showDescriptions,
  descriptionTypes = [],
  searchQuery,
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

  /*
   * Rangées plates et continues (pas de « box » encadrée) :
   * — filets horizontaux entre rangées, mais PAS à l'intérieur d'un groupe
   *   de dates fusionnées (le groupe se lit comme un seul bloc) ;
   * — séparations VERTICALES visibles entre les 3 colonnes Date|Contenu|Remarque ;
   * — les rangées datées se distinguent par un lavis chaud + rail doré,
   *   et un filet plus marqué clôt chaque groupe daté.
   */
  const isInsideMergedGroup = !!dateMerge?.isMerged && !dateMerge.isEnd;
  const isGroupEnd = hasAssignedDate && (!dateMerge?.isMerged || dateMerge.isEnd);
  const rowDivider = isInsideMergedGroup
    ? ''
    : isGroupEnd
      ? 'border-b-2 border-[#B8935A]/25' // fin d'un bloc daté : démarcation nette
      : 'border-b border-slate-100';

  /*
   * SÉLECTION PLEINE LIGNE : l'état sélectionné s'applique à la rangée
   * entière (date + contenu + remarque), pas à une seule cellule —
   * teinte primaire subtile + rail primaire, lisible et professionnel.
   */
  const datedWash = hasAssignedDate ? 'bg-[#FBF6EE]' : 'bg-white';
  const rowWash = isSelected ? 'bg-primary/[0.06]' : datedWash;
  const hoverWash = isSelected ? '' : 'hover:bg-slate-50/60';
  const frameClasses = `group relative px-1.5 sm:px-4 ${rowWash} ${rowDivider} ${hoverWash} transition-colors duration-150`;
  const contentBottomBorder = '';
  // Séparateurs verticaux entre colonnes — visibles, ton chaud sur les rangées datées.
  const dividerClass = isSelected
    ? 'border-r border-primary/20'
    : hasAssignedDate
      ? 'border-r border-[#B8935A]/25'
      : 'border-r border-slate-200';

  /* Rail latéral : primaire quand sélectionné (prioritaire), doré si daté. */
  const goldRail = isSelected ? (
    <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
  ) : hasAssignedDate ? (
    <span
      aria-hidden
      className="absolute left-0 top-0 h-full w-[2.5px]"
      style={{ backgroundColor: '#B8935A', opacity: 0.55 }}
    />
  ) : null;

  const isCorrection = elementType.startsWith('correction_');
  const isTopLevelBlock = (elementType in TOP_LEVEL_TYPE_CONFIG && elementType !== 'chapter') || isCorrection;

  if (isTopLevelBlock) {
    const item = data as TopLevelItem;
    const cfg = TOP_LEVEL_TYPE_CONFIG[item.type];
    const bg = cfg?.badgeColor?.split(' ').find(c => c.startsWith('bg-')) ?? 'bg-slate-50';

    return (
      <div
        className={[
          'flex transition-colors duration-100',
          frameClasses,
          isNew ? 'new-item-highlight' : '',
        ].filter(Boolean).join(' ')}
        onDoubleClickCapture={handleContentDoubleClickCapture}
        onDoubleClick={event => event.stopPropagation()}
      >
        {goldRail}
        <div className={`w-[19%] sm:w-[13%] flex flex-col items-stretch justify-center self-stretch select-none ${dividerClass}`}>
          <DateCell dateStr={data.date} merge={dateMerge} />
        </div>
        <div
          className={`flex min-w-0 flex-1 items-center justify-center px-2 py-2.5 sm:px-4 cursor-pointer ${isSelected ? 'md:border-r md:border-primary/20' : hasAssignedDate ? 'md:border-r md:border-[#B8935A]/25' : 'md:border-r md:border-slate-200'} ${isSelected ? '' : bg} hover:brightness-98 transition-colors ${contentBottomBorder}`}
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
            <div className={`flex min-w-0 items-center justify-center gap-2 text-center text-[13px] font-bold tracking-tight ${cfg?.color ?? 'text-slate-800'}`}>
              {cfg?.icon && <cfg.icon className="h-3.5 w-3.5 shrink-0" />}
              <EditableTitle value={item.title} onSave={value => onCellUpdate(indices, 'title', value)} />
            </div>
            <MobileRemark value={data.remark} onSave={value => onCellUpdate(indices, 'remark', value)} />
          </div>
        </div>
        <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} onSave={value => onCellUpdate(indices, 'remark', value)} hasAssignedDate={hasAssignedDate} />
      </div>
    );
  }

  const rowClasses = [
    'flex touch-manipulation transition-colors duration-100',
    frameClasses,
    isNew ? 'new-item-highlight' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClasses}
      onDoubleClickCapture={handleContentDoubleClickCapture}
      onDoubleClick={event => event.stopPropagation()}
    >
      {goldRail}
      <div className={`w-[19%] sm:w-[13%] flex flex-col items-stretch justify-center self-stretch select-none ${dividerClass}`}>
        <DateCell dateStr={data.date} merge={dateMerge} />
      </div>

      <div
        className={`min-w-0 flex-1 px-2 py-2 cursor-pointer sm:px-4 ${isSelected ? 'md:border-r md:border-primary/20' : hasAssignedDate ? 'md:border-r md:border-[#B8935A]/25' : 'md:border-r md:border-slate-200'} ${isSelected ? '' : 'hover:bg-slate-50/50'} transition-all duration-150 ${contentBottomBorder}`}
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

      <RemarkCell value={data.remark || ''} merge={dateMerge} lineClass={contentBottomBorder} onSave={value => onCellUpdate(indices, 'remark', value)} hasAssignedDate={hasAssignedDate} />
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
export default TableRow;

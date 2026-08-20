import React from 'react';
import { MathText } from '@/components/ui/math-text';
import { Indices, LessonItem, TopLevelItem, ElementType, TopLevelType } from '@/types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, TOP_LEVEL_TYPE_CONFIG, BADGE_TOOLTIP_MAP } from '@/constants';
import { EditableTitle } from '@/components/ui/EditableTitle';
import { EditableCell } from '@/components/ui/EditableCell';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/utils/logger';
import { renderDescriptionWithBold } from '@/utils/textFormat';
import { TriangleAlert } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface ContentRendererProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  onCellUpdate: (indices: Indices, field: string, value: any) => void;
  isPrint?: boolean;
  showDescriptions?: boolean; // explicit on/off. If undefined, use descriptionTypes (custom mode)
  descriptionTypes?: string[];
  /** terme de recherche à surligner dans les titres */
  highlight?: string;
}

const MaybeMathJax: React.FC<{ children: React.ReactNode; mathSource: unknown; cacheKey: string }> = ({ children, mathSource, cacheKey }) => (
  <MathText source={mathSource} cacheKey={cacheKey}>{children}</MathText>
);

export const ContentRenderer: React.FC<ContentRendererProps> = React.memo(({ data, indices, elementType, onCellUpdate, isPrint = false, showDescriptions, descriptionTypes = [], highlight }) => {
  const { t } = useLocale();
  const handleUpdate = (field: string) => (value: string) => {
    onCellUpdate(indices, field, value);
  };
  
  if (elementType in TOP_LEVEL_TYPE_CONFIG) {
    const item = data as TopLevelItem;
    const config = TOP_LEVEL_TYPE_CONFIG[item.type as TopLevelType];

    if (!config) {
        logger.error("ContentRenderer Error: Invalid top-level item type encountered.", { data });
        return (
            <div className="text-lg font-bold text-center py-3 text-destructive flex items-center justify-center gap-3">
                <TriangleAlert className="h-5 w-5" />
                <span>{t('editor.unknownContent')}</span>
            </div>
        );
    }
    
    const isCorrection = item.type.startsWith('correction_');

    if (isPrint) {
      // Afficher les chapitres et évaluations de la même manière
      if (item.type === 'chapter' || TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type)) {
        const printIndent = isCorrection ? 'ps-4' : '';
        // Nettoyer le titre pour enlever le préfixe de type si présent
        let titleToDisplay = item.title || config.name;
        const typePrefix = item.type.toUpperCase();
        if (titleToDisplay.startsWith(typePrefix)) {
          titleToDisplay = titleToDisplay.substring(typePrefix.length).trim();
          if (!titleToDisplay) {
            titleToDisplay = config.name;
          }
        }

        if (item.type === 'chapter') {
          return (
            <div className="flex w-full items-center justify-center text-center font-bold text-base font-extrabold tracking-tight text-red-700">
              <span>{titleToDisplay}</span>
            </div>
          );
        }

        return (
          <div className={`font-extrabold tracking-tight text-base flex items-center justify-center ${config.color} ${printIndent}`} style={{ textAlign: 'center', width: '100%' }}>
            <span>{titleToDisplay}</span>
          </div>
        );
      }

      // Pour les autres types d'éléments
      let titleToDisplay = item.title || config.name;
      const typePrefix = item.type.toUpperCase();
      if (titleToDisplay.startsWith(typePrefix)) {
        titleToDisplay = titleToDisplay.substring(typePrefix.length).trim();
        if (!titleToDisplay) {
          titleToDisplay = config.name;
        }
      }
      
      return (
        <div className="font-bold text-base">
          {titleToDisplay}
        </div>
      );
    }

    const isEvaluation = ['evaluation_diagnostic', 'devoir_maison', 'controle_continu', 'correction_devoir_maison', 'correction_controle_continu'].includes(item.type);
    const isCenteredInApp = isEvaluation;
    
    let indentClass = '';
    // Ne pas appliquer d'indentation pour les chapitres et évaluations de premier niveau
    if (indices.itemIndex !== undefined) {
        if (indices.subsubsectionIndex !== undefined) indentClass = 'md:ps-12';
        else if (indices.subsectionIndex !== undefined) indentClass = 'md:ps-8';
        else if (indices.sectionIndex !== undefined) indentClass = 'md:ps-4';
    }

    const isTopLevel = item.type === 'chapter' || isEvaluation;
    const justificationClass = isTopLevel ? 'justify-center' : '';
    
    if (isCorrection) {
      indentClass = 'md:ps-4';
    }

    if (item.type === 'chapter') {
      return (
        <MaybeMathJax mathSource={item.title} cacheKey={`chapter-${item.title}`}>
          <div className="flex w-full items-center justify-center py-2 sm:py-2.5 text-center font-bold text-[15px] sm:text-base font-extrabold tracking-tight text-red-700">
            <EditableTitle value={item.title} onSave={handleUpdate('title')} />
          </div>
        </MaybeMathJax>
      );
    }

    return (
      // MaybeMathJax : les titres de chapitres/blocs acceptent aussi le LaTeX
      // (ex. « Chapitre 3 : Étude de $f(x)=\frac{1}{x}$ »), comme les sections.
      <MaybeMathJax mathSource={item.title} cacheKey={`top-${item.type}-${item.title}`}>
        <div className={`text-[14.5px] sm:text-base font-extrabold tracking-tight py-1 flex items-center ${config.color} ${indentClass} ${isCenteredInApp ? 'justify-center' : justificationClass}`}>
            <EditableTitle value={item.title} onSave={handleUpdate('title')} />
        </div>
      </MaybeMathJax>
    );
  }

  switch (elementType) {
    case 'section':
      const sectionLetter = String.fromCharCode(65 + (indices.sectionIndex ?? 0));
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-[13.5px] sm:text-base font-bold tracking-tight text-foreground py-1 flex items-baseline gap-1.5 sm:gap-2">
                <span>{sectionLetter}.</span>
                <EditableTitle value={data.name} onSave={handleUpdate('name')} />
            </div>
        </MaybeMathJax>
      );
    case 'subsection':
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-[12px] sm:text-sm font-bold font-sans text-foreground ps-1 sm:ps-4 py-0.5 flex items-baseline gap-1.5 sm:gap-2">
                <span>{indices.subsectionIndex! + 1}.</span>
                <EditableTitle value={data.name} onSave={handleUpdate('name')} />
            </div>
        </MaybeMathJax>
      );
    case 'subsubsection':
      const roman = ['i', 'ii', 'iii', 'iv', 'v'];
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-[11px] sm:text-sm italic font-sans text-muted-foreground ps-2 sm:ps-8 py-0.5 flex items-baseline gap-1.5 sm:gap-2">
                <span>{roman[indices.subsubsectionIndex!] || (indices.subsubsectionIndex! + 1)}.</span>
                <EditableTitle value={data.name} onSave={handleUpdate('name')} />
            </div>
        </MaybeMathJax>
      );
    case 'item':
      const item = data as LessonItem;
      const normalizedType = TYPE_MAP[(item.type || '').toLowerCase()] || item.type;
      const hasDescription = typeof item.description === 'string' && item.description.trim().length > 0;
      const allowDescription = hasDescription && (showDescriptions === true || (showDescriptions === undefined && descriptionTypes.includes(normalizedType)));
      const badgeText = BADGE_TEXT_MAP[normalizedType] || normalizedType;
      const badgeColor = BADGE_COLOR_MAP[normalizedType] || 'bg-secondary text-secondary-foreground border-border';

      if (isPrint) {
        const mathSource = `${item.title || ''}\n${item.description || ''}\n${item.page || ''}`;
        return (
          <MaybeMathJax mathSource={mathSource} cacheKey={`print-${normalizedType}-${item.number || ''}-${item.title || ''}-${item.description || ''}`}>
            <div className="print-lesson-item">
              <span className="print-item-kind">{badgeText}{item.number ? ` ${item.number}` : ''}</span>
              <span className="print-item-title">{item.title || ''}</span>
              {item.page && <span className="print-item-page"> p. {item.page}</span>}
              {allowDescription && (
                <div className="print-item-description">
                  {renderDescriptionWithBold(item.description)}
                </div>
              )}
            </div>
          </MaybeMathJax>
        );
      }

      const content = (
        <div className="max-w-none space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-muted-foreground">
          {/* Titre */}
          <EditableCell value={item.title || ''} onSave={handleUpdate('title')} className="font-semibold text-[12.5px] sm:text-sm text-foreground p-0" placeholder={t('editor.titlePlaceholder')} highlight={highlight} />

          {/* Description : encadré sobre sous le titre */}
          {allowDescription && (
            <div className="mt-1 border border-border px-1.5 py-1 sm:px-2 sm:py-1.5 text-[11.5px] sm:text-[13px] leading-snug text-muted-foreground whitespace-pre-wrap break-words">
              {renderDescriptionWithBold(item.description)}
            </div>
          )}

          {/* Info page */}
          {item.page && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground italic">
              <span>(p.</span>
              <EditableCell value={String(item.page || '')} onSave={handleUpdate('page')} className="p-0" placeholder={t('editor.pagePlaceholder')} />
              <span>)</span>
            </div>
          )}
        </div>
      );
      
      const contentKey = `${item.type || ''}-${item.number || ''}-${item.title || ''}-${item.description || ''}-${item.page || ''}`;

      const mathSource = `${item.title || ''}\n${item.description || ''}\n${item.page || ''}`;
      const fullTooltip = BADGE_TOOLTIP_MAP[normalizedType] 
        ? `${BADGE_TOOLTIP_MAP[normalizedType]}${item.number ? ` ${item.number}` : ''}`
        : `${normalizedType}${item.number ? ` ${item.number}` : ''}`;

      return (
        <div className="flex flex-col items-start gap-1 ps-0.5 py-0.5 sm:flex-row sm:items-baseline sm:gap-2.5 sm:ps-8 sm:py-1">
          <Badge
            variant="outline"
            className={`inline-flex shrink-0 select-none items-center justify-center rounded-md px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[9.5px] sm:text-[11px] font-semibold tracking-normal border min-w-[42px] sm:min-w-[50px] transition-all duration-150 hover:-translate-y-px hover:shadow-xs cursor-default ${badgeColor} ${isPrint ? 'badge-print' : ''}`}
            data-tippy-content={fullTooltip}
            title={fullTooltip}
          >
            <span>{badgeText}</span>
            {item.number ? <span className="ms-1 font-bold">{item.number}</span> : null}
          </Badge>
          <div className="w-full flex-grow min-w-0 sm:w-auto">
            <MaybeMathJax mathSource={mathSource} cacheKey={contentKey}>{content}</MaybeMathJax>
          </div>
        </div>
      );
    default:
      return null;
  }
});

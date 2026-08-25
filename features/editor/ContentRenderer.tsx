import React from 'react';
import { MathText } from '@/components/ui/math-text';
import { Indices, LessonItem, TopLevelItem, ElementType, TopLevelType } from '@/types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, TOP_LEVEL_TYPE_CONFIG, BADGE_TOOLTIP_MAP } from '@/constants';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/utils/logger';
import { renderDescriptionWithBold } from '@/utils/textFormat';
import { TriangleAlert } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface ContentRendererProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  isPrint?: boolean;
  showDescriptions?: boolean; // explicit on/off. If undefined, use descriptionTypes (custom mode)
  descriptionTypes?: string[];
  /** terme de recherche à surligner dans les titres */
  highlight?: string;
}

const MaybeMathJax: React.FC<{ children: React.ReactNode; mathSource: unknown; cacheKey: string }> = ({ children, mathSource, cacheKey }) => (
  <MathText source={mathSource} cacheKey={cacheKey}>{children}</MathText>
);

const HighlightedText: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  const needle = query?.trim();
  if (!needle) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const source = text.toLocaleLowerCase();
  const target = needle.toLocaleLowerCase();
  let cursor = 0;
  let match = source.indexOf(target);
  while (match >= 0) {
    if (match > cursor) parts.push(text.slice(cursor, match));
    parts.push(<mark key={`${match}-${target}`} className="rounded-sm bg-warning/30 px-0.5 text-inherit">{text.slice(match, match + needle.length)}</mark>);
    cursor = match + needle.length;
    match = source.indexOf(target, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
};

export const ContentRenderer: React.FC<ContentRendererProps> = React.memo(({ data, indices, elementType, isPrint = false, showDescriptions, descriptionTypes = [], highlight }) => {
  const { t } = useLocale();
  
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
      // Un chapitre reste optiquement centré quel que soit son titre : les
      // retours manuels, les formules LaTeX et les longues formulations ont
      // une hauteur souple, mais une base commune qui évite les sauts visuels.
      const chapterTitle = item.title || config.name;
      const titleLines = Math.max(1, chapterTitle.split(/\r?\n/).length);
      const titleDensity = chapterTitle.replace(/\$[^$]*\$/g, 'x').trim().length + (titleLines - 1) * 32;
      const titleSize = titleDensity > 130
        ? 'text-[13px] max-sm:portrait:text-[10.4px] sm:text-sm'
        : titleDensity > 82
          ? 'text-sm max-sm:portrait:text-[11.2px] sm:text-[15px]'
          : 'text-[15px] max-sm:portrait:text-[12px] sm:text-base';
      return (
        <MaybeMathJax mathSource={chapterTitle} cacheKey={`chapter-${chapterTitle}`}>
          <div className={`flex min-h-[3.75rem] w-full items-center justify-center px-2 py-2.5 text-center font-bold ${titleSize} font-extrabold leading-snug tracking-tight text-foreground sm:min-h-[4.25rem] sm:px-4`}>
            <span className="block max-w-[min(100%,46rem)] break-words text-balance">
              <HighlightedText text={chapterTitle} query={highlight} />
            </span>
          </div>
        </MaybeMathJax>
      );
    }

    return (
      // MaybeMathJax : les titres de chapitres/blocs acceptent aussi le LaTeX
      // (ex. « Chapitre 3 : Étude de $f(x)=\frac{1}{x}$ »), comme les sections.
      <MaybeMathJax mathSource={item.title} cacheKey={`top-${item.type}-${item.title}`}>
        <div className={`text-[14.5px] max-sm:portrait:text-[11.6px] sm:text-base font-extrabold tracking-tight py-1 flex items-center ${config.color} ${indentClass} ${isCenteredInApp ? 'justify-center' : justificationClass}`}>
            <HighlightedText text={item.title} query={highlight} />
        </div>
      </MaybeMathJax>
    );
  }

  switch (elementType) {
    case 'section':
      const sectionLetter = String.fromCharCode(65 + (indices.sectionIndex ?? 0));
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-[13.5px] max-sm:portrait:text-[10.8px] sm:text-base font-bold tracking-tight text-foreground py-1 flex items-baseline gap-1.5 sm:gap-2">
                <span>{sectionLetter}.</span>
                <HighlightedText text={data.name} query={highlight} />
            </div>
        </MaybeMathJax>
      );
    case 'subsection':
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-[12px] max-sm:portrait:text-[9.6px] sm:text-sm font-bold font-sans text-foreground ps-1 sm:ps-4 py-0.5 flex items-baseline gap-1.5 sm:gap-2">
                <span>{indices.subsectionIndex! + 1}.</span>
                <HighlightedText text={data.name} query={highlight} />
            </div>
        </MaybeMathJax>
      );
    case 'subsubsection':
      const roman = ['i', 'ii', 'iii', 'iv', 'v'];
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-[11px] max-sm:portrait:text-[8.8px] sm:text-sm italic font-sans text-muted-foreground ps-2 sm:ps-8 py-0.5 flex items-baseline gap-1.5 sm:gap-2">
                <span>{roman[indices.subsubsectionIndex!] || (indices.subsubsectionIndex! + 1)}.</span>
                <HighlightedText text={data.name} query={highlight} />
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
          <div className="min-h-5 break-words p-0 text-[12.5px] max-sm:portrait:text-[10px] font-semibold text-foreground sm:text-sm">
            {item.title ? <HighlightedText text={item.title} query={highlight} /> : <span className="italic text-muted-foreground/55">{t('editor.titlePlaceholder')}</span>}
          </div>

          {/* Description : encadré sobre sous le titre */}
          {allowDescription && (
            <div className="mt-1 border border-border px-1.5 py-1 sm:px-2 sm:py-1.5 text-[11.5px] max-sm:portrait:text-[9.2px] sm:text-[13px] leading-snug text-muted-foreground whitespace-pre-wrap break-words">
              {renderDescriptionWithBold(item.description)}
            </div>
          )}

          {/* Info page */}
          {item.page && (
            <div className="flex items-center gap-1 text-[10px] max-sm:portrait:text-[8px] sm:text-xs text-muted-foreground italic">
              <span>(p.</span>
              <span>{String(item.page)}</span>
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
            className={`inline-flex shrink-0 select-none items-center justify-center rounded-md px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[9.5px] max-sm:portrait:text-[7.6px] sm:text-[11px] font-semibold tracking-normal border min-w-[42px] sm:min-w-[50px] transition-all duration-150 hover:-translate-y-px hover:shadow-xs cursor-default ${badgeColor} ${isPrint ? 'badge-print' : ''}`}
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

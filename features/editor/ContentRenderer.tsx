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

const renderChapterLabel = (label: string) => {
  const parts = label.split(/([0-9\u0660-\u0669]+(?:er|ere|eme|ère|ème|st|nd|rd|th)?)/gi);
  return parts.map((part, idx) => {
    if (!part) return null;
    const matchOrdinal = part.match(/^([0-9\u0660-\u0669]+)(er|ere|eme|ère|ème|st|nd|rd|th)$/i);
    if (matchOrdinal) {
      const num = matchOrdinal[1];
      const suf = matchOrdinal[2];
      return (
        <span key={idx} className="inline-block">
          <span>{num}</span>
          <sup className="relative -top-[0.45em] text-[0.6em] font-semibold">{suf}</sup>
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

const renderChapterTitleStyled = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^(Chapitre\s+[^:\-–—\n]+|Chapter\s+[^:\-–—\n]+|الفصل\s+[^:\-–—\n]+|الباب\s+[^:\-–—\n]+|الوحدة\s+[^:\-–—\n]+|الدرس\s+[^:\-–—\n]+|المحور\s+[^:\-–—\n]+)(?:\s*([:\-–—])\s*(.*))?$/i
  );

  if (match) {
    const chapterPrefix = match[1].trim();
    const separator = match[2];
    const restTitle = match[3]?.trim();

    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 text-center leading-snug">
        <span className="text-[0.95em] font-bold text-blue-600 dark:text-blue-400 font-sans tracking-tight">
          {renderChapterLabel(chapterPrefix)}
          {separator ? <span className="ms-1 text-blue-600/80 dark:text-blue-400/80">{separator}</span> : null}
        </span>
        {restTitle ? (
          <span className="text-[0.85em] font-semibold text-[#202124] dark:text-[#e8eaed] dark:text-foreground">
            {restTitle}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="text-[0.85em] font-bold text-[#202124] dark:text-[#e8eaed] dark:text-foreground">
      {text}
    </span>
  );
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
                <TriangleAlert className="h-5 w-5 stroke-[2.2]" />
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
      const chapterTitle = item.title || config.name;
      return (
        <MaybeMathJax mathSource={chapterTitle} cacheKey={`chapter-${chapterTitle}`}>
          <div className="my-3 flex w-full items-center justify-center text-center font-sans text-xl sm:text-2xl font-bold tracking-tight leading-snug select-none">
            <span className="max-w-[min(100%,44rem)] break-words text-balance">
              {highlight ? (
                <HighlightedText text={chapterTitle} query={highlight} />
              ) : (
                renderChapterTitleStyled(chapterTitle)
              )}
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
      const badgeColor = BADGE_COLOR_MAP[normalizedType] || 'bg-[#f1f3f4] text-[#3c4043] dark:bg-[#3c4043] dark:text-[#e8eaed]';

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
        <div className="editor-table-content font-editor-system max-w-none space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-[#3c4043] dark:text-[#bdc1c6]">
          {/* Titre */}
          <div
            title={item.title || t('editor.titlePlaceholder')}
            className="min-w-0 truncate whitespace-nowrap p-0 text-[11.7px] font-semibold leading-[18px] text-[#202124] dark:text-[#e8eaed] max-sm:portrait:text-[10.8px] sm:text-[13px] lg:text-[14.5px] lg:leading-5"
          >
            {item.title ? <HighlightedText text={item.title} query={highlight} /> : <span className="italic text-muted-foreground/55">{t('editor.titlePlaceholder')}</span>}
          </div>

          {/* Description : encadré sobre sous le titre avec branchement */}
          {allowDescription && (
            <div className="mt-1.5 ms-3 sm:ms-4 lg:ms-[18px] border-l-[2px] border-border/70 bg-muted/10 pl-2 sm:pl-2.5 lg:pl-3 py-1 sm:py-1.5 text-[11.5px] max-sm:portrait:text-[9.2px] sm:text-[13px] leading-snug text-[#3c4043] dark:text-[#bdc1c6] whitespace-pre-wrap break-words">
              {renderDescriptionWithBold(item.description)}
            </div>
          )}

          {/* Info page */}
          {item.page && (
            <div className="flex items-center gap-1 text-[10px] max-sm:portrait:text-[8px] sm:text-xs text-[#3c4043]/80 dark:text-[#bdc1c6] italic">
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
        <div className="editor-table-content font-editor-system flex min-w-0 items-center gap-1.5 py-1 transition-colors duration-150 hover:bg-[#f8f9fa] dark:hover:bg-white/[0.04] sm:gap-2 sm:ps-2 lg:gap-2.5 lg:ps-4">
          <Badge
            variant="outline"
            className={`inline-flex min-w-[27px] shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[3px] border-0 px-0.5 py-0 text-[8px] font-bold uppercase leading-tight tracking-normal transition-colors duration-150 cursor-default max-sm:portrait:min-w-[22px] max-sm:portrait:px-px max-sm:portrait:text-[7px] sm:min-w-[32px] sm:px-1 sm:text-[8.5px] lg:min-w-[35px] lg:px-1 lg:py-px lg:text-[9px] lg:tracking-wide ${badgeColor} ${isPrint ? 'badge-print' : ''}`}
            data-tippy-content={fullTooltip}
            title={fullTooltip}
          >
            <span>{badgeText}</span>
            {item.number ? <span className="ms-px font-bold lg:ms-0.5">{item.number}</span> : null}
          </Badge>
          <div className="min-w-0 flex-1">
            <MaybeMathJax mathSource={mathSource} cacheKey={contentKey}>{content}</MaybeMathJax>
          </div>
        </div>
      );
    default:
      return null;
  }
});

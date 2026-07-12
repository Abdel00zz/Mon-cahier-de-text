import React from 'react';
import { MathText } from './ui/math-text';
import { Indices, LessonItem, TopLevelItem, ElementType, TopLevelType } from '../types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, TOP_LEVEL_TYPE_CONFIG, BADGE_TOOLTIP_MAP } from '../constants';
import { EditableTitle } from './ui/EditableTitle';
import { EditableCell } from './ui/EditableCell';
import { Badge } from './ui/badge';
import { logger } from '../utils/logger';
import { renderDescriptionWithBold } from '../utils/textFormat';
import { TriangleAlert } from './ui/icons';

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
  const handleUpdate = (field: string) => (value: string) => {
    onCellUpdate(indices, field, value);
  };
  
  if (elementType in TOP_LEVEL_TYPE_CONFIG) {
    const item = data as TopLevelItem;
    const config = TOP_LEVEL_TYPE_CONFIG[item.type as TopLevelType];

    if (!config) {
        logger.error("ContentRenderer Error: Invalid top-level item type encountered.", { data });
        return (
            <div className="text-lg font-bold font-slab text-center py-3 text-destructive flex items-center justify-center gap-3">
                <TriangleAlert className="h-5 w-5" />
                <span>Erreur: Type de contenu inconnu</span>
            </div>
        );
    }
    
    const isCorrection = item.type.startsWith('correction_');

    if (isPrint) {
      // Afficher les chapitres et évaluations de la même manière
      if (item.type === 'chapter' || TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type)) {
        const printIndent = isCorrection ? 'pl-4' : '';
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
            <div className="w-full text-center font-slab text-lg font-extrabold tracking-tight text-red-700">
              <span>{titleToDisplay}</span>
            </div>
          );
        }

        return (
          <div className={`font-bold font-slab text-lg flex items-center justify-center gap-3 ${config.color} ${printIndent}`} style={{ textAlign: 'center', width: '100%' }}>
            <config.icon className="h-5 w-5" />
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
        <div className="font-bold font-slab text-lg">
          {titleToDisplay}
        </div>
      );
    }

    const isEvaluation = ['evaluation_diagnostic', 'devoir_maison', 'controle_continu', 'correction_devoir_maison', 'correction_controle_continu'].includes(item.type);
    const isCenteredInApp = isEvaluation;
    
    let indentClass = '';
    // Ne pas appliquer d'indentation pour les chapitres et évaluations de premier niveau
    if (indices.itemIndex !== undefined) {
        if (indices.subsubsectionIndex !== undefined) indentClass = 'md:pl-12';
        else if (indices.subsectionIndex !== undefined) indentClass = 'md:pl-8';
        else if (indices.sectionIndex !== undefined) indentClass = 'md:pl-4';
    }

    const isTopLevel = item.type === 'chapter' || isEvaluation;
    const textClasses = isCorrection ? 'text-base font-semibold' : 'text-lg font-bold';
    const justificationClass = isTopLevel ? 'justify-center' : '';
    
    if (isCorrection) {
      indentClass = 'md:pl-4';
    }

    if (item.type === 'chapter') {
      return (
        <MaybeMathJax mathSource={item.title} cacheKey={`chapter-${item.title}`}>
          <div className="w-full py-3 text-center font-slab text-lg font-extrabold tracking-tight text-red-700 sm:text-xl">
            <EditableTitle value={item.title} onSave={handleUpdate('title')} />
            <span aria-hidden className="mx-auto mt-2.5 flex w-32 items-center justify-center">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-red-300 to-red-400" />
              <span className="mx-2 h-2 w-2 rotate-45 rounded-[1px] border border-red-400 bg-red-50 shadow-[0_0_0_2px_rgba(254,226,226,0.7)]" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-red-300 to-red-400" />
            </span>
          </div>
        </MaybeMathJax>
      );
    }

    return (
      // MaybeMathJax : les titres de chapitres/blocs acceptent aussi le LaTeX
      // (ex. « Chapitre 3 : Étude de $f(x)=\frac{1}{x}$ »), comme les sections.
      <MaybeMathJax mathSource={item.title} cacheKey={`top-${item.type}-${item.title}`}>
        <div className={`${textClasses} font-slab py-1 flex items-center gap-3 ${config.color} ${indentClass} ${isCenteredInApp ? 'justify-center' : justificationClass}`}>
            <config.icon className="h-5 w-5 shrink-0" />
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
            <div className="text-base font-bold font-display text-foreground py-1.5 flex items-baseline gap-2">
                <span>{sectionLetter}.</span>
                <EditableTitle value={data.name} onSave={handleUpdate('name')} />
            </div>
        </MaybeMathJax>
      );
    case 'subsection':
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-sm font-bold font-sans text-foreground pl-2 sm:pl-4 py-0.5 flex items-baseline gap-2">
                <span>{indices.subsectionIndex! + 1}.</span>
                <EditableTitle value={data.name} onSave={handleUpdate('name')} />
            </div>
        </MaybeMathJax>
      );
    case 'subsubsection':
      const roman = ['i', 'ii', 'iii', 'iv', 'v'];
      return (
        <MaybeMathJax mathSource={data.name} cacheKey={data.name}>
            <div className="text-sm italic font-sans text-muted-foreground pl-4 sm:pl-8 py-0.5 flex items-baseline gap-2">
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
        <div className="max-w-none space-y-1 text-sm text-muted-foreground">
          {/* Titre */}
          <EditableCell value={item.title || ''} onSave={handleUpdate('title')} className="font-semibold text-foreground p-0" placeholder="Titre..." highlight={highlight} />

          {/* Description : encadré doux sous le titre — contenu TOUJOURS affiché
              en entier (aucune barre de défilement) ; texte enrichi (gras,
              italique, listes) + LaTeX (les longues formules passent à la
              ligne via displayOverflow: linebreak). */}
          {allowDescription && (
            <div className="mt-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs md:text-[12px] leading-relaxed text-muted-foreground font-serif whitespace-pre-wrap break-words animate-fade-in shadow-sm">
              {renderDescriptionWithBold(item.description)}
            </div>
          )}

          {/* Info page */}
          {item.page && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
              <span>(p.</span>
              <EditableCell value={String(item.page || '')} onSave={handleUpdate('page')} className="p-0" placeholder="page" />
              <span>)</span>
            </div>
          )}
        </div>
      );
      
      const contentKey = `${item.type || ''}-${item.number || ''}-${item.title || ''}-${item.description || ''}-${item.page || ''}`;

      const mathSource = `${item.title || ''}\n${item.description || ''}\n${item.page || ''}`;
      return (
        // Mobile : badge AU-DESSUS du titre (pile) pour laisser toute la largeur
        // au texte ; à partir de sm, badge et titre côte à côte.
        <div className="flex flex-col items-start gap-1 pl-1 py-1 sm:flex-row sm:items-baseline sm:gap-2 sm:pl-8">
          <Badge
            variant="outline"
            className={`flex-shrink-0 select-none rounded-lg text-[10px] font-bold ${badgeColor} ${isPrint ? 'badge-print' : ''}`}
            data-tippy-content={BADGE_TOOLTIP_MAP[normalizedType] || normalizedType}
          >
            {badgeText} {item.number || ''}
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

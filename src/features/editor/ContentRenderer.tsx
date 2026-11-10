import React from 'react';
import { hasMathSyntax } from '@/lib/text/math';
import { toDisplayText } from '@/lib/text/textValue';
import { Indices, LessonItem, TopLevelItem, ElementType, TopLevelType } from '@/types';
import { TYPE_MAP, BADGE_TEXT_MAP, contentBadgeClass, TOP_LEVEL_TYPE_CONFIG, BADGE_TOOLTIP_MAP } from '@/constants';
import { Badge } from '@/components/ui/badge';
import { contentBadgeTone } from '@/constants/type-keys';
import { logger } from '@/lib/logger';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { HighlightedText, MaybeKaTeX, renderChapterTitleStyled, withDisplayText } from './contentRendererText';
import { TriangleAlert, FileText } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { indicesKey } from '@/domain/notebook/lessonRows';
import { romanNumber } from '@/domain/notebook/contentNumbering';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';

interface ContentRendererProps {
  data: any;
  indices: Indices;
  elementType: ElementType;
  isPrint?: boolean;
  showDescriptions?: boolean; // explicit on/off. If undefined, use descriptionTypes (custom mode)
  descriptionTypes?: string[];
  /** terme de recherche à surligner dans les titres */
  highlight?: string;
  /** numéro affiché : saisi à la main, sinon calculé par chapitre */
  contentNumber?: string;
  /**
   * Sujet écrit par le professeur rangé par la ligne du cahier qui le porte
   * (voir `notebookDocumentPreviews`). Une LECTURE, pas une donnée : la rangée
   * ne reçoit jamais le document, seulement de quoi le retrouver en O(1) — un
   * devoir sans sujet ne compose donc rien du tout.
   */
  getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
  /** ouvrir l'aperçu du sujet (lecture seule, aucune écriture) */
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
}

/** Comparateur memo : liste fixe de props (indices exclu, comparé par sa clé). */
const COMPARATOR_KEYS = [
  'data',
  'elementType',
  'isPrint',
  'showDescriptions',
  'descriptionTypes',
  'highlight',
  'contentNumber',
  'getDocumentPreview',
  'onOpenDocumentPreview',
] as const;

export const ContentRenderer: React.FC<ContentRendererProps> = React.memo(({ data, indices, elementType, isPrint = false, showDescriptions, descriptionTypes = [], highlight, contentNumber, getDocumentPreview, onOpenDocumentPreview }) => {
  const { t } = useLocale();
  
  if (elementType in TOP_LEVEL_TYPE_CONFIG) {
    const item = withDisplayText(data as TopLevelItem);
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
    
    const isCorrection = toDisplayText(item.type).startsWith('correction_');
    /*
     * Un DEVOIR (maison / contrôle continu) est un repère de l'année : son titre
     * porte sa propre voix (rouge profond, fonte éditoriale) sur l'écran comme
     * sur le papier. Les corrections gardent leur couleur de famille — elles
     * répondent au devoir, elles ne le rejouent pas.
     */
    const isAssessment = item.type === 'devoir_maison' || item.type === 'controle_continu' || item.type === 'controle_court' || item.type === 'controle_global' || item.type === 'oral';
    const titleColorClass = isAssessment ? 'editor-type-evaluation' : config.color;

    if (isPrint) {
      const prefix = toDisplayText(item.type).toUpperCase();
      const title = (toDisplayText(item.title) || config.name).replace(new RegExp('^' + prefix), '').trim() || config.name;
      return (
        // Pas de MaybeKaTeX ici : ses enfants sont un arbre riche, il rendrait
        // le titre tel quel. `HighlightedText` est la seule composition qui
        // traduise les formules en KaTeX, sur papier comme à l'écran.
        <div dir={textDirectionAttribute(title)} className={`flex w-full items-center justify-center text-center text-base font-bold ${item.type === 'chapter' ? 'text-red-700' : titleColorClass}`}>
          <HighlightedText text={title} />
        </div>
      );
    }

    /*
     * Pastille « Document » : elle n'apparaît QUE là où un sujet existe, une
     * seule fois par ligne (le devoir est un bloc, pas une liste de contenus).
     * Bouton et non div : la rangée exclut déjà `button` de ses clics, donc
     * ouvrir un aperçu ne sélectionne ni ne date le devoir, et le double-clic
     * d'édition reste intact.
     */
    const documentPreview = getDocumentPreview && onOpenDocumentPreview
      ? getDocumentPreview(indicesKey(indices))
      : undefined;
    
    let indentClass = '';
    // Ne pas appliquer d'indentation pour les chapitres et évaluations de premier niveau
    if (indices.itemIndex !== undefined) {
        // Un cran de marge par niveau : c'est le plan du cahier.
        if (indices.subsubsectionIndex !== undefined) indentClass = 'editor-indent-3';
        else if (indices.subsectionIndex !== undefined) indentClass = 'editor-indent-2';
        else if (indices.sectionIndex !== undefined) indentClass = 'editor-indent-1';
    }

    // System UI : les titres structurels (chapitre, bloc, évaluation de tête)
    // restent centrés — c'est la ligne de repère du cahier ; les niveaux
    // imbriqués (section, sous-section, contenu) se calent sur le bord de
    // lecture. Le corps du texte, lui, ne se centre jamais.
    const justificationClass = 'justify-center text-center';
    
    if (isCorrection) {
      indentClass = 'editor-indent-1';
    }

    if (item.type === 'chapter') {
      const chapterTitle = toDisplayText(item.title) || toDisplayText(config.name);
      const cleanChapterNumber = contentNumber ? String(contentNumber).replace(/\.+$/, '').trim() : null;
      return (
        <MaybeKaTeX key={highlight ?? ""} mathSource={chapterTitle} cacheKey={`chapter-${chapterTitle}`}>
          <div dir={textDirectionAttribute(chapterTitle)} className="editor-type-chapter my-3 flex w-full items-center justify-center text-center font-bold tracking-tight select-none">
            <span dir={textDirectionAttribute(chapterTitle)} className="max-w-[min(100%,calc(100%-2.5rem))] break-words text-pretty">
              {cleanChapterNumber && <bdi dir="ltr" className="me-2">{cleanChapterNumber}</bdi>}
              {highlight || hasMathSyntax(chapterTitle) ? (
                <HighlightedText text={chapterTitle} query={highlight} />
              ) : (
                renderChapterTitleStyled(chapterTitle)
              )}
            </span>
          </div>
        </MaybeKaTeX>
      );
    }

    const badgeColorClass = config.badgeColor || 'bg-[#f5f2fd] text-[#532985] border-[#ddd1fa] dark:bg-[#231a38] dark:text-[#d8c5fa] dark:border-[#4d3975]';

    return (
      // MaybeKaTeX : les titres de chapitres/blocs acceptent aussi le LaTeX
      // (ex. « Chapitre 3 : Étude de $f(x)=\frac{1}{x}$ »), comme les sections.
      <MaybeKaTeX key={highlight ?? ""} mathSource={item.title} cacheKey={`top-${item.type}-${item.title}`}>
        <div dir={textDirectionAttribute(item.title)} className={`editor-type-top w-full font-bold tracking-tight py-0.5 flex items-center ${titleColorClass} ${indentClass} ${justificationClass}`}>
            <span className={`editor-assessment-pill inline-flex min-w-0 max-w-[calc(100%-2.5rem)] items-center justify-center rounded-full border px-4 py-1 text-xs sm:text-sm font-semibold shadow-xs transition-transform duration-150 ${badgeColorClass}`}>
              {documentPreview ? (
                <button
                  type="button"
                  dir={textDirectionAttribute(item.title)}
                  data-document-title-link="true"
                  data-document-highlight="true"
                  className="editor-document-highlight group max-w-full inline-flex items-center cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDocumentPreview?.(documentPreview);
                  }}
                  title={t('documentPreview.openAria', { title: documentPreview.title })}
                  aria-label={t('documentPreview.openAria', { title: documentPreview.title })}
                >
                  <span dir={textDirectionAttribute(item.title)}>
                    <HighlightedText text={item.title} query={highlight} />
                  </span>
                </button>
              ) : (
                <span dir={textDirectionAttribute(item.title)}>
                  <HighlightedText text={item.title} query={highlight} />
                </span>
              )}
            </span>
        </div>
      </MaybeKaTeX>
    );
  }

  switch (elementType) {
    case 'section':
      const sectionLetter = String.fromCharCode(65 + (indices.sectionIndex ?? 0));
      const sectionLabel = contentNumber
        ? String(contentNumber).replace(/\.+$/, '').trim()
        : sectionLetter;
      return (
        <MaybeKaTeX key={highlight ?? ""} mathSource={data.name} cacheKey={data.name}>
            <div dir={textDirectionAttribute(data.name)} className="editor-type-section editor-indent-1 font-semibold tracking-tight text-foreground py-1 flex items-baseline gap-1.5 sm:gap-2 text-start">
                {/* `shrink-0 whitespace-nowrap` : la cellule hérite de
                    `overflow-wrap: anywhere` ([data-row-content]), donc sans
                    cela le repli d'un titre long comprime « A » jusqu'à ce
                    que la lettre passe seule à la ligne suivante. */}
                <bdi dir="ltr" className="editor-section-letter shrink-0 whitespace-nowrap">{sectionLabel}</bdi>
                <span dir={textDirectionAttribute(data.name)}>
                  <HighlightedText text={data.name} query={highlight} />
                </span>
            </div>
        </MaybeKaTeX>
      );
    case 'subsection':
      const subsectionNum = contentNumber
        ? String(contentNumber).replace(/\.+$/, '').trim()
        : String(indices.subsectionIndex! + 1);
      return (
        <MaybeKaTeX key={highlight ?? ""} mathSource={data.name} cacheKey={data.name}>
            <div dir={textDirectionAttribute(data.name)} className="editor-type-subsection editor-indent-2 font-semibold text-foreground py-0.5 flex items-baseline gap-1.5 sm:gap-2 text-start">
                <bdi dir="ltr" className="shrink-0 whitespace-nowrap">{subsectionNum}</bdi>
                <span dir={textDirectionAttribute(data.name)}>
                  <HighlightedText text={data.name} query={highlight} />
                </span>
            </div>
        </MaybeKaTeX>
      );
    case 'subsubsection':
      const subsubsectionNum = contentNumber
        ? String(contentNumber).replace(/\.+$/, '').trim()
        : romanNumber(indices.subsubsectionIndex! + 1).toLowerCase();
      return (
        <MaybeKaTeX key={highlight ?? ""} mathSource={data.name} cacheKey={data.name}>
            <div dir={textDirectionAttribute(data.name)} className="editor-type-subsubsection editor-indent-3 italic font-semibold text-muted-foreground py-0.5 flex items-baseline gap-1.5 sm:gap-2 text-start">
                <bdi dir="ltr" className="shrink-0 whitespace-nowrap">{subsubsectionNum}</bdi>
                <span dir={textDirectionAttribute(data.name)}>
                  <HighlightedText text={data.name} query={highlight} />
                </span>
            </div>
        </MaybeKaTeX>
      );
    case 'item':
      const item = withDisplayText(data as LessonItem);
      // Un cran de marge par niveau parent : chapitre à la marge, puis
      // section, sous-section, sous-sous-section.
      const lessonIndentClass = indices.subsubsectionIndex !== undefined
        ? 'editor-indent-3'
        : indices.subsectionIndex !== undefined
          ? 'editor-indent-2'
          : indices.sectionIndex !== undefined
            ? 'editor-indent-1'
            : '';
      const normalizedType = TYPE_MAP[toDisplayText(item.type).toLowerCase()] || toDisplayText(item.type);
      if (normalizedType === 'free') {
        const source = `${item.title ?? ''}\n${item.description ?? ''}`;
        const empty = !source.trim();
        return (
          <MaybeKaTeX mathSource={source} cacheKey={`free-${source}`}>
            <div dir={textDirectionAttribute(item.title || item.description)} className={`editor-free-content text-start min-h-6 whitespace-pre-wrap break-words py-0.5 text-foreground ${lessonIndentClass}`}>
              {item.title && <div dir={textDirectionAttribute(item.title)}><HighlightedText text={item.title} query={highlight} /></div>}
              {item.description && <div dir={textDirectionAttribute(item.description)}>{renderDescriptionWithBold(item.description)}</div>}
              {empty && !isPrint && <span dir={textDirectionAttribute(t('addContent.freeHint'))} className="text-muted-foreground text-xs italic">{t('addContent.freeHint')}</span>}
              {empty && isPrint && <span aria-hidden="true">{'\u00a0'}</span>}
            </div>
          </MaybeKaTeX>
        );
      }
      const hasDescription = typeof item.description === 'string' && item.description.trim().length > 0;
      const allowDescription = hasDescription && (showDescriptions === true || (showDescriptions === undefined && descriptionTypes.includes(normalizedType)));
      const badgeText = BADGE_TEXT_MAP[normalizedType] || normalizedType;
      const badgeClass = contentBadgeClass(normalizedType);
      // Numéro saisi à la main prioritaire, sinon compteur du chapitre.
      const displayNumber = toDisplayText(contentNumber ?? item.number);

      if (isPrint) {
        const mathSource = `${item.title || ''}\n${allowDescription ? item.description || '' : ''}\n${item.page || ''}`;
        return (
          <MaybeKaTeX key={highlight ?? ""} mathSource={mathSource} cacheKey={`print-${normalizedType}-${item.number || ''}-${item.title || ''}-${item.description || ''}`}>
            <div dir={textDirectionAttribute(item.title || item.description)} className={`print-lesson-item ${lessonIndentClass} text-start`}>
              <span dir={textDirectionAttribute(badgeText) ?? 'ltr'} className="print-item-kind" data-content-tone={contentBadgeTone(normalizedType)}>{badgeText}{displayNumber ? <> <bdi dir="ltr">{displayNumber}</bdi></> : null}</span>
              {/* Même composition que l'écran : un titre « Limite $x^2$ » ne
                  doit jamais partir en TeX brut sur le papier. */}
              <span dir={textDirectionAttribute(item.title)} className="print-item-title"><HighlightedText text={item.title} /></span>
              {item.page && <span dir="ltr" className="print-item-page"> p. {item.page}</span>}
              {allowDescription && (
                <div
                  dir={textDirectionAttribute(item.description)}
                  className="print-item-description"
                  data-content-type={normalizedType}
                  data-content-tone={contentBadgeTone(normalizedType)}
                >
                  {renderDescriptionWithBold(item.description)}
                </div>
              )}
            </div>
          </MaybeKaTeX>
        );
      }

      const fullTooltip = BADGE_TOOLTIP_MAP[normalizedType] 
        ? `${BADGE_TOOLTIP_MAP[normalizedType]}${displayNumber ? ` ${displayNumber}` : ''}`
        : `${normalizedType}${displayNumber ? ` ${displayNumber}` : ''}`;

      const itemDocumentPreview = getDocumentPreview && onOpenDocumentPreview
        ? getDocumentPreview(indicesKey(indices))
        : undefined;

      const content = (
        <div dir={textDirectionAttribute(item.title || item.description)} className={`editor-lesson-row editor-table-content block min-w-0 text-start font-editor-system py-0.5 text-muted-foreground ${lessonIndentClass}`}>
          <Badge
            variant="outline"
            dir={textDirectionAttribute(badgeText) ?? 'ltr'}
            className={`editor-kind-badge editor-type-badge me-1.5 inline-flex shrink-0 whitespace-nowrap px-1 align-baseline transition-colors duration-150 cursor-default ${badgeClass}`}
            data-content-type={normalizedType}
            data-content-number={displayNumber ?? ''}
            data-tippy-content={fullTooltip}
          >
            <span>{badgeText}</span>
            {displayNumber ? <bdi dir="ltr" className="ms-px font-bold lg:ms-0.5">{displayNumber}</bdi> : null}
            {/* Lecteurs d'écran : la nature en toutes lettres, pas seulement l'abréviation. */}
            <span className="sr-only">{fullTooltip}</span>
          </Badge>
          {/* Titre : wrap multilingue / saut de ligne supporté */}
          <span
            title={item.title || t('editor.titlePlaceholder')}
            dir={textDirectionAttribute(item.title)}
            className="editor-type-item-title text-start min-w-0 break-words p-0 font-semibold text-foreground"
          >
            {itemDocumentPreview ? (
              <button
                type="button"
                dir={textDirectionAttribute(item.title)}
                data-document-title-link="true"
                data-document-highlight="true"
                className="editor-document-highlight group max-w-full"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDocumentPreview?.(itemDocumentPreview);
                }}
                title={t('documentPreview.openAria', { title: itemDocumentPreview.title })}
                aria-label={t('documentPreview.openAria', { title: itemDocumentPreview.title })}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-95 transition-opacity pointer-events-none" aria-hidden="true" />
                <HighlightedText text={item.title} query={highlight} />
              </button>
            ) : item.title ? (
              <HighlightedText text={item.title} query={highlight} />
            ) : (
              <span dir={textDirectionAttribute(t('editor.titlePlaceholder'))} className="italic text-muted-foreground/55">{t('editor.titlePlaceholder')}</span>
            )}
          </span>

          {/* Description : encadré mathématique sobre sans arrondi sous le titre (masqué si un document dédié existe pour éliminer tout sous-titre redondant) */}
          {allowDescription && !itemDocumentPreview && (
            <div
              className="editor-item-description editor-type-description text-start mt-1 block px-1.5 py-1 text-foreground whitespace-pre-wrap break-words"
              data-content-type={normalizedType}
              dir={textDirectionAttribute(item.description)}
            >
              {renderDescriptionWithBold(item.description)}
            </div>
          )}

          {/* Info page */}
          {item.page && (
            <div dir="ltr" className="editor-type-page flex items-center gap-1 text-muted-foreground italic">
              <span>(p.</span>
              <span>{String(item.page)}</span>
              <span>)</span>
            </div>
          )}
        </div>
      );
      
      const contentKey = `${item.type || ''}-${item.number || ''}-${item.title || ''}-${allowDescription ? item.description || '' : ''}-${item.page || ''}`;

      const mathSource = `${item.title || ''}\n${allowDescription ? item.description || '' : ''}\n${item.page || ''}`;


      return <MaybeKaTeX key={highlight ?? ""} mathSource={mathSource} cacheKey={contentKey}>{content}</MaybeKaTeX>;

    default:
      return null;
  }
}, (previous, next) => {
  // Rebuilding the row projection after a date edit recreates coordinates.
  // Equal coordinates do not require typesetting every unchanged lesson again.
  // Liste fixe : aucune allocation de Set/tableau à chaque comparaison — le
  // comparateur tourne pour CHAQUE ligne à CHAQUE frappe dans le tableau.
  if (indicesKey(previous.indices) !== indicesKey(next.indices)) return false;
  for (const key of COMPARATOR_KEYS) {
    if (!Object.is(previous[key], next[key])) return false;
  }
  return true;
});
ContentRenderer.displayName = 'ContentRenderer';

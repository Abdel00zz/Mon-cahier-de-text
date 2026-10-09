import React, { useEffect, useMemo, useRef } from 'react';
import { LessonsData, Indices, ContentDirection } from '@/types';
import { withAbsenceRows, groupRowsWithAbsences, absenceRemarkGroups, type AbsenceSession, type AbsenceDisplayRow } from '@/domain/notebook/absenceSessions';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { type LessonRow } from '@/domain/notebook/lessonRows';
import type { ContentDateOrder } from '@/domain/calendar/dateOrder';
import { DateCard, MultiDateCard, TableRow } from './TableRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getMergeableDate, getMergeableRemark, type FlatDataItem, type RenderRow } from '@/domain/notebook/tableRows';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { logger } from '@/lib/logger';
import { useWindowVirtualizer, VirtualListRow, type VirtualItem } from '@/components/ui/virtual-list';
import { useLocale } from '@/i18n/LocaleProvider';
import { hasOnlyPristineStarterDiagnostic } from '@/domain/notebook/starterDiagnostic';
import { SupportWhatsAppBlock } from '@/components/support/SupportWhatsAppBlock';
import { ProudTeacherIllustration, CurriculumImportIllustration, LessonSearchIllustration } from '@/components/ui/DynamicIllustration';
import { motion, useReducedMotion } from 'framer-motion';
import { SessionDocuments } from './SessionDocuments';

// Une seule source de largeurs pour toute l'application : `.editor-table-grid`
// résout `--cdt-table-cols`, redéfini par `index.css` pour le téléphone
// (largeurs MINIMALES comprises) puis pour le desktop. Des pourcentages
// codés en dur ici écrasaient ces bornes sur téléphone et tassaient les
// colonnes — donc les rails et la lisibilité.
const TABLE_GRID_CLASS = 'editor-table-grid';

interface MainTableProps {
  lessonsData: LessonsData;
  visibleRows: LessonRow[];
  absenceSessions?: readonly AbsenceSession[];
  onClearSearch: () => void;
  /** Sens de lecture du cahier importé, indépendant de l'interface générale. */
  contentDirection: ContentDirection;
  onOpenAddContentModal: (indices?: Indices) => void;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (indices: Indices) => void;
  onToggleSelectGroup?: (indices: Indices[]) => void;
  onOpenContentEditor: (indices: Indices) => void;
  onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
  /** saisie de la remarque de la séance (ligne ou groupe fusionné) */
  onOpenRemark?: (indices: Indices) => void;
  newlyAddedIds: string[];
  /** clé de la ligne dont le contenu est ouvert dans l’éditeur */
  editingKey?: string;
  /** garde intelligente : alertes live sur la date saisie */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** ordre chronologique : voisins datés du contenu (alerte de recul de date) */
  getDateOrder?: (indices: Indices) => ContentDateOrder | undefined;
  /** numéro de série du contenu : « définition 1 », « exemple 2 »… */
  getContentNumber?: (indices: Indices) => string | undefined;
  /** tracé automatique d'une séance (contrôle des cahiers), indexé par date */
  getSessionAnnotation?: (date?: string) => string | undefined;
  /**
   * Sujet écrit par le professeur, lu par la LIGNE du cahier : la pastille
   * « Document » ne s'affiche que sur un devoir qui a réellement un sujet
   * (voir `notebookDocumentPreviews`). Lecture pure, aucun parcours par rangée.
   */
  getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
  getSessionDocuments?: (date: string) => readonly NotebookDocumentPreview[] | undefined;
  /** ouvre l'aperçu du sujet en lecture seule */
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
  /** terme de recherche actif (surlignage dans les lignes) */
  searchQuery?: string;
  /** rangée à rejoindre automatiquement après une suggestion de séance */
  focusKey?: string | null;
  /** programme officiel proposé lorsque le cahier est encore vide */
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}

const VIRTUALIZATION_THRESHOLD = 140;
const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 16;
/** Référence stable : un `[]` littéral par défaut créait un nouveau tableau à
 *  chaque rendu et invalidait les `useMemo` dont il est une dépendance. */
const NO_DESCRIPTION_TYPES: string[] = [];
const NO_ABSENCES: readonly AbsenceSession[] = [];

const TableHeader: React.FC = React.memo(() => {
  const { t } = useLocale();
  return (
  /* §G : aucun padding externe, les colonnes de l'en-tête restent alignées
     avec celles des rangées. Style épuré inspiré de Google Keep. */
  <div className="border-b border-border/60 bg-muted/30">
    {/* filets verticaux : prolongent ceux des rangées (Date|Contenu|Remarque) */}
    <div className={`grid min-h-9 sm:min-h-11 ${TABLE_GRID_CLASS}`}>
      <div className="flex items-center justify-center border-e border-border/60 px-1 py-1.5 text-center sm:px-2.5 sm:py-2">
        <span className="editor-type-table-side font-sans font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('editor.date')}</span>
      </div>
      <div className="flex items-center justify-center border-e border-border px-2 py-1.5 text-center sm:px-3 sm:py-2">
        <span className="editor-type-table-main font-sans font-bold uppercase tracking-[0.08em] text-foreground">{t('editor.content')}</span>
      </div>
      <div className="flex items-center justify-center px-1 py-1.5 sm:px-2.5 sm:py-2 text-center">
        <span className="editor-type-table-side font-sans font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span className="sr-only sm:not-sr-only">{t('editor.remark')}</span>
          <span className="sm:hidden" aria-hidden="true">{t('editor.remarkShort')}</span>
        </span>
      </div>
    </div>
  </div>
  );
});
TableHeader.displayName = 'TableHeader';


interface SessionGroupRowProps {
    items: FlatDataItem[];
    selectedKeys: ReadonlySet<string>;
    newlyAddedIds: string[];
    editingKey?: string;
    focusKey?: string | null;
    onToggleSelect: (indices: Indices) => void;
    onToggleSelectGroup?: (indices: Indices[]) => void;
    onDoubleClickEdit?: (indices: Indices) => void;
    onOpenDateModal?: (indices: Indices, currentDate?: string) => void;
    onOpenRemark?: (indices: Indices) => void;
    showDescriptions?: boolean;
    descriptionTypes?: string[];
    searchQuery?: string;
    getDateWarnings?: (date: string) => { type: string; message: string }[];
    getDateOrder?: (indices: Indices) => ContentDateOrder | undefined;
    /** numéro de série du contenu : « définition 1 », « exemple 2 »… */
    getContentNumber?: (indices: Indices) => string | undefined;
    /**
     * Annotation de la séance (contrôle des cahiers), par date : elle se lit
     * SOUS la remarque écrite, dans la même cellule — la date de l'activité
     * décide de la séance annotée, pas un identifiant de devoir.
     */
    getSessionAnnotation?: (date?: string) => string | undefined;
    /** sujet écrit par le professeur, par ligne du cahier */
    getDocumentPreview?: (rowKey: string) => NotebookDocumentPreview | undefined;
    getSessionDocuments?: (date: string) => readonly NotebookDocumentPreview[] | undefined;
    onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
}

const SessionGroupRow: React.FC<SessionGroupRowProps> = React.memo(({
    items,
    selectedKeys,
    newlyAddedIds,
    editingKey,
    focusKey,
    onToggleSelect,
    onToggleSelectGroup,
    onDoubleClickEdit,
    onOpenDateModal,
    onOpenRemark,
    showDescriptions,
    descriptionTypes = NO_DESCRIPTION_TYPES,
    searchQuery,
    getDateWarnings,
    getDateOrder,
    getContentNumber,
    getSessionAnnotation,
    getDocumentPreview,
    getSessionDocuments,
    onOpenDocumentPreview,
}) => {
    const { t } = useLocale();
    const mergeContent = items[0].dateMerge?.mergeType === 'content';
    const toggleMerged = () => {
        if (onToggleSelectGroup) {
            onToggleSelectGroup(items.map(item => item.indices));
            return;
        }
        const shouldSelect = !items.every(item => selectedKeys.has(item.key));
        items.forEach(item => {
            if (selectedKeys.has(item.key) !== shouldSelect) onToggleSelect(item.indices);
        });
    };
    const allDates = items.map(it => getMergeableDate(it)).filter(Boolean) as string[];
    const uniqueDates = Array.from(new Set(allDates));
    const warnings = allDates.flatMap(d => (getDateWarnings ? getDateWarnings(d) : []));
    const hasWarning = warnings.length > 0;
    // Une seule source de vérité : le moteur décide si la séance partage sa
    // remarque (voir `sharedRemark`) — plus de comparaison locale, qui
    // éclatait la colonne en une cellule par ligne dès qu'un seul contenu
    // était annoté.
    const sameRemark = !!items[0].dateMerge?.shouldMergeRemark;
    const sharedRemark = items[0].dateMerge?.sharedRemark ?? '';
    // Contrôle des cahiers : la trace de l'activité vit dans la cellule
    // « remarque » de la séance du même jour, sans ajouter la moindre ligne au
    // cahier. Elle n'est écrite qu'UNE fois par date — la première ligne datée
    // la porte — pour ne pas la répéter quand la séance garde une cellule de
    // remarque par contenu.
    const annotationsByDate = new Map<string, string>();
    const annotationOwners = new Map<string, string>();
    for (const item of items) {
      const date = getMergeableDate(item);
      if (!date) continue;
      const text = getSessionAnnotation?.(date);
      if (!text) continue;
      annotationsByDate.set(date, text);
      annotationOwners.set(date, item.key);
    }
    const sessionAnnotations = [...annotationsByDate.values()];
    const groupIsSelected = items.some(item => selectedKeys.has(item.key));
    // Une grille commune garde les traits de contenu et de remarque sur le
    // même axe, même si une remarque ou une description occupe plusieurs lignes.
    const visualRowCount = mergeContent && sameRemark ? 1 : items.length;
    const firstMerge = items[0].dateMerge;
    const lastMerge = items[items.length - 1].dateMerge;

    const dividerClass = groupIsSelected
        ? 'border-e border-e-primary/45'
        : hasWarning
            ? 'border-e border-e-alert/45'
            : 'border-e border-e-border';

    // Separateur INTERNE d'une seance (contenus d'une MEME date) : filet fin
    // POINTILLE, plus discret qu'un trait plein, pour marquer la suite sans
    // couper la seance. Le « ! » final (importance, syntaxe Tailwind v4) est
    // necessaire car `border-b` impose un style plein ; il ne porte que sur
    // le bas, donc le filet vertical `border-e` reste net. Les autres
    // frontieres (bornes de sequence datee, fin de seance) restent pleines.
    const innerLineClass = `${groupIsSelected
        ? 'border-b border-b-primary/25'
        : hasWarning
            ? 'border-b border-b-alert/35'
            : 'border-b border-b-border/50'} [border-bottom-style:dotted]!`;
    const hasAssignedDate = uniqueDates.length > 0;
    const topBoundaryClass = (hasAssignedDate && firstMerge?.isDatedSequenceStart)
        ? (hasWarning ? 'border-t-2 border-t-warning/70' : 'border-t-2 border-t-foreground/30')
        : '';
    // Une seule bordure porte la limite avec la séance suivante : aucun
    // empilement border-bottom + border-top entre deux groupes datés.
    const bottomBoundaryClass = hasAssignedDate
        ? (lastMerge?.isDatedSequenceEnd
            ? (hasWarning ? 'border-b-2 border-b-warning/70' : 'border-b-2 border-b-foreground/30')
            : (hasWarning ? 'border-b border-b-warning/60' : 'border-b border-b-border/70'))
        : (groupIsSelected ? 'border-b border-b-primary/15' : '');

    const renderContent = (item: FlatDataItem, merged: boolean) => {
        const isSelected = merged ? groupIsSelected : selectedKeys.has(item.key);
        const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
        return (
            <TableRow
                data={item.data}
                indices={item.indices}
                elementType={item.elementType}
                dateMerge={item.dateMerge}
                lineClassOverride=""
                layout="content-only"
                onToggleSelect={merged ? toggleMerged : onToggleSelect}
                onDoubleClickEdit={onDoubleClickEdit}
                onOpenRemark={onOpenRemark}
                isSelected={isSelected}
                isNew={isNew}
                isEditing={editingKey === item.key}
                showDescriptions={showDescriptions}
                descriptionTypes={descriptionTypes}
                searchQuery={searchQuery}
                getDateWarnings={getDateWarnings}
                getDateOrder={getDateOrder}
                getContentNumber={getContentNumber}
                getDocumentPreview={getDocumentPreview}
                onOpenDocumentPreview={onOpenDocumentPreview}
            />
        );
    };

    return (
        <div
            data-session-group="true"
            className={[
                `group relative grid ${TABLE_GRID_CLASS} transition-colors duration-200`,
                topBoundaryClass,
                bottomBoundaryClass,
                hasWarning
                    ? 'bg-alert/[0.07]'
                    : 'bg-card',
                // La séance garde la surface de la carte : l’accent ne teinte que
                // les lignes visées, ce qui les rend d’autant plus lisibles.
            ].filter(Boolean).join(' ')}
            style={{ gridTemplateRows: `repeat(${visualRowCount}, minmax(52px, auto))` }}
        >
            <button
                type="button"
                data-session-cell="date"
                className={`flex min-h-[52px] min-w-0 items-center justify-center self-stretch px-1 py-1 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary hover:bg-primary/5 active:bg-primary/10 transition-colors ${dividerClass} ${hasWarning ? 'bg-warning/10' : (hasAssignedDate ? 'bg-muted/10' : 'bg-transparent')}`}
                style={{ gridColumn: 1, gridRow: `1 / span ${visualRowCount}` }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenDateModal && items[0]) {
                        onOpenDateModal(items[0].indices, typeof items[0].data?.date === 'string' ? items[0].data.date : undefined);
                    }
                }}
                title={t('selection.chooseDate')}
                aria-label={t('selection.chooseDate')}
                disabled={!onOpenDateModal}
            >
                {uniqueDates.length > 1 ? (
                    <MultiDateCard dates={uniqueDates} hasWarning={hasWarning} />
                ) : (
                    <DateCard dateStr={uniqueDates[0]} hasWarning={hasWarning} />
                )}
            </button>

            {mergeContent ? (
                <div
                    data-session-cell="content"
                    data-focus-key={items.some(item => item.key === focusKey) ? focusKey : undefined}
                    className={`min-w-0 self-stretch ${dividerClass} flex flex-col justify-center [&>div]:w-full`}
                    style={{ gridColumn: 2, gridRow: `1 / span ${visualRowCount}` }}
                >
                    {renderContent(items[0], true)}
                </div>
            ) : items.map((item, index) => (
                <div
                    key={`content-${item.key}`}
                    data-session-cell="content"
                    data-focus-key={item.key === focusKey ? focusKey : undefined}
                    data-session-row-divider={index < items.length - 1 ? 'true' : undefined}
                    className={`min-w-0 self-stretch ${dividerClass} ${index < items.length - 1 ? innerLineClass : ''}`}
                    style={{ gridColumn: 2, gridRow: index + 1 }}
                >
                    {renderContent(item, false)}
                </div>
            ))}

            {sameRemark ? (
                <div
                    data-session-cell="remark"
                    className={`flex flex-col min-w-0 self-stretch p-0.5 sm:p-1 ${hasWarning ? 'bg-alert/[0.055]' : 'bg-transparent'}`}
                    style={{ gridColumn: 3, gridRow: `1 / span ${visualRowCount}` }}
                    onClick={event => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => onOpenRemark?.(items[0].indices)}
                        title={t('remark.editTitle')}
                        aria-label={t('remark.editTitle')}
                        data-remark-cell="true"
                        className="flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-start transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <span dir={textDirectionAttribute(sharedRemark)} className="editor-type-remark w-full whitespace-pre-wrap break-words font-semibold leading-snug text-foreground/80">{sharedRemark || '—'}</span>
                        {sessionAnnotations.map(annotation => (
                          <span
                            key={annotation}
                            data-session-annotation="true"
                            dir={textDirectionAttribute(annotation)}
                            title={annotation}
                            className="mt-0.5 block w-full whitespace-pre-line break-words text-start rounded-md bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-primary"
                          >
                            {annotation}
                          </span>
                        ))}
                    </button>
                    <SessionDocuments documents={uniqueDates.flatMap(date => getSessionDocuments?.(date) ?? [])} onOpen={onOpenDocumentPreview}/>
                </div>
            ) : items.map((item, index) => (
                <div
                    key={`remark-${item.key}`}
                    data-session-cell="remark"
                    data-session-row-divider={index < items.length - 1 ? 'true' : undefined}
                    className={`flex flex-col min-w-0 self-stretch p-0.5 sm:p-1 ${index < items.length - 1 ? innerLineClass : ''} ${hasWarning ? 'bg-alert/[0.055]' : 'bg-transparent'}`}
                    style={{ gridColumn: 3, gridRow: index + 1 }}
                    onClick={event => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => onOpenRemark?.(item.indices)}
                        title={t('remark.editTitle')}
                        aria-label={t('remark.editTitle')}
                        data-remark-cell="true"
                        className="min-h-11 w-full cursor-pointer rounded-lg text-start transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <div dir={textDirectionAttribute(getMergeableRemark(item))} className="editor-type-remark h-full w-full whitespace-pre-wrap break-words p-0.5 font-semibold text-muted-foreground sm:p-1">{getMergeableRemark(item)}</div>
                        {(() => {
                          const date = getMergeableDate(item);
                          const annotation = date && annotationOwners.get(date) === item.key
                            ? annotationsByDate.get(date)
                            : undefined;
                          return annotation ? (
                            <span
                              data-session-annotation="true"
                              dir={textDirectionAttribute(annotation)}
                              title={annotation}
                              className="mt-0.5 block w-full whitespace-pre-line break-words text-start rounded-md bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-primary"
                            >
                              {annotation}
                            </span>
                          ) : null;
                        })()}
                    </button>
                    <SessionDocuments documents={getMergeableDate(item) && annotationOwners.get(getMergeableDate(item)!) === item.key
                      ? getSessionDocuments?.(getMergeableDate(item)!) : undefined} onOpen={onOpenDocumentPreview}/>
                </div>
            ))}
        </div>
    );
}, (previous, next) => {
    if (previous.items !== next.items || previous.onToggleSelect !== next.onToggleSelect
        || previous.onToggleSelectGroup !== next.onToggleSelectGroup
        || previous.editingKey !== next.editingKey
        || previous.focusKey !== next.focusKey
        || previous.onDoubleClickEdit !== next.onDoubleClickEdit || previous.onOpenDateModal !== next.onOpenDateModal
        || previous.onOpenRemark !== next.onOpenRemark || previous.showDescriptions !== next.showDescriptions
        || previous.descriptionTypes !== next.descriptionTypes || previous.searchQuery !== next.searchQuery
        || previous.getDateWarnings !== next.getDateWarnings || previous.getDateOrder !== next.getDateOrder
        || previous.getContentNumber !== next.getContentNumber || previous.newlyAddedIds !== next.newlyAddedIds
        || previous.getSessionAnnotation !== next.getSessionAnnotation
        || previous.getDocumentPreview !== next.getDocumentPreview
        || previous.getSessionDocuments !== next.getSessionDocuments
        || previous.onOpenDocumentPreview !== next.onOpenDocumentPreview) return false;
    return previous.items.every(item => previous.selectedKeys.has(item.key) === next.selectedKeys.has(item.key));
});

SessionGroupRow.displayName = 'SessionGroupRow';

/* État vide réinventé selon le design system éditorial chaud & épuré avec illustration dynamique. */
const EmptyState: React.FC<{
  onOpenAddContentModal: (indices?: Indices) => void;
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}> = ({ onOpenAddContentModal, predefinedProgramTitle, onLoadPredefined }) => {
    const { t, locale } = useLocale();
    const canLoadPredefined = Boolean(predefinedProgramTitle && onLoadPredefined);
    const reduceMotion = useReducedMotion();
    const Illustration = canLoadPredefined ? CurriculumImportIllustration : ProudTeacherIllustration;

    return (
        <section className="flex justify-center py-6 sm:py-10">
            <div className="w-full max-w-[460px]">
                {/* Surface principale */}
                <div className="flex flex-col items-center px-7 pt-7 pb-8 text-center sm:px-9 sm:pt-9 sm:pb-9">
                    {/* Illustration vectorielle vivante avec micro-mouvement de respiration */}
                    <Illustration size={152} className="mb-3" />

                    {/* Titre 21px bold */}
                    <h2 className="mt-2 text-[21px] font-bold tracking-tight text-foreground">
                        {t('emptyNotebook.label')}
                    </h2>

                    {/* Description 14.5px (uniquement si programme officiel disponible) */}
                    {canLoadPredefined && (
                        <p className="mt-2.5 max-w-[380px] text-[14.5px] font-normal leading-[1.65] text-muted-foreground">
                            {t('emptyNotebook.programAvailable')}
                        </p>
                    )}

                    {/* Boutons d'action avec physique de ressort (Spring physics) */}
                    <div className="mt-6 flex w-full flex-col gap-2.5">
                        {canLoadPredefined && (
                            <motion.button
                                type="button"
                                whileHover={reduceMotion ? undefined : { y: -2 }}
                                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                                onClick={onLoadPredefined}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-primary-foreground shadow-xs transition-colors hover:brightness-110 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
                            >
                                {t('emptyNotebook.importProgram')}
                            </motion.button>
                        )}
                        <motion.button
                            type="button"
                            whileHover={reduceMotion ? undefined : { y: -2 }}
                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            onClick={() => onOpenAddContentModal()}
                            className={`flex h-12 w-full items-center justify-center rounded-xl text-[14.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer ${
                                canLoadPredefined
                                    ? 'border border-border bg-transparent text-foreground hover:bg-muted'
                                    : 'bg-primary text-primary-foreground hover:brightness-110 shadow-xs'
                            }`}
                        >
                            {t('emptyNotebook.createChapter')}
                        </motion.button>
                    </div>
                </div>

                {/* Surface secondaire : assistance WhatsApp */}
                <SupportWhatsAppBlock
                    locale={locale}
                    hint={t('support.serviceHint')}
                    label={t('support.serviceWhatsApp')}
                />
            </div>
        </section>
    );
};

export const MainTable: React.FC<MainTableProps> = React.memo(({
  lessonsData,
  visibleRows,
  absenceSessions = NO_ABSENCES,
  onClearSearch,
  contentDirection,
  onOpenAddContentModal,
  showDescriptions,
  descriptionTypes = NO_DESCRIPTION_TYPES,
  selectedKeys,
  onToggleSelect,
  onToggleSelectGroup,
  newlyAddedIds,
  editingKey,
  onOpenContentEditor,
  onOpenDateModal,
  onOpenRemark,
  getDateWarnings,
  getDateOrder,
  getContentNumber,
  getSessionAnnotation,
  getDocumentPreview,
  getSessionDocuments,
  onOpenDocumentPreview,
  searchQuery,
  focusKey,
  predefinedProgramTitle,
  onLoadPredefined,
}) => {
  const { t } = useLocale();
  const { flatData, renderRows: courseRows } = useMemo(() => groupRowsWithAbsences(hasOnlyPristineStarterDiagnostic(lessonsData) ? [] : visibleRows, absenceSessions), [visibleRows, absenceSessions, lessonsData]);
  const renderRows = useMemo(() => {
    const query = searchQuery?.trim().toLocaleLowerCase();
    const sessions = query ? absenceSessions.filter(session =>
      [session.date, formatDateDDMMYYYY(session.date) ?? session.date, t('notifications.absenceCertificate'), ...session.reasons]
        .some(text => text.toLocaleLowerCase().includes(query))) : absenceSessions;
    return withAbsenceRows(courseRows, sessions, row =>
      (row.kind === 'single' ? [row.item] : row.items).map(item => getMergeableDate(item)).filter((date): date is string => !!date));
  }, [courseRows, absenceSessions, searchQuery, t]);

  const measurementIds = useRef(new WeakMap<object, number>());
  const nextMeasurementId = useRef(0);
  const itemKeys = useMemo(() => renderRows.map(row => {
    if (row.kind === 'absence') return row.key + ':' + JSON.stringify(row.sessions) + ':' + contentDirection;
    const items = row.kind === 'single' ? [row.item] : row.items;
    return items.map(item => {
      let id = measurementIds.current.get(item.data);
      if (id === undefined) {
        id = ++nextMeasurementId.current;
        measurementIds.current.set(item.data, id);
      }
      return id;
    }).join(':') + ':' + contentDirection + ':' + showDescriptions + ':' + descriptionTypes.join(',');
  }), [renderRows, contentDirection, showDescriptions, descriptionTypes]);
  const shouldVirtualize = flatData.length > VIRTUALIZATION_THRESHOLD;
  const focusIndex = useMemo(() => focusKey ? renderRows.findIndex(row => row.kind !== 'absence' && (
    row.kind === 'single' ? row.item.key === focusKey : row.items.some(item => item.key === focusKey)
  )) : -1, [focusKey, renderRows]);
  const keepIndices = useMemo(() => focusIndex < 0 ? [] : [focusIndex], [focusIndex]);
  const estimateSizes = useMemo(() => renderRows.map(row =>
    row.kind === 'absence' ? Math.max(ESTIMATED_ROW_HEIGHT, row.sessions.length * 24, absenceRemarkGroups(row.sessions).length * 52) :
    (row.kind === 'session' && !(row.items[0].dateMerge?.mergeType === 'content'
      && row.items[0].dateMerge?.shouldMergeRemark) ? row.items.length : 1) * ESTIMATED_ROW_HEIGHT
  ), [renderRows]);
  const { scrollRef, scrollToIndex, totalSize, virtualItems, measureElement, renderedCount } = useWindowVirtualizer({
    count: renderRows.length,
    itemKeys,
    enabled: shouldVirtualize,
    estimateSize: ESTIMATED_ROW_HEIGHT,
    estimateSizes,
    overscan: VIRTUAL_OVERSCAN,
    keepIndices,
  });

  useEffect(() => {
    if (!focusKey) return;

    if (focusIndex < 0) return;

    const scrollNearTarget = () => { if (shouldVirtualize) scrollToIndex(focusIndex); };

    const refineToRenderedRow = () => {
        const row = Array.from(scrollRef.current?.querySelectorAll<HTMLElement>('[data-focus-key]') ?? [])
            .find(element => element.dataset.focusKey === focusKey);
        row?.scrollIntoView({ block: 'center', behavior: 'instant', inline: 'nearest' });
    };

    const frame = window.requestAnimationFrame(scrollNearTarget);
    let refineTimer = window.setTimeout(refineToRenderedRow, shouldVirtualize ? 100 : 0);
    // Measured virtual rows and fonts can change the offsets after the first
    // jump. Refine once geometry settles, until the temporary focus expires.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      window.clearTimeout(refineTimer);
      refineTimer = window.setTimeout(refineToRenderedRow, 50);
    });
    if (scrollRef.current) observer?.observe(scrollRef.current);
    const stopPlacement = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(refineTimer);
      observer?.disconnect();
    };
    const gestures = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    gestures.forEach(event => window.addEventListener(event, stopPlacement, { passive: true, once: true }));
    return () => {
        stopPlacement();
        gestures.forEach(event => window.removeEventListener(event, stopPlacement));
    };
  }, [focusKey, focusIndex, scrollRef, scrollToIndex, shouldVirtualize]);

  useEffect(() => {
    logger.debug('MainTable profile', {
      totalRowsInMemory: flatData.length,
      renderedLogicalRows: renderRows.length,
      renderedRows: renderedCount,
      virtualized: shouldVirtualize,
      virtualWindow: shouldVirtualize && virtualItems.length > 0 ? `${virtualItems[0].index}-${virtualItems[virtualItems.length - 1].index}` : 'full',
      measuredCanvasHeight: shouldVirtualize ? Math.round(totalSize) : renderRows.length * ESTIMATED_ROW_HEIGHT,
      estimatedRowsSkipped: shouldVirtualize ? Math.max(0, renderRows.length - renderedCount) : 0,
      estimatedDomReductionPercent: shouldVirtualize
        ? Math.round((1 - renderedCount / Math.max(1, renderRows.length)) * 100)
        : 0,
    });
  }, [flatData.length, renderRows.length, renderedCount, shouldVirtualize, totalSize, virtualItems]);

  if ((!lessonsData || lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData)) && absenceSessions.length === 0) {
      return (
          <div dir={contentDirection} data-content-direction={contentDirection}>
              <EmptyState
                  onOpenAddContentModal={onOpenAddContentModal}
                  predefinedProgramTitle={predefinedProgramTitle}
                  onLoadPredefined={onLoadPredefined}
              />
          </div>
      );
  }

  if (renderRows.length === 0 && searchQuery?.trim()) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" dir={contentDirection}>
        <LessonSearchIllustration size={120} className="mx-auto mb-3" />
        <p className="mb-4 text-muted-foreground">{t('print.noContent')}</p>
        <Button variant="outline" onClick={onClearSearch}>{t('toolbar.clearSearch')}</Button>
      </div>
    );
  }

  return (
    <Card
      data-editor-table
      data-content-direction={contentDirection}
      dir={contentDirection}
      className="rtl-table mx-0 overflow-clip rounded-lg border-2 border-border/80 dark:border-border/90 bg-card shadow-xs transition-shadow duration-200 print:border-none"
    >
      <TableHeader />
      <CardContent className="!p-0">
        <div ref={scrollRef} className="relative" style={shouldVirtualize ? { height: totalSize, overflowAnchor: 'none' } : undefined}>
          {(() => {
              const rows: Array<{ row: RenderRow | AbsenceDisplayRow; virtualItem?: VirtualItem; absoluteIndex: number }> = shouldVirtualize
                ? virtualItems.map(virtualItem => ({ row: renderRows[virtualItem.index], virtualItem, absoluteIndex: virtualItem.index })).filter(entry => !!entry.row)
                : renderRows.map((row, absoluteIndex) => ({ row, absoluteIndex }));

              return rows.map(({ row, virtualItem, absoluteIndex }) => {
                  if (row.kind === 'absence') {
                    const dates = row.sessions.map(session => session.date);
                    const remarks = absenceRemarkGroups(row.sessions);
                    return (
                      <VirtualListRow key={row.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement}>
                          <div data-absence-session={row.session.date} data-absence-dates={dates.join(',')} className={`grid min-h-14 border-b border-border bg-muted/20 ${TABLE_GRID_CLASS}`}>
                              <div title={dates.map(date => formatDateDDMMYYYY(date) ?? date).join(' · ')} className="flex min-w-0 items-center justify-center border-e border-border px-1 py-3 text-center editor-type-table-side"><MultiDateCard dates={dates} /></div>
                              <div className="flex items-center justify-center text-center border-e border-border px-3 py-3 font-medium editor-type-table-main">{t('notifications.absenceCertificate')}</div>
                              <div className="flex min-w-0 flex-col justify-center gap-2 whitespace-pre-wrap break-words px-2 py-3 text-muted-foreground editor-type-remark">
                                  {remarks.map(remark => <div key={remark.dates[0]} dir={textDirectionAttribute(remark.reasons.join(' · '))}>
                                      {remarks.length > 1 && <div className="mb-1 text-xs font-medium tabular-nums">{remark.dates.map(date => <bdi key={date} dir="ltr" title={formatDateDDMMYYYY(date) ?? date} className="inline-block max-w-full me-1">
                                          <span className="sm:hidden">{formatDateDDMMYYYY(date)?.slice(0, 5)}</span><span className="hidden sm:inline">{formatDateDDMMYYYY(date)}</span>
                                      </bdi>)}</div>}
                                      {remark.reasons.join(' · ')}
                                  </div>)}
                              </div>
                          </div>
                      </VirtualListRow>
                    );
                  }
                  if (row.kind === 'session') {
                      const rowFocusKey = row.items.some(item => item.key === focusKey) ? focusKey : undefined;
                      return (
                          <VirtualListRow key={row.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} className={rowFocusKey ? 'action-source-highlight' : undefined}>
                              <SessionGroupRow
                                  items={row.items}
                                  selectedKeys={selectedKeys}
                                  newlyAddedIds={newlyAddedIds}
                                  editingKey={editingKey}
                                  focusKey={rowFocusKey}
                                  onToggleSelect={onToggleSelect}
                                  onToggleSelectGroup={onToggleSelectGroup}
                                  onDoubleClickEdit={onOpenContentEditor}
                                  onOpenDateModal={onOpenDateModal}
                                  onOpenRemark={onOpenRemark}
                                  showDescriptions={showDescriptions}
                                  descriptionTypes={descriptionTypes}
                                  searchQuery={searchQuery}
                                  getDateWarnings={getDateWarnings}
                                  getDateOrder={getDateOrder}
                                  getContentNumber={getContentNumber}
                                  getSessionAnnotation={getSessionAnnotation}
                                  getDocumentPreview={getDocumentPreview}
                                  getSessionDocuments={getSessionDocuments}
                                  onOpenDocumentPreview={onOpenDocumentPreview}
                              />
                          </VirtualListRow>
                      );
                  }

                  const { item } = row;
                  const itemDate = getMergeableDate(item);

                  const isSelected = selectedKeys.has(item.key);
                  const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));

                  return (
                      <VirtualListRow key={item.key} index={absoluteIndex} measurementKey={itemKeys[absoluteIndex]} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
                          <TableRow
                              data={item.data}
                              indices={item.indices}
                              elementType={item.elementType}
                              dateMerge={item.dateMerge}
                              onToggleSelect={onToggleSelect}
                              onDoubleClickEdit={onOpenContentEditor}
                              onOpenDateModal={onOpenDateModal}
                              onOpenRemark={onOpenRemark}
                              isSelected={isSelected}
                              isNew={isNew}
                              isEditing={editingKey === item.key}
                              showDescriptions={showDescriptions}
                              descriptionTypes={descriptionTypes}
                              searchQuery={searchQuery}
                              getDateWarnings={getDateWarnings}
                              getDateOrder={getDateOrder}
                              getContentNumber={getContentNumber}
                              getDocumentPreview={getDocumentPreview}
                              onOpenDocumentPreview={onOpenDocumentPreview}
                              sessionAnnotation={itemDate ? getSessionAnnotation?.(itemDate) : undefined}
                              sessionDocuments={itemDate ? getSessionDocuments?.(itemDate) : undefined}
                          />
                      </VirtualListRow>
                  );
              });
          })()}
        </div>
        {(lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData)) && (
          <div className="border-t border-border p-3"><Button variant="outline" className="min-h-11 w-full" onClick={() => onOpenAddContentModal()}>{t('emptyNotebook.createChapter')}</Button></div>
        )}
      </CardContent>
    </Card>
  );
});
MainTable.displayName = 'MainTable';

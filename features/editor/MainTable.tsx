import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LessonsData, Indices, Section, SubSection, SubSubSection, LessonItem, ElementType, Separator, TopLevelItem, EmbeddableTopLevelItem, ContentDirection } from '@/types';
import { DateCard, DateMergeMeta, TableRow } from './TableRow';
import { SeparatorRow } from './SeparatorRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EditableCell } from '@/components/ui/EditableCell';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP, getContentTypesForSubject } from '@/constants';
import { logger } from '@/utils/logger';
import { useWindowVirtualizer, VirtualListRow, type VirtualItem } from '@/components/ui/virtual-list';
import { useDevice } from '@/hooks/useDevice';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

const TABLE_GRID_COLUMNS = 'minmax(8.5rem, 13%) minmax(0, 1fr) minmax(9.5rem, 16%)';
const TABLE_GRID_CLASS = 'grid-cols-[19%_1fr] md:grid-cols-[var(--cdt-table-cols)]';

interface InlineEditRowProps {
    data: LessonItem;
    onSave: (updatedData: Partial<LessonItem>) => void;
    onCancel: () => void;
    accentColor?: string;
    /** matière de la classe : restreint les types de contenu proposés */
    subject?: string;
    /** garde intelligente : alertes live sur la date saisie (emploi du temps, fériés, vacances, absences) */
    getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const ALL_LESSON_TYPE_OPTIONS = [...new Set(Object.values(TYPE_MAP))].sort((a, b) => a.localeCompare(b));

const resolveLessonTypeOptions = (subject: string | undefined, currentType: string | undefined): string[] => {
    const base = subject ? getContentTypesForSubject(subject) : ALL_LESSON_TYPE_OPTIONS;
    const set = new Set<string>(base);
    // garde l'ancien type visible même s'il n'appartient pas au domaine courant
    if (currentType && !set.has(currentType)) set.add(currentType);
    return [...set].sort((a, b) => a.localeCompare(b));
};

const EDITABLE_FIELDS = ['date', 'type', 'number', 'page', 'title', 'description', 'remark'] as const;

const InlineEditRow: React.FC<InlineEditRowProps> = ({ data, onSave, onCancel, subject, getDateWarnings }) => {
    const { t } = useLocale();
    const device = useDevice();
    const [formData, setFormData] = useState<Partial<LessonItem>>(data);
    const titleRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLFormElement>(null);
    const isCompact = device.type === 'phone' && device.isPortrait;

    useEffect(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
        // garde le formulaire visible même s'il était en bord de fenêtre
        rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    // Détection de modification : annuler/enregistrer sans changement ne
    // pollue pas l'historique undo/redo ni la file de synchronisation.
    const isDirty = React.useMemo(
        () => EDITABLE_FIELDS.some(field => (formData[field] ?? '') !== ((data as any)[field] ?? '')),
        [formData, data]
    );

    // Alertes intelligentes recalculées quand la date change dans le formulaire.
    const dateWarnings = React.useMemo(
        () => (getDateWarnings && formData.date && formData.date !== data.date ? getDateWarnings(formData.date) : []),
        [getDateWarnings, formData.date, data.date]
    );

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSave = (e: React.MouseEvent | React.FormEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isDirty) {
            onCancel(); // rien n'a changé : fermeture propre, zéro écriture
            return;
        }
        onSave(formData);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCancel();
    };

    return (
        <form
            ref={rootRef}
            className={cn(
                'mx-0 my-0 grid gap-2 bg-transparent px-0 py-1 animate-fade-in duration-200',
                isCompact ? 'grid-cols-1' : 'sm:grid-cols-[minmax(6rem,auto)_1fr] md:grid-cols-[minmax(7rem,0.18fr)_1fr_minmax(8rem,0.18fr)]',
            )}
            onSubmit={handleSave}
            onClick={e => e.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === 'Escape') onCancel();
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onSave(event);
            }}
        >
            <div className="flex flex-row items-center justify-center gap-1.5 sm:flex-col sm:justify-start sm:pt-1">
                <Input type="date" name="date" value={formData.date || ''} onChange={handleChange} className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-muted/60 px-2 text-center text-xs text-foreground focus:bg-muted focus:ring-2 focus:ring-primary/30 font-mono sm:h-10 sm:w-full sm:text-sm" />
                {formData.date && (
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, date: '' }))}
                        className="shrink-0 text-[9px] font-semibold text-muted-foreground/60 hover:text-destructive transition-colors"
                    >
                        {t('editor.unassignDate')}
                    </button>
                )}
            </div>
            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:grid sm:grid-cols-[1fr_0.6fr_0.7fr] sm:gap-2">
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
                      <SelectTrigger className="h-9 flex-1 rounded-lg border-0 bg-muted/60 text-xs text-foreground focus:bg-muted focus:ring-2 focus:ring-primary/30 sm:h-10 sm:text-sm">
                        <SelectValue placeholder={t('editor.type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {resolveLessonTypeOptions(subject, formData.type as string | undefined).map(type => <SelectItem key={type} value={type}>{t(`contentType.${type}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="text" name="number" value={formData.number || ''} onChange={handleChange} placeholder="N°" className="h-9 rounded-lg border-0 bg-muted/60 px-2 text-xs text-foreground placeholder-muted-foreground/50 focus:bg-muted focus:ring-2 focus:ring-primary/30 sm:h-10 sm:text-sm" />
                    <Input type="text" name="page" value={formData.page || ''} onChange={handleChange} placeholder={t('editor.page')} className="h-9 rounded-lg border-0 bg-muted/60 px-2 text-xs text-foreground placeholder-muted-foreground/50 focus:bg-muted focus:ring-2 focus:ring-primary/30 sm:h-10 sm:text-sm" />
                </div>
                <Input ref={titleRef} type="text" name="title" value={formData.title || ''} onChange={handleChange} placeholder={t('editor.title')} className="h-9 rounded-lg border-0 bg-muted/60 px-2.5 text-xs font-bold text-foreground placeholder-muted-foreground/50 focus:bg-muted focus:ring-2 focus:ring-primary/30 sm:h-10 sm:text-sm" />
                <Textarea name="description" rows={2} value={formData.description || ''} onChange={handleChange} className="min-h-14 resize-y rounded-lg border-0 bg-muted/60 px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground/50 focus:bg-muted focus:ring-2 focus:ring-primary/30 sm:text-sm" placeholder={t('editor.description')} />

                {/* Garde intelligente : conflits de date affichés dans le formulaire */}
                {dateWarnings.length > 0 && (
                    <div className="space-y-0.5 rounded-lg border border-warning/25 bg-warning/10 px-2.5 py-1.5" role="status">
                        {dateWarnings.map((warning, i) => (
                            <p key={i} className="text-[11px] font-semibold leading-snug text-warning-strong">⚠ {warning.message}</p>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground/70">
                    <span className="hidden items-center gap-1.5 sm:inline-flex font-medium">
                        <kbd className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Esc</kbd> {t('common.cancel')}
                        <kbd className="ms-2 rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘+↵</kbd> {t('toolbar.save')}
                    </span>
                    <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
                        <Button type="button" onClick={handleCancel} variant="secondary" size="sm" className="min-h-10">{t('common.cancel')}</Button>
                        <Button type="submit" variant="default" size="sm" className="min-h-10" disabled={!isDirty}>
                            {isDirty ? t('common.save') : t('common.noChanges')}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex min-w-0 items-stretch">
                <Textarea name="remark" rows={2} value={formData.remark || ''} onChange={handleChange} className="h-full min-h-14 resize-y rounded-lg border-0 bg-muted/60 px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground/50 focus:bg-muted focus:ring-2 focus:ring-primary/30 sm:text-sm" placeholder={t('editor.remark')} />
            </div>
        </form>
    );
};

interface MainTableProps {
  lessonsData: LessonsData;
  /** Sens de lecture du cahier importé, indépendant de l'interface générale. */
  contentDirection: ContentDirection;
  /** matière de la classe : restreint les types de contenu proposés */
  subject?: string;
  onCellUpdate: (indices: Indices, field: string, value: any) => void;
  onDeleteSeparator: (indices: Indices) => void;
  onOpenAddContentModal: (indices?: Indices) => void;
  showDescriptions?: boolean;
  descriptionTypes?: string[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (indices: Indices) => void;
  editingIndices: Indices | null;
  onInitiateInlineEdit: (indices: Indices) => void;
  onConfirmInlineEdit: (indices: Indices, updatedData: Partial<LessonItem>) => void;
  onCancelInlineEdit: () => void;
  newlyAddedIds: string[];
  /** garde intelligente : alertes live sur la date saisie */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** terme de recherche actif (surlignage dans les lignes) */
  searchQuery?: string;
  /** rangée à rejoindre automatiquement après une suggestion de séance */
  focusKey?: string | null;
  /** programme officiel proposé lorsque le cahier est encore vide */
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}

interface FlatDataItem {
    data: TopLevelItem | Section | SubSection | SubSubSection | LessonItem | Separator | EmbeddableTopLevelItem;
    indices: Indices;
    elementType: ElementType;
    key: string;
    dateMerge?: DateMergeMeta;
}

type RenderRow =
    | { kind: 'single'; item: FlatDataItem; key: string; flatIndex: number }
    | { kind: 'session'; items: FlatDataItem[]; key: string; flatIndex: number };


const VIRTUALIZATION_THRESHOLD = 140;
const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 16;

const TableHeader: React.FC = React.memo(() => {
  const { t } = useLocale();
  return (
  /* §G : aucun padding externe, les colonnes de l'en-tête restent alignées
     avec celles des rangées (elles aussi sans padding de cadre). En-tête
     de colonnes NON collant : il défile avec le tableau (seule la barre
     d'outils reste épinglée en haut). */
  <div className="hidden border-b border-border/80 bg-card/[0.52] backdrop-blur-xl dark:bg-slate-950/[0.42] md:block">
    {/* filets verticaux : prolongent ceux des rangées (Date|Contenu|Remarque) */}
    <div className={`grid min-h-12 ${TABLE_GRID_CLASS}`}>
      <div className="flex items-center justify-center border-e border-border/80 px-2.5 py-2.5 text-center">
        <span className="font-sans text-xs text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground dark:text-muted-foreground">{t('editor.date')}</span>
      </div>
      <div className="flex items-center justify-center border-e border-border/80 px-3 py-2.5 text-center">
        <span className="font-sans text-xs text-[11px] font-black uppercase tracking-[0.08em] text-foreground dark:text-slate-300">{t('editor.content')}</span>
      </div>
      <div className="flex items-center justify-center px-2.5 py-2.5 text-center">
        <span className="font-sans text-xs text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground dark:text-muted-foreground">{t('editor.remark')}</span>
      </div>
    </div>
  </div>
  );
});
TableHeader.displayName = 'TableHeader';

const makeKey = (idx: Indices): string =>
    `${idx.chapterIndex}|${idx.sectionIndex ?? ''}|${idx.subsectionIndex ?? ''}|${idx.subsubsectionIndex ?? ''}|${idx.itemIndex ?? ''}|${idx.isSeparator ? 1 : 0}`;

const getMergeableDate = (item: FlatDataItem): string | null => {
    if (item.elementType === 'separator') return null;
    const date = (item.data as any).date;
    return typeof date === 'string' && date.trim() ? date.trim() : null;
};

const getMergeableRemark = (item: FlatDataItem): string => {
    const remark = (item.data as any).remark;
    return typeof remark === 'string' ? remark.trim() : '';
};

const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
    let start = 0;

    while (start < items.length) {
        const date = getMergeableDate(items[start]);
        if (!date) {
            start += 1;
            continue;
        }

        let end = start + 1;
        while (end < items.length && getMergeableDate(items[end]) === date) {
            end += 1;
        }

        const count = end - start;
        const group = items.slice(start, end);
        const firstRemark = getMergeableRemark(group[0]);
        const shouldMergeRemark = count > 1 && group.every(item => getMergeableRemark(item) === firstRemark);

        for (let index = start; index < end; index += 1) {
            items[index].dateMerge = {
                isMerged: count > 1,
                isStart: index === start,
                isContinuation: index !== start,
                isEnd: index === end - 1,
                count,
                indexInGroup: index - start,
                shouldMergeRemark,
            };
        }

        start = end;
    }

    return items;
};

interface SessionGroupRowProps {
    items: FlatDataItem[];
    selectedKeys: ReadonlySet<string>;
    newlyAddedIds: string[];
    onCellUpdate: (indices: Indices, field: string, value: any) => void;
    onToggleSelect: (indices: Indices) => void;
    onDoubleClickEdit?: (indices: Indices) => void;
    showDescriptions?: boolean;
    descriptionTypes?: string[];
    searchQuery?: string;
    getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const SessionGroupRow: React.FC<SessionGroupRowProps> = ({
    items,
    selectedKeys,
    newlyAddedIds,
    onCellUpdate,
    onToggleSelect,
    onDoubleClickEdit,
    showDescriptions,
    descriptionTypes = [],
    searchQuery,
    getDateWarnings,
}) => {
    const first = items[0];
    const date = getMergeableDate(first) ?? '';
    const warnings = date && getDateWarnings ? getDateWarnings(date) : [];
    const hasWarning = warnings.length > 0;
    const sameRemark = items.every(item => getMergeableRemark(item) === getMergeableRemark(first));
    const groupIsSelected = items.some(item => selectedKeys.has(item.key));
    const sharedRemark = getMergeableRemark(first);
    // Les groupes fusionnés ont leur propre grille : les filets de TableRow
    // ne peuvent pas dessiner les séparateurs Date|Contenu|Remarque ici.
    // On les porte donc sur les deux premières colonnes, avec la même force
    // visuelle que les rangées simples.
    const dividerClass = groupIsSelected
        ? 'border-e border-primary/45'
        : hasWarning
            ? 'border-e border-warning/45'
            : 'border-e border-border/90';

    const saveSharedRemark = (value: string) => {
        items.forEach(item => onCellUpdate(item.indices, 'remark', value));
    };

    return (
        <div
            className={[
                `group relative grid ${TABLE_GRID_CLASS} border-y border-border/70 transition-colors duration-200`,
                hasWarning
                    ? 'border-warning/[0.5] bg-warning/[0.07]'
                    : 'bg-card/[0.18] dark:bg-slate-950/[0.14]',
                groupIsSelected ? 'bg-primary/[0.085]' : '',
            ].filter(Boolean).join(' ')}
        >
            {/* Rail latéral supprimé selon la demande */}

        <div className={`flex min-h-[56px] min-w-0 items-center justify-center self-stretch px-1.5 py-1 ${dividerClass} ${hasWarning ? 'bg-warning/10' : 'bg-card/[0.32] dark:bg-slate-950/[0.25]'}`}>
                <DateCard dateStr={date} hasWarning={hasWarning} />
            </div>

            <div className={`min-w-0 self-stretch ${dividerClass}`}>
                {items.map(item => {
                    const isSelected = selectedKeys.has(item.key);
                    const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                    // Le groupe fusionné porte le seul contour horizontal ; les lignes
                    // enfants ne doivent pas redessiner un cadre imbriqué dans le contenu.
                    return (
                        <TableRow
                            key={item.key}
                            data={item.data}
                            indices={item.indices}
                            elementType={item.elementType}
                            dateMerge={item.dateMerge}
                            lineClassOverride=""
                            layout="content-only"
                            onCellUpdate={onCellUpdate}
                            onToggleSelect={onToggleSelect}
                            onDoubleClickEdit={onDoubleClickEdit}
                            isSelected={isSelected}
                            isNew={isNew}
                            showDescriptions={showDescriptions}
                            descriptionTypes={descriptionTypes}
                            searchQuery={searchQuery}
                            getDateWarnings={getDateWarnings}
                        />
                    );
                })}
            </div>

            <div className={`hidden min-w-0 self-stretch p-1 md:flex ${hasWarning ? 'bg-warning/[0.055]' : 'bg-card/[0.28] dark:bg-slate-950/[0.18]'}`} onClick={event => event.stopPropagation()}>
                {sameRemark ? (
                    <div className="flex min-h-full w-full flex-col justify-center">
                        <EditableCell
                            value={sharedRemark}
                            onSave={saveSharedRemark}
                            className="h-full p-1 text-[11px] text-muted-foreground font-semibold font-sans"
                            multiline
                            placeholder=""
                        />
                    </div>
                ) : (
                    <div className="flex w-full flex-col">
                        {items.map(item => (
                            <div key={item.key} className="min-h-[44px] p-1">
                                <EditableCell
                                    value={getMergeableRemark(item)}
                                    onSave={value => onCellUpdate(item.indices, 'remark', value)}
                                    className="h-full p-1 text-[11px] text-muted-foreground font-semibold font-sans"
                                    multiline
                                    placeholder=""
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

SessionGroupRow.displayName = 'SessionGroupRow';

/* État vide, une seule décision, sans bannière concurrente. */
const EmptyState: React.FC<{
  onOpenAddContentModal: (indices?: Indices) => void;
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}> = ({ onOpenAddContentModal, predefinedProgramTitle, onLoadPredefined }) => {
    const { t } = useLocale();
    const canLoadPredefined = Boolean(predefinedProgramTitle && onLoadPredefined);

    return (
        <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.045] px-5 py-12 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:px-8 sm:py-14">
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/[0.055] blur-2xl" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-12 h-40 w-40 rounded-full bg-primary/[0.035] blur-2xl" />
            <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
                <img
                    src="/icons/icon-192.png"
                    alt=""
                    aria-hidden="true"
                    className="h-16 w-16 rounded-2xl shadow-md ring-4 ring-border"
                />
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('emptyNotebook.label')}</p>
                <p className="mt-3 max-w-md text-base leading-7 text-foreground">
                    {canLoadPredefined ? (
                        <>
                            <strong className="font-bold text-foreground">{t('emptyNotebook.programAvailable')}</strong> {t('emptyNotebook.programHint')}
                        </>
                    ) : (
                        <>
                            {t('emptyNotebook.createPrefix')} <strong className="font-bold text-foreground">{t('emptyNotebook.firstChapter')}</strong> {t('emptyNotebook.createSuffix')}
                        </>
                    )}
                </p>

                <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                    {canLoadPredefined && (
                        <Button type="button" onClick={onLoadPredefined} className="w-full shadow-lg shadow-primary/20 sm:w-auto" variant="default">
                            {t('emptyNotebook.importProgram')}
                        </Button>
                    )}
                    {canLoadPredefined && <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('emptyNotebook.or')}</span>}
                    <Button
                        type="button"
                        onClick={() => onOpenAddContentModal()}
                        className="w-full sm:w-auto"
                        variant={canLoadPredefined ? 'outline' : 'default'}
                    >
                        {t('emptyNotebook.createChapter')}
                    </Button>
                </div>
            </div>
        </section>
    );
};

export const MainTable: React.FC<MainTableProps> = React.memo(({
  lessonsData,
  contentDirection,
  subject,
  onOpenAddContentModal,
  showDescriptions,
  descriptionTypes = [],
  selectedKeys,
  onToggleSelect,
  editingIndices,
  newlyAddedIds,
  onCellUpdate,
  onDeleteSeparator,
  onInitiateInlineEdit,
  onConfirmInlineEdit,
  onCancelInlineEdit,
  getDateWarnings,
  searchQuery,
  focusKey,
  predefinedProgramTitle,
  onLoadPredefined,
}) => {
  const editingKey = editingIndices ? makeKey(editingIndices) : null;
  const flatData = useMemo(() => {
    const result: FlatDataItem[] = [];

    const processElement = (
        element: any,
        indices: Indices,
        elementType: ElementType
    ): void => {
        const key = makeKey(indices);
        result.push({ data: element, indices, elementType, key });

        // Les items directement sous un nœud (activity, introduction…) passent
        // AVANT les sous-niveaux : activity → introduction → section → contenu.
        if (element.items?.length > 0) {
            element.items.forEach((item: LessonItem | EmbeddableTopLevelItem, i: number) => {
                if (item.type === 'chapter') {
                    processElement(item, { ...indices, itemIndex: i }, 'chapter');
                } else if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(item.type)) {
                    processElement(item, { ...indices, itemIndex: i }, item.type as ElementType);
                } else {
                    processElement(item, { ...indices, itemIndex: i }, 'item');
                }
            });
        }
        if (element.sections?.length > 0) {
            element.sections.forEach((sec: Section, i: number) =>
                processElement(sec, { ...indices, sectionIndex: i }, 'section')
            );
        }
        if (element.subsections?.length > 0) {
            element.subsections.forEach((sub: SubSection, i: number) =>
                processElement(sub, { ...indices, subsectionIndex: i }, 'subsection')
            );
        }
        if (element.subsubsections?.length > 0) {
            element.subsubsections.forEach((ssub: SubSubSection, i: number) =>
                processElement(ssub, { ...indices, subsubsectionIndex: i }, 'subsubsection')
            );
        }

        if (element.separatorAfter) {
            result.push({
                data: element.separatorAfter,
                indices: { ...indices, isSeparator: true },
                elementType: 'separator',
                key: `${key}-sep`,
            });
        }
    };

    lessonsData.forEach((topLevelItem, index) => {
        processElement(topLevelItem, { chapterIndex: index }, topLevelItem.type);
    });

    return applyDateMerges(result);
  }, [lessonsData]);

  const renderRows = useMemo<RenderRow[]>(() => {
    const rows: RenderRow[] = [];

    for (let index = 0; index < flatData.length; index += 1) {
        const item = flatData[index];

        if (item.dateMerge?.isMerged && item.dateMerge.isStart) {
            const group = flatData.slice(index, index + item.dateMerge.count);
            const containsEditedRow = editingKey !== null && group.some(groupItem => groupItem.key === editingKey);

            if (!containsEditedRow) {
                rows.push({
                    kind: 'session',
                    items: group,
                    key: `session-${item.key}`,
                    flatIndex: index,
                });
                index += item.dateMerge.count - 1;
                continue;
            }
        }

        rows.push({
            kind: 'single',
            item,
            key: item.key,
            flatIndex: index,
        });
    }

    return rows;
  }, [flatData, editingKey]);

  // La virtualisation reste ACTIVE pendant l'édition : la ligne éditée est
  // simplement « épinglée » (keepIndices) pour ne jamais être démontée.
  // Avant, éditer dans un gros cahier désactivait la virtualisation et
  // re-rendait toutes les lignes d'un coup.
  const editingIndex = useMemo(
    () => (editingKey === null ? -1 : renderRows.findIndex(row => (
        row.kind === 'single'
            ? row.item.key === editingKey
            : row.items.some(item => item.key === editingKey)
    ))),
    [editingKey, renderRows]
  );
  const keepIndices = useMemo(() => (editingIndex >= 0 ? [editingIndex] : []), [editingIndex]);

  const shouldVirtualize = renderRows.length > VIRTUALIZATION_THRESHOLD;
  const { scrollRef, totalSize, virtualItems, measureElement, renderedCount } = useWindowVirtualizer({
    count: renderRows.length,
    enabled: shouldVirtualize,
    estimateSize: ESTIMATED_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
    keepIndices,
  });

  useEffect(() => {
    if (!focusKey) return;

    const targetIndex = renderRows.findIndex(row => (
        row.kind === 'single'
            ? row.item.key === focusKey
            : row.items.some(item => item.key === focusKey)
    ));
    if (targetIndex < 0) return;

    const scrollNearTarget = () => {
        const table = scrollRef.current;
        if (!table) return;
        const tableTop = table.getBoundingClientRect().top + window.scrollY;
        const estimatedTop = tableTop + targetIndex * ESTIMATED_ROW_HEIGHT;
        window.scrollTo({ top: Math.max(0, estimatedTop - 150), behavior: 'smooth' });
    };

    const refineToRenderedRow = () => {
        const row = Array.from(document.querySelectorAll<HTMLElement>('[data-focus-key]'))
            .find(element => element.dataset.focusKey === focusKey);
        row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const frame = window.requestAnimationFrame(scrollNearTarget);
    const refineTimer = window.setTimeout(refineToRenderedRow, shouldVirtualize ? 260 : 80);
    return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(refineTimer);
    };
  }, [focusKey, renderRows, scrollRef, shouldVirtualize]);

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

  if (!lessonsData || lessonsData.length === 0) {
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

  return (
    /* Cadre complet : le tableau reste lisible comme un seul objet sur ses quatre côtés. */
    <Card
      data-editor-table
      data-content-direction={contentDirection}
      dir={contentDirection}
      className="rtl-table mx-0 overflow-hidden rounded-[22px] border border-border/80 bg-card/[0.58] shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-slate-950/[0.52] sm:rounded-[24px]"
      style={{ '--cdt-table-cols': TABLE_GRID_COLUMNS } as React.CSSProperties}
    >
      <TableHeader />
      <CardContent className="!p-0">
        <div ref={scrollRef} className="relative" style={shouldVirtualize ? { height: totalSize } : undefined}>
          {(() => {
              const rows: Array<{ row: RenderRow; virtualItem?: VirtualItem; absoluteIndex: number }> = shouldVirtualize
                ? virtualItems.map(virtualItem => ({ row: renderRows[virtualItem.index], virtualItem, absoluteIndex: virtualItem.index })).filter(entry => !!entry.row)
                : renderRows.map((row, absoluteIndex) => ({ row, absoluteIndex }));

              return rows.map(({ row, virtualItem, absoluteIndex }) => {
                  if (row.kind === 'session') {
                      const rowFocusKey = row.items.some(item => item.key === focusKey) ? focusKey : undefined;
                      return (
                          <VirtualListRow key={row.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={rowFocusKey ?? undefined} className={rowFocusKey ? 'action-source-highlight' : undefined}>
                              <SessionGroupRow
                                  items={row.items}
                                  selectedKeys={selectedKeys}
                                  newlyAddedIds={newlyAddedIds}
                                  onCellUpdate={onCellUpdate}
                                  onToggleSelect={onToggleSelect}
                                  onDoubleClickEdit={onInitiateInlineEdit}
                                  showDescriptions={showDescriptions}
                                  descriptionTypes={descriptionTypes}
                                  searchQuery={searchQuery}
                                  getDateWarnings={getDateWarnings}
                              />
                          </VirtualListRow>
                      );
                  }

                  const { item } = row;

                  if (item.elementType === 'separator') {
                      const originalItemIndices = item.indices;
                      const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                      return (
                          <VirtualListRow key={item.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
                          <SeparatorRow
                              data={item.data as Separator}
                              indices={originalItemIndices}
                              onCellUpdate={onCellUpdate}
                              onDelete={onDeleteSeparator}
                              isNew={isNew}
                          />
                          </VirtualListRow>
                      );
                  }

                  const isEditing = editingKey !== null && editingKey === item.key;

                  if (isEditing && item.elementType === 'item') {
                      return (
                          <VirtualListRow key={`${item.key}-edit`} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
                          <InlineEditRow
                              data={item.data as LessonItem}
                              onSave={(updatedData) => onConfirmInlineEdit(item.indices, updatedData)}
                              onCancel={onCancelInlineEdit}
                              subject={subject}
                              getDateWarnings={getDateWarnings}
                          />
                          </VirtualListRow>
                      );
                  }

                  const isSelected = selectedKeys.has(item.key);
                  const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));

                  return (
                      <VirtualListRow key={item.key} index={absoluteIndex} start={virtualItem?.start} measureElement={measureElement} dataFocusKey={item.key === focusKey ? focusKey : undefined} className={item.key === focusKey ? 'action-source-highlight' : undefined}>
                          <TableRow
                              data={item.data}
                              indices={item.indices}
                              elementType={item.elementType}
                              dateMerge={item.dateMerge}
                              onCellUpdate={onCellUpdate}
                              onToggleSelect={onToggleSelect}
                              onDoubleClickEdit={onInitiateInlineEdit}
                              isSelected={isSelected}
                              isNew={isNew}
                              showDescriptions={showDescriptions}
                              descriptionTypes={descriptionTypes}
                              searchQuery={searchQuery}
                              getDateWarnings={getDateWarnings}
                          />
                      </VirtualListRow>
                  );
              });
          })()}
        </div>
      </CardContent>
    </Card>
  );
});
MainTable.displayName = 'MainTable';

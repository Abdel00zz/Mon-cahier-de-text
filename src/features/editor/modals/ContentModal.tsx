import React, { useState, useMemo, useEffect, useRef, useId } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/ui/math-text';
import { ContentDirection, Cycle, Indices, LessonsData, TopLevelType } from '@/types';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '@/constants';
import { countOccurrencesOfType, findItem } from '@/domain/notebook/dataUtils';
import {
  ArrowLeft, MapPin, Book, Network, ListTree, GripHorizontal,
  ListChecks, CalendarCheck, FileSignature, CheckCheck, CircleAlert,
  Clock, FileText, Users, AwardIcon, GraduationCap, Home,
} from '@/components/ui/icons';
import { ClipboardCheck, Presentation } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { translateLocaleMessage } from '@/i18n/messages';
import { isKindOffered } from '@/domain/evaluations/kindAvailability';

import { ContentFields } from './ContentFields';
import { createContentDraft, contentDraftChanged, type ContentDraft, type EditableContent } from '@/domain/notebook/contentDraft';
import { formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import { resolveClassSessionDatesInRange } from '@/domain/notebook/classSessionDates';
import type { TimetableEntry, TimetableClockPolicy } from '@/types';
import './paperFormModal.css';

type IconType = React.ComponentType<{ className?: string }>;

export interface EditContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EditableContent | null;
  onSave: (value: ContentDraft) => void;
  subject?: string;
  contentDirection?: ContentDirection;
  titleOnly?: boolean;
  titleField?: 'title' | 'name';
  affectedCount?: number;
  classId?: string;
  timetable?: TimetableEntry[];
  timetableClock?: TimetableClockPolicy;
  lessonsData?: LessonsData;
  cycle?: Cycle;
}
const EMPTY_LESSONS: LessonsData = [];

export interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: string, data: ContentDraft) => void;
  lessonsData: LessonsData;
  selectedIndices: Indices | null;
  /** matière de la classe : restreint les types de contenu proposés */
  subject?: string;
  /** sens d'écriture du cahier : les éléments ajoutés suivent cette langue (FR/AR). */
  contentDirection?: ContentDirection;
  classId?: string;
  timetable?: TimetableEntry[];
  timetableClock?: TimetableClockPolicy;
  /** cycle d'enseignement : restreint les natures spécifiques (ex: la colle en prépa). */
  cycle?: Cycle;
  /** niveau officiel ou nom de la classe : l'examen blanc n'est offert qu'aux années d'examen. */
  classLevel?: string;
}

const getElementTypeFromIndices = (data: LessonsData, indices: Indices): string | null => {
  if (indices.itemIndex !== undefined) return 'item';
  if (indices.subsubsectionIndex !== undefined) return 'subsubsection';
  if (indices.subsectionIndex !== undefined) return 'subsection';
  if (indices.sectionIndex !== undefined) return 'section';
  if (indices.chapterIndex !== undefined) return data[indices.chapterIndex]?.type || null;
  return null;
};

interface CategoryCardProps {
  icon: IconType;
  label: string;
  description?: string;
  colorClass: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  icon: Icon,
  label,
  description,
  colorClass,
  onClick,
  disabled = false,
  tooltip,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`content-category group relative flex min-h-[56px] select-none items-center gap-3.5 rounded-2xl border p-3.5 text-start transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
        disabled
          ? 'bg-muted/40 border-border/40 opacity-45 cursor-not-allowed'
          : 'bg-background hover:bg-muted/50 border-border/80 hover:border-primary/40 active:scale-[0.97] cursor-pointer shadow-2xs hover:shadow-xs'
      }`}
      title={disabled ? tooltip : undefined}
    >
      <div className={`content-category__icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-105 ${disabled ? 'bg-muted text-muted-foreground' : `${colorClass} bg-muted/80 shadow-2xs`}`}>
        <Icon className="h-5 w-5 stroke-[2.2]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-xs text-foreground leading-snug">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">{description}</div>
        )}
        {disabled && tooltip && (
          <div className="text-[10px] text-rose-500 font-medium mt-1 leading-tight flex items-center gap-1">
            <CircleAlert className="h-3 w-3 shrink-0 stroke-[2.2]" />
            <span className="truncate">{tooltip}</span>
          </div>
        )}
      </div>
    </button>
  );
};

type ContentModalProps = AddContentModalProps | (EditContentModalProps & { mode: 'edit' });

/** Une seule modale et un seul formulaire, avec deux intentions explicites. */
export const ContentModal: React.FC<ContentModalProps> = (props) => {
  const { isOpen, onClose, subject, contentDirection, cycle } = props;
  const classLevel = 'classLevel' in props ? props.classLevel : undefined;
  /** Une seule règle pour toutes les portes : la nature est-elle proposée à cette classe ? */
  const offered = (type: string) => isKindOffered(type, { cycle, level: classLevel });
  const edit = 'mode' in props ? props : null;
  const lessonsData = ('lessonsData' in props && props.lessonsData) ? props.lessonsData : EMPTY_LESSONS;
  const selectedIndices = 'selectedIndices' in props ? props.selectedIndices : null;
  const { t } = useLocale();
  const tc = (key: string, values?: Record<string, string | number>): string =>
    translateLocaleMessage(contentDirection === 'rtl' ? 'ar' : 'fr', key, values);
  const original = useMemo(() => edit?.item
    ? createContentDraft(edit.item, edit.titleOnly, edit.titleField) : null,
    [edit?.item, edit?.titleOnly, edit?.titleField]);
  const isEditing = edit !== null;
  const [stage, setStage] = useState<'select' | 'form'>(isEditing ? 'form' : 'select');
  const [selectedType, setSelectedType] = useState<string | null>(isEditing ? (original?.type === 'free' ? 'free' : 'item') : null);
  const [formData, setFormData] = useState<ContentDraft>(original ?? {});
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const isDirty = original !== null && contentDraftChanged(formData, original);

  useEffect(() => {
    if (!isOpen) return;
    setStage(isEditing ? 'form' : 'select');
    setSelectedType(isEditing ? (original?.type === 'free' ? 'free' : 'item') : null);
    setFormData(original ?? {});
  }, [isOpen, isEditing, original]);

  useEffect(() => {
    if (!isOpen || stage !== 'form') return;
    const timer = window.setTimeout(() => initialFocusRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [isOpen, stage, selectedType]);

  // Context-aware selection details
  const { selectedItem, selectedElementType } = useMemo(() => {
    if (!selectedIndices || !isOpen) return { selectedItem: null, selectedElementType: null };
    try {
      const { item } = findItem(lessonsData, selectedIndices);
      return { selectedItem: item, selectedElementType: getElementTypeFromIndices(lessonsData, selectedIndices) };
    } catch {
      return { selectedItem: null, selectedElementType: null };
    }
  }, [selectedIndices, lessonsData, isOpen]);

  const targetLocationLabel = useMemo(() => {
    if (!selectedIndices || !isOpen) return t('addContent.atEnd');
    try {
      const { item } = findItem(lessonsData, selectedIndices);
      if (!item) return t('addContent.atEnd');
      const itemAny = item as any;
      const displayTitle = itemAny.title || itemAny.name || (itemAny.type ? tc(`contentType.${itemAny.type}`) : t('addContent.item'));
      return t('addContent.afterItem', { title: displayTitle });
    } catch {
      return t('addContent.atEnd');
    }
  }, [selectedIndices, lessonsData, isOpen, t, contentDirection]);

  // Le devoir maison se nomme simplement « Devoir maison » dans l'ajout de contenu.
  const typeName = (type: string) => tc(type === 'devoir_maison' ? 'addContent.homework' : `manageLessons.type.${type}`);

  let modalTitle = t('addContent.title');
  if (stage !== 'select' && selectedType) {
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelType];
    if (config) {
      modalTitle = t('addContent.addType', { type: typeName(selectedType) });
    } else if (selectedType === 'section') {
      modalTitle = t('addContent.addType', { type: t('addContent.section') });
    } else if (selectedType === 'subsection') {
      modalTitle = t('addContent.addType', { type: t('addContent.subsection') });
    } else if (selectedType === 'subsubsection') {
      modalTitle = t('addContent.addType', { type: t('addContent.subsubsection') });
    } else if (selectedType === 'item') {
      modalTitle = t('addContent.addType', { type: t('addContent.item') });
    } else if (selectedType === 'free') {
      modalTitle = t('addContent.free');
    }
  }

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const config = TOP_LEVEL_TYPE_CONFIG[type as TopLevelType];
    let initialData: ContentDraft = {};

    if (config) {
      const count = countOccurrencesOfType(lessonsData, type);
      const nextNum = count + 1;
      const localizedName = typeName(type);
      initialData.title = config.autoNumber && type !== 'devoir_maison'
        ? `${localizedName} ${nextNum}`
        : localizedName;
    } else if (type === 'item') {
      // Contexte : si l'on ajoute après un élément, on hérite de son type pour aller plus vite.
      const anchorType = selectedElementType === 'item' && selectedItem && (selectedItem as any).type;
      initialData.type = anchorType && anchorType !== 'free' && Object.values(TYPE_MAP).includes(anchorType) ? anchorType : 'exercice';
    } else if (type === 'free') {
      initialData = { type: 'free', title: '', description: '' };
    }

    setFormData(initialData);
    setStage('form');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const finalData = { ...formData };
    if (finalData.date && finalData.endDate && finalData.endDate > finalData.date) {
      const localeCode = contentDirection === 'rtl' ? 'ar' : 'fr';
      const lessons = 'lessonsData' in props ? props.lessonsData : undefined;
      const classId = 'classId' in props ? props.classId : undefined;
      const timetable = 'timetable' in props ? props.timetable : undefined;
      const timetableClock = 'timetableClock' in props ? props.timetableClock : undefined;
      const intersecting = resolveClassSessionDatesInRange(finalData.date, finalData.endDate, classId, timetable, timetableClock, lessons);
      finalData.date = formatPedagogicalDateCell(finalData.date, finalData.endDate, localeCode, intersecting);
    }
    if (edit) {
      if (edit.item && isDirty) edit.onSave(finalData);
    } else if (selectedType && 'onConfirm' in props) {
      props.onConfirm(selectedType, finalData);
    }
  };

  const structure = selectedType === 'section' || selectedType === 'subsection' || selectedType === 'subsubsection';
  const titleOnly = edit ? Boolean(edit.titleOnly) : Boolean(structure || (selectedType && TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelType]));
  const titleField = edit ? (edit.titleField ?? 'title') : structure ? 'name' : 'title';
  const canEditDate = Boolean(isEditing || selectedType === 'evaluation_diagnostic' || (selectedType && TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelType]));
  const renderForm = () => <ContentFields value={formData} onChange={setFormData} subject={subject}
    contentDirection={contentDirection} titleOnly={titleOnly} titleField={titleField}
    titleRequired={!edit && titleOnly} titleRef={initialFocusRef} canEditDate={canEditDate} />;

  // Check constraints
  const canAddSection = useMemo(() => {
    return selectedElementType === 'chapter' ||
      selectedElementType === 'section' ||
      (selectedElementType &&
        (selectedElementType.startsWith('evaluation_') ||
          selectedElementType.startsWith('devoir_') ||
          selectedElementType.startsWith('controle_') ||
          selectedElementType === 'oral' ||
          selectedElementType === 'colle' ||
          selectedElementType === 'examen_blanc' ||
          selectedElementType === 'olympiade' ||
          selectedElementType === 'concours' ||
          selectedElementType.startsWith('correction_')));
  }, [selectedElementType]);

  const canAddSubsection = selectedElementType === 'section' || selectedElementType === 'subsection';
  const canAddSubsubsection = selectedElementType === 'subsection' || selectedElementType === 'subsubsection';

  const canAddItem = useMemo(() => {
    if (!selectedItem) return false;
    // Après une feuille, l'insertion cible sa liste parente, pas la feuille.
    // Vaut aussi pour la dernière occurrence d'un contenu fusionné.
    if (selectedIndices?.itemIndex !== undefined) return true;
    // Section / sous-section / sous-sous-section possèdent déjà `items`.
    if ('items' in selectedItem || 'name' in selectedItem) return true;
    // Un chapitre peut aussi recevoir des items directement, sans section.
    return selectedElementType === 'chapter';
  }, [selectedItem, selectedElementType, selectedIndices]);

  const titleNode = (
    <div className="flex items-center gap-3">
      {stage === 'form' && !edit && (
        <button
          type="button"
          onClick={() => setStage('select')}
          className="btn-back flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 transition-all shrink-0 cursor-pointer"
          aria-label={t('addContent.back')}
        >
          <ArrowLeft className="h-4.5 w-4.5 stroke-[2.2] rtl:rotate-180" />
        </button>
      )}
      <span className="text-lg sm:text-[19px] font-semibold tracking-tight text-foreground truncate" title={modalTitle}>
        {modalTitle}
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={edit ? t(titleOnly ? 'editContent.titleOnlyTitle' : 'editContent.title') : titleNode}
      description={edit
        ? (edit.affectedCount && edit.affectedCount > 1 ? t('editContent.sharedDescription', { count: edit.affectedCount }) : undefined)
        : t('addContent.subtitle')}
      maxWidth={stage === 'select' ? "3xl" : "2xl"}
      className={stage === 'select' ? "paper-form-modal sm:max-w-4xl" : "paper-form-modal content-form-modal sm:max-w-xl"}
      headerClassName="border-b border-[#e7e5df] dark:border-stone-800 bg-background/95 px-6 pt-5 pb-4"
      bodyClassName="px-6 py-5 sm:px-7 sm:py-6"
      footerClassName="border-t border-[#e7e5df] dark:border-stone-800 bg-background/95 px-6 py-4"
      footer={
        stage === 'form' ? (
          <div className="content-modal__actions flex w-full flex-wrap items-center justify-end gap-3">
            {edit && (
              <Button
                type="button"
                variant="ghost"
                className="me-auto max-w-full px-2 text-xs"
                disabled={!isDirty}
                onClick={() => setFormData(original ?? {})}
              >
                {t('editContent.reset')}
              </Button>
            )}
            <div className="flex w-full sm:w-auto items-center justify-end gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                className="btn-cancel rounded-[14px] h-11 px-6 text-sm font-medium transition-all active:scale-95 bg-[#f5f4ef] dark:bg-stone-800 hover:bg-[#eae8e1] dark:hover:bg-stone-700 text-[#3f403b] dark:text-stone-200 border-0 flex-1 sm:flex-initial"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                form={formId}
                disabled={isEditing && !isDirty}
                className="btn-submit rounded-[14px] bg-primary hover:bg-primary/90 font-semibold px-7 h-11 text-sm shadow-sm text-primary-foreground active:scale-95 transition-all flex-1 sm:flex-initial"
              >
                {t(edit ? 'common.save' : 'addContent.insert')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="rounded-[14px] h-11 px-6 text-sm font-medium bg-[#f5f4ef] dark:bg-stone-800 hover:bg-[#eae8e1] text-[#3f403b] dark:text-stone-200 border-0"
            >
              {t('common.close')}
            </Button>
          </div>
        )
      }
    >
      {/* Context Target Banner */}
      {!edit && (
        <div className="insertion-point-box mb-5 flex items-center gap-3.5 rounded-[18px] bg-[#f5f4ef] dark:bg-stone-900/60 border border-[#e7e5df] dark:border-stone-800 p-3 sm:px-4.5 sm:py-3.5 text-xs shadow-2xs">
          <div className="icon-pin-wrap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eae8e1] dark:bg-stone-800 text-[#52544e] dark:text-stone-300 shadow-2xs">
            <MapPin className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <div className="insertion-point-text min-w-0 flex-1">
            <strong className="block text-[13.5px] font-semibold text-foreground leading-tight">
              {t('addContent.insertionPoint')}
            </strong>
            <span className="mt-0.5 block text-[12.5px] text-muted-foreground leading-snug" dir={contentDirection}>
              <MathText source={targetLocationLabel}>{targetLocationLabel}</MathText>
            </span>
          </div>
        </div>
      )}

      {stage === 'select' ? (
        <div className="space-y-5 py-1 pe-1 pb-6 sm:pb-8">
          {/* Group 1: Cours & Structures */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupStructures')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <CategoryCard
                icon={Book}
                label={tc('manageLessons.type.chapter')}

                colorClass="text-indigo-600 dark:text-indigo-400"
                onClick={() => handleSelectType('chapter')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.section')}

                colorClass="text-violet-600 dark:text-violet-400"
                onClick={() => handleSelectType('section')}
                disabled={!canAddSection}
                tooltip={t('addContent.sectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsection')}

                colorClass="text-cyan-600 dark:text-cyan-400"
                onClick={() => handleSelectType('subsection')}
                disabled={!canAddSubsection}
                tooltip={t('addContent.subsectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsubsection')}

                colorClass="text-teal-600 dark:text-teal-400"
                onClick={() => handleSelectType('subsubsection')}
                disabled={!canAddSubsubsection}
                tooltip={t('addContent.subsubsectionTooltip')}
              />
              <CategoryCard
                icon={ListTree}
                label={t('addContent.item')}

                colorClass="text-blue-600 dark:text-blue-400"
                onClick={() => handleSelectType('item')}
                disabled={!canAddItem}
                tooltip={t('addContent.itemTooltip')}
              />
            </div>
          </div>

          {/* Group 2: Rédaction libre — un contenu hors plan, jamais un niveau de structure */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupFree')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <CategoryCard icon={GripHorizontal} label={t('addContent.free')} description={t('addContent.freeHelp')}
                colorClass="text-slate-600 dark:text-slate-400" onClick={() => handleSelectType('free')} />
            </div>
          </div>

          {/*
           * LES ÉPREUVES ET LEURS CORRECTIONS se créent ici : elles traversent
           * l'année et ne dépendent d'AUCUN chapitre — le bloc se pose à sa
           * date, jamais dans un plan de cours. Le tableau les CAPTE et la
           * feuille « Contrôle continu et activités » les reçoit alors : bloc
           * daté pour les épreuves écrites et l'oral, activité pour le
           * diagnostic, date de correction pour le devoir maison — contrat
           * dans docs/architecture/workflow-evaluations.md.
           * Le devoir à la maison, lui, ne se crée pas ici : il s'énonce dans
           * la REMARQUE de sa séance d'attribution, et la feuille le reçoit.
           */}

          {/* Group 3: Évaluations & Devoirs */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupAssessments')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <CategoryCard
                icon={ListChecks}
                label={tc('manageLessons.type.evaluation_diagnostic')}
                colorClass="text-blue-600 dark:text-blue-400"
                onClick={() => handleSelectType('evaluation_diagnostic')}
              />
              <CategoryCard
                icon={CalendarCheck}
                label={tc('manageLessons.type.controle_continu')}
                colorClass="text-blue-600 dark:text-blue-400"
                onClick={() => handleSelectType('controle_continu')}
              />
              <CategoryCard
                icon={Clock}
                label={tc('manageLessons.type.controle_court')}
                colorClass="text-violet-600 dark:text-violet-400"
                onClick={() => handleSelectType('controle_court')}
              />
              <CategoryCard
                icon={FileText}
                label={tc('manageLessons.type.controle_global')}
                colorClass="text-emerald-600 dark:text-emerald-400"
                onClick={() => handleSelectType('controle_global')}
              />
              <CategoryCard
                icon={Home}
                label={typeName('devoir_maison')}
                description={t('addContent.homeworkHelp')}
                colorClass="text-teal-600 dark:text-teal-400"
                onClick={() => handleSelectType('devoir_maison')}
              />
              <CategoryCard
                icon={Users}
                label={tc('manageLessons.type.oral')}
                colorClass="text-pink-600 dark:text-pink-400"
                onClick={() => handleSelectType('oral')}
              />
              {offered('colle') && (
                <CategoryCard
                  icon={Presentation}
                  label={tc('manageLessons.type.colle')}
                  colorClass="text-rose-600 dark:text-rose-400"
                  onClick={() => handleSelectType('colle')}
                />
              )}
              {offered('examen_blanc') && (
                <CategoryCard
                  icon={FileSignature}
                  label={tc('manageLessons.type.examen_blanc')}
                  colorClass="text-rose-600 dark:text-rose-400"
                  onClick={() => handleSelectType('examen_blanc')}
                />
              )}
              {offered('olympiade') && (
                <CategoryCard
                  icon={AwardIcon}
                  label={tc('manageLessons.type.olympiade')}
                  colorClass="text-amber-600 dark:text-amber-400"
                  onClick={() => handleSelectType('olympiade')}
                />
              )}
              <CategoryCard
                icon={GraduationCap}
                label={tc('manageLessons.type.concours')}
                colorClass="text-violet-600 dark:text-violet-400"
                onClick={() => handleSelectType('concours')}
              />
            </div>
          </div>

          {/* Group 4: Corrections */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupCorrections')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <CategoryCard
                icon={CheckCheck}
                label={tc('manageLessons.type.correction_devoir_maison')}
                colorClass="text-emerald-700 dark:text-emerald-400"
                onClick={() => handleSelectType('correction_devoir_maison')}
              />
              <CategoryCard
                icon={ClipboardCheck}
                label={tc('manageLessons.type.correction_controle_continu')}
                colorClass="text-slate-600 dark:text-slate-400"
                onClick={() => handleSelectType('correction_controle_continu')}
              />
            </div>
          </div>
        </div>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4 pb-2">
          {renderForm()}
        </form>
      )}
    </Modal>
  );
};

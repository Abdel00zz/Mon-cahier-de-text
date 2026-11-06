import React, { useState, useMemo, useEffect, useRef, useId } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/ui/math-text';
import { ContentDirection, Cycle, Indices, LessonsData, TopLevelType } from '@/types';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '@/constants';
import { countOccurrencesOfType, findItem } from '@/domain/notebook/dataUtils';
import { ArrowLeft, MapPin } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { translateLocaleMessage } from '@/i18n/messages';
import { isKindOffered } from '@/domain/evaluations/kindAvailability';

import { ContentFields } from './ContentFields';
import { ContentTypePicker } from './ContentTypePicker';
import { createContentDraft, contentDraftChanged, type ContentDraft, type EditableContent } from '@/domain/notebook/contentDraft';
import { formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import { resolveClassSessionDatesInRange } from '@/domain/notebook/classSessionDates';
import type { TimetableEntry, TimetableClockPolicy } from '@/types';
import './paperFormModal.css';


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
    if (edit?.titleOnly) {
      const field = edit.titleField ?? 'title';
      if (edit.item && isDirty) edit.onSave({ [field]: formData[field] ?? '' });
      return;
    }
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
  const canEditDate = edit ? !titleOnly : Boolean(selectedType === 'evaluation_diagnostic' || (selectedType && TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelType]));
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
      <span className="text-base sm:text-[17px] font-semibold tracking-tight text-foreground truncate" title={modalTitle}>
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
                type="submit" 
                form={formId}
                disabled={isEditing && !isDirty}
                className="btn-submit rounded-[14px] bg-primary hover:bg-primary/90 font-semibold px-7 h-11 text-sm shadow-sm text-primary-foreground active:scale-95 transition-all flex-1 sm:flex-initial"
              >
                {t(edit ? 'common.save' : 'addContent.insert')}
              </Button>
            </div>
          </div>
        ) : undefined
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
        <ContentTypePicker
          t={t}
          tc={tc}
          typeName={typeName}
          offered={offered}
          canAddSection={Boolean(canAddSection)}
          canAddSubsection={canAddSubsection}
          canAddSubsubsection={canAddSubsubsection}
          canAddItem={canAddItem}
          onSelect={handleSelectType}
        />
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4 pb-2">
          {renderForm()}
        </form>
      )}
    </Modal>
  );
};

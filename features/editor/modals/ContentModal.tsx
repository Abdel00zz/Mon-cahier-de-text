import React, { useState, useMemo, useEffect, useRef, useId } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/ui/math-text';
import { ContentDirection, Indices, LessonsData, TopLevelType } from '@/types';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '@/constants';
import { countOccurrencesOfType, findItem } from '@/utils/dataUtils';
import {
  ArrowLeft, MapPin, Book, Network, ListTree, GripHorizontal,
  TestTube, Home, FileSignature, CheckCheck, CheckSquare, CircleAlert,
} from '@/components/ui/icons';
import { translateLocaleMessage, useLocale } from '@/i18n/LocaleProvider';

import { ContentFields } from './ContentFields';
import { createContentDraft, contentDraftChanged, type ContentDraft, type EditableContent } from '@/utils/contentDraft';

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
      className={`group relative flex min-h-[56px] select-none items-center gap-3.5 rounded-2xl border p-3.5 text-start transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
        disabled
          ? 'bg-muted/40 border-border/40 opacity-45 cursor-not-allowed'
          : 'bg-background hover:bg-muted/50 border-border/80 hover:border-primary/40 active:scale-[0.97] cursor-pointer shadow-2xs hover:shadow-xs'
      }`}
      title={disabled ? tooltip : undefined}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-105 ${disabled ? 'bg-muted text-muted-foreground' : `${colorClass} bg-muted/80 shadow-2xs`}`}>
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
  const { isOpen, onClose, subject, contentDirection } = props;
  const edit = 'mode' in props ? props : null;
  const lessonsData = 'lessonsData' in props ? props.lessonsData : EMPTY_LESSONS;
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

  let modalTitle = t('addContent.title');
  if (stage !== 'select' && selectedType) {
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelType];
    if (config) {
      modalTitle = t('addContent.addType', { type: tc(`manageLessons.type.${selectedType}`) });
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
      // Types récurrents : titre auto-suggéré « Contrôle continu N » (N =
      // occurrences existantes dans le cahier + 1). Simple suggestion, le
      // champ reste librement modifiable par le professeur.
      const localizedName = tc(`manageLessons.type.${type}`);
      initialData.title = config.autoNumber
        ? `${localizedName} ${countOccurrencesOfType(lessonsData, type) + 1}`
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
    if (edit) {
      if (edit.item && isDirty) edit.onSave(formData);
    } else if (selectedType && 'onConfirm' in props) {
      props.onConfirm(selectedType, formData);
    }
  };

  const structure = selectedType === 'section' || selectedType === 'subsection' || selectedType === 'subsubsection';
  const titleOnly = edit ? Boolean(edit.titleOnly) : Boolean(structure || (selectedType && TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelType]));
  const titleField = edit ? (edit.titleField ?? 'title') : structure ? 'name' : 'title';
  const renderForm = () => <ContentFields value={formData} onChange={setFormData} subject={subject}
    contentDirection={contentDirection} titleOnly={titleOnly} titleField={titleField}
    titleRequired={!edit && titleOnly} titleRef={initialFocusRef} />;

  // Check constraints
  const canAddSection = useMemo(() => {
    return selectedElementType === 'chapter' ||
      selectedElementType === 'section' ||
      (selectedElementType &&
        (selectedElementType.startsWith('evaluation_') ||
          selectedElementType.startsWith('devoir_') ||
          selectedElementType.startsWith('controle_') ||
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
    <div className="flex items-center gap-2.5">
      {stage === 'form' && !edit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStage('select')}
          className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-muted flex-shrink-0 cursor-pointer"
          aria-label={t('addContent.back')}
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.2] text-muted-foreground rtl:rotate-180" />
        </Button>
      )}
      <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate" title={modalTitle}>{modalTitle}</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={edit ? t(titleOnly ? 'editContent.titleOnlyTitle' : 'editContent.title') : titleNode}
      description={edit ? undefined : t('addContent.subtitle')}
      maxWidth={stage === 'select' ? "3xl" : "2xl"}
      className={stage === 'select' ? "sm:max-w-4xl sm:rounded-2xl" : "sm:max-w-3xl sm:rounded-2xl"}
      headerClassName="border-b-0 bg-background/85 backdrop-blur-md"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="border-t-0 bg-background/85 backdrop-blur-md"
      footer={
        stage === 'form' ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2.5">
            {edit && <Button type="button" variant="ghost" className="me-auto max-w-full px-2 text-xs" disabled={!isDirty}
              onClick={() => setFormData(original ?? {})}>{t('editContent.reset')}</Button>}
            <div className="flex shrink-0 items-center gap-2.5">
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              form={formId} disabled={isEditing && !isDirty}
              className="rounded-xl bg-primary hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm text-primary-foreground"
            >
              {t(edit ? 'common.save' : 'addContent.insert')}
            </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end">
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl h-10 px-5 text-xs font-semibold sm:text-sm">
              {t('common.close')}
            </Button>
          </div>
        )
      }
    >
      {/* Context Target Banner */}
      {!edit && <div className="mb-4 p-3 bg-muted/60 border border-border/70 rounded-2xl text-xs text-muted-foreground flex items-center gap-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center bg-background border border-border text-foreground rounded-xl shrink-0 shadow-2xs">
          <MapPin className="h-4 w-4 stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground text-xs">{t('addContent.insertionPoint')}</div>
          <div className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground font-medium text-[11px]" dir={contentDirection}>
            <MathText source={targetLocationLabel}>{targetLocationLabel}</MathText>
          </div>
        </div>
      </div>}

      {stage === 'select' ? (
        <div className="space-y-5 py-1 pe-1">
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
              <CategoryCard icon={GripHorizontal} label={t('addContent.free')} description={t('addContent.freeHelp')}
                colorClass="text-slate-600 dark:text-slate-400" onClick={() => handleSelectType('free')} />
            </div>
          </div>

          {/* Group 2: Évaluations & Devoirs */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupAssessments')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <CategoryCard
                icon={TestTube}
                label={tc('manageLessons.type.evaluation_diagnostic')}

                colorClass="text-amber-600 dark:text-amber-400"
                onClick={() => handleSelectType('evaluation_diagnostic')}
              />
              <CategoryCard
                icon={Home}
                label={tc('manageLessons.type.devoir_maison')}

                colorClass="text-orange-600 dark:text-orange-400"
                onClick={() => handleSelectType('devoir_maison')}
              />
              <CategoryCard
                icon={FileSignature}
                label={tc('manageLessons.type.controle_continu')}

                colorClass="text-rose-600 dark:text-rose-400"
                onClick={() => handleSelectType('controle_continu')}
              />
            </div>
          </div>

          {/* Group 3: Corrections */}
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
                icon={CheckSquare}
                label={tc('manageLessons.type.correction_controle_continu')}

                colorClass="text-emerald-600 dark:text-emerald-400"
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

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MathJax } from 'better-react-mathjax';
import { ContentDirection, Indices, LessonsData, TopLevelItem } from '@/types';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP, BADGE_COLOR_MAP, BADGE_TEXT_MAP, getContentTypesForSubject } from '@/constants';
import { countOccurrencesOfType, findItem } from '@/utils/dataUtils';
import { hasMathSyntax } from '@/utils/math';
import {
  ArrowLeft, MapPin, Book, Network, ListTree, GripHorizontal,
  TestTube, Home, FileSignature, CheckCheck, CheckSquare, Sigma, CircleAlert,
} from '@/components/ui/icons';
import { translateLocaleMessage, useLocale } from '@/i18n/LocaleProvider';

type IconType = React.ComponentType<{ className?: string }>;

export { EditItemModal as AddContentModal };

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: string, data: any) => void;
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

const UNIQUE_LESSON_ITEM_TYPES = [...new Set(Object.values(TYPE_MAP))].sort((a, b) => a.localeCompare(b));

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
      className={`group relative flex select-none items-start gap-3.5 rounded-2xl border p-3.5 text-start transition-all duration-200 ${
        disabled
          ? 'bg-muted/40 border-border/40 opacity-45 cursor-not-allowed'
          : 'bg-card hover:bg-muted/50 border-border/80 hover:border-primary/40 active:scale-[0.98] cursor-pointer shadow-xs hover:shadow-sm'
      }`}
      title={tooltip}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 transition-transform group-hover:scale-105 ${disabled ? 'bg-muted text-muted-foreground' : `${colorClass} bg-muted/80 shadow-2xs`}`}>
        <Icon className="h-5 w-5 stroke-[2.2]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-xs text-foreground leading-snug">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">{description}</div>
        )}
        {disabled && tooltip && (
          <div className="text-[10px] text-rose-500 font-medium mt-1 leading-tight flex items-center gap-1">
            <CircleAlert className="h-3 w-3 shrink-0" />
            <span className="truncate">{tooltip}</span>
          </div>
        )}
      </div>
    </button>
  );
};

const EditItemModal: React.FC<AddContentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  lessonsData,
  selectedIndices,
  subject,
  contentDirection,
}) => {
  const { t, isRtl } = useLocale();
  // Les éléments ajoutés restent cohérents avec la langue du cahier (FR si le
  // contenu est en écriture latine, AR sinon), pas avec celle de l'interface.
  const tc = (key: string, values?: Record<string, string | number>): string =>
    translateLocaleMessage(contentDirection === 'rtl' ? 'ar' : 'fr', key, values);
  const [stage, setStage] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const selectFocusRef = useRef<HTMLSelectElement>(null);

  // Types de contenu proposés selon la matière (repli sur la liste complète).
  const lessonTypeOptions = useMemo(
    () => (subject ? getContentTypesForSubject(subject) : UNIQUE_LESSON_ITEM_TYPES),
    [subject]
  );

  // Reset when opening modal
  useEffect(() => {
    if (isOpen) {
      setStage('select');
      setSelectedType(null);
      setFormData({});
    }
  }, [isOpen]);

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
      const displayTitle = itemAny.title || itemAny.name || itemAny.content || (itemAny.type ? tc(`contentType.${itemAny.type}`) : t('addContent.item'));
      return t('addContent.afterItem', { title: displayTitle });
    } catch {
      return t('addContent.atEnd');
    }
  }, [selectedIndices, lessonsData, isOpen, t, contentDirection]);

  let modalTitle = t('addContent.title');
  if (stage !== 'select' && selectedType) {
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelItem['type']];
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
    } else if (selectedType === 'separator') {
      modalTitle = t('addContent.addType', { type: t('addContent.separator') });
    }
  }

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const config = TOP_LEVEL_TYPE_CONFIG[type as TopLevelItem['type']];
    let initialData: any = {};

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
      initialData.type = anchorType || 'exercice';
    } else if (type === 'separator') {
      // Le séparateur hérite de la date de l'élément ancre (démarcation de séance).
      const anchorDate = selectedItem && (selectedItem as any).date;
      if (anchorDate) initialData.date = anchorDate;
    }

    setFormData(initialData);
    setStage('form');
    setTimeout(() => {
      initialFocusRef.current?.focus();
      selectFocusRef.current?.focus();
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType) {
      onConfirm(selectedType, formData);
    }
  };

  const labelClasses = "block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5";

  // Math detected on currently edited form
  const hasMath = useMemo(() => {
    return hasMathSyntax(formData.title || formData.name || formData.content || formData.description);
  }, [formData]);

  const renderForm = () => {
    if (!selectedType) return null;
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelItem['type']];
    if (config) {
      const localizedName = tc(`manageLessons.type.${selectedType}`);
      return (
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label htmlFor="title" className={labelClasses}>{t('addContent.titleFor', { type: localizedName })}</label>
            <Input
              ref={initialFocusRef}
              type="text"
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder={t('addContent.topLevelPlaceholder', { type: localizedName })}
              className="h-10 rounded-lg border-border"
            />
          </div>
        </div>
      );
    }
    switch (selectedType) {
      case 'section':
      case 'subsection':
      case 'subsubsection':
        const structureLabel =
          selectedType === 'section'
            ? t('addContent.sectionName')
            : selectedType === 'subsection'
              ? t('addContent.subsectionName')
              : t('addContent.subsubsectionName');
        return (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label htmlFor="name" className={labelClasses}>{structureLabel}</label>
              <Input
                ref={initialFocusRef}
                type="text"
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder={t('addContent.structurePlaceholder')}
                className="h-10 rounded-lg border-border"
              />
            </div>
          </div>
        );
      case 'item':
        return (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="itemType" className={labelClasses}>{t('addContent.contentType')} *</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger id="itemType" ref={selectFocusRef as any} className="h-10 rounded-lg border-border shadow-none">
                    <SelectValue placeholder={t('addContent.choose')} />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonTypeOptions.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${BADGE_COLOR_MAP[type] || 'bg-muted text-foreground'}`}>
                            {BADGE_TEXT_MAP[type] || type}
                          </span>
                          <span>{tc(`contentType.${type}`)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="itemNumber" className={labelClasses}>{t('addContent.number')}</label>
                <Input
                  ref={initialFocusRef}
                  type="text"
                  id="itemNumber"
                  value={formData.number || ''}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder={t('addContent.numberPlaceholder')}
                  className="h-10 rounded-lg border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="itemTitle" className={labelClasses}>{t('addContent.itemTitle')}</label>
              <Input
                type="text"
                id="itemTitle"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('addContent.optionalTitlePlaceholder')}
                className="h-10 rounded-lg border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="itemDescription" className={labelClasses}>{t('addContent.descriptionLabel')}</label>
              <Textarea
                id="itemDescription"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('addContent.descriptionPlaceholder')}
                className="rounded-xl border-border"
              />
            </div>
          </div>
        );
      case 'separator':
        return (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label htmlFor="separatorContent" className={labelClasses}>{t('addContent.separatorText')}</label>
              <Input
                ref={initialFocusRef}
                type="text"
                id="separatorContent"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('addContent.separatorPlaceholder')}
                className="h-10 rounded-lg border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="separatorDate" className={labelClasses}>{t('addContent.separatorDate')}</label>
              <Input
                type="date"
                id="separatorDate"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="h-10 rounded-lg border-border"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

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
    // Section / sous-section / sous-sous-section possèdent déjà `items`.
    if ('items' in selectedItem) return true;
    // Un chapitre peut aussi recevoir des items directement, sans section.
    return selectedElementType === 'chapter';
  }, [selectedItem, selectedElementType]);

  const canAddSeparator = !!selectedIndices;

  const titleNode = (
    <div className="flex items-center gap-2.5">
      {stage === 'form' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStage('select')}
          className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-muted flex-shrink-0 cursor-pointer"
          aria-label={t('addContent.back')}
        >
          <ArrowLeft className={`h-3.5 w-3.5 text-muted-foreground ${isRtl ? 'rotate-180' : ''}`} />
        </Button>
      )}
      <span className="truncate">{modalTitle}</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      description={
        stage === 'select' 
          ? t('addContent.selectHint')
          : t('addContent.formHint')
      }
      maxWidth={stage === 'select' ? "3xl" : "xl"}
      className={stage === 'select' ? "sm:max-w-4xl sm:rounded-[28px]" : "sm:max-w-2xl sm:rounded-[28px]"}
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/50 bg-card/60"
      footer={
        stage === 'form' ? (
          <div className="flex w-full items-center justify-end gap-2.5">
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              form="add-content-form" 
              className="rounded-xl bg-primary hover:bg-primary/90 font-bold px-5 h-10 text-xs sm:text-sm shadow-sm text-primary-foreground"
            >
              {t('addContent.insert')}
            </Button>
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
      <div className="mb-4 p-3 bg-muted/60 border border-border/70 rounded-2xl text-xs text-muted-foreground flex items-center gap-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center bg-card border border-border text-foreground rounded-xl shrink-0 shadow-2xs">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground text-xs">{t('addContent.insertionPoint')}</div>
          <div className="truncate mt-0.5 text-muted-foreground font-medium text-[11px]">{targetLocationLabel}</div>
        </div>
      </div>

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
                description={t('addContent.chapterHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('chapter')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.section')}
                description={t('addContent.sectionHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('section')}
                disabled={!canAddSection}
                tooltip={t('addContent.sectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsection')}
                description={t('addContent.subsectionHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('subsection')}
                disabled={!canAddSubsection}
                tooltip={t('addContent.subsectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsubsection')}
                description={t('addContent.subsubsectionHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('subsubsection')}
                disabled={!canAddSubsubsection}
                tooltip={t('addContent.subsubsectionTooltip')}
              />
              <CategoryCard
                icon={ListTree}
                label={t('addContent.item')}
                description={t('addContent.itemHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('item')}
                disabled={!canAddItem}
                tooltip={t('addContent.itemTooltip')}
              />
              <CategoryCard
                icon={GripHorizontal}
                label={t('addContent.separator')}
                description={t('addContent.separatorHint')}
                colorClass="text-muted-foreground"
                onClick={() => handleSelectType('separator')}
                disabled={!canAddSeparator}
                tooltip={t('addContent.separatorTooltip')}
              />
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
                description={t('addContent.diagnosticHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('evaluation_diagnostic')}
              />
              <CategoryCard
                icon={Home}
                label={tc('manageLessons.type.devoir_maison')}
                description={t('addContent.homeworkHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('devoir_maison')}
              />
              <CategoryCard
                icon={FileSignature}
                label={tc('manageLessons.type.controle_continu')}
                description={t('addContent.assessmentHint')}
                colorClass="text-foreground"
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
                description={t('addContent.homeworkCorrectionHint')}
                colorClass="text-emerald-700 dark:text-emerald-400"
                onClick={() => handleSelectType('correction_devoir_maison')}
              />
              <CategoryCard
                icon={CheckSquare}
                label={tc('manageLessons.type.correction_controle_continu')}
                description={t('addContent.assessmentCorrectionHint')}
                colorClass="text-foreground"
                onClick={() => handleSelectType('correction_controle_continu')}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col pe-1">
          <form id="add-content-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            {renderForm()}
          </form>

          {/* Live LaTeX Render Area */}
          {hasMath && (
            <div className="mt-2 p-3.5 rounded-xl border border-border bg-muted/50 space-y-2 animate-fade-in duration-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Sigma className="h-3 w-3" />
                  <span>{t('descriptionModal.preview')}</span>
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">{t('descriptionModal.generated')}</span>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border shadow-inner text-xs text-foreground leading-relaxed overflow-x-auto min-h-[50px] flex flex-col justify-center">
                <MathJax hideUntilTypeset="first">
                  {formData.title || formData.name || formData.content ? (
                    <div className="font-semibold text-foreground break-words">
                      {formData.title || formData.name || formData.content}
                    </div>
                  ) : null}
                  {formData.description ? (
                    <div className="text-muted-foreground mt-1.5 whitespace-pre-wrap break-words">
                      {formData.description}
                    </div>
                  ) : null}
                </MathJax>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

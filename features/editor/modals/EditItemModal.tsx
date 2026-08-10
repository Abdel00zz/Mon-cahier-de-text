import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MathJax } from 'better-react-mathjax';
import { Indices, LessonsData, TopLevelItem } from '@/types';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '@/constants';
import { countOccurrencesOfType, findItem } from '@/utils/dataUtils';
import {
  ArrowLeft, MapPin, Book, Network, ListTree, GripHorizontal,
  TestTube, Home, FileSignature, CheckCheck, CheckSquare, Sigma, CircleAlert,
} from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

type IconType = React.ComponentType<{ className?: string }>;

export { EditItemModal as AddContentModal };

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: string, data: any) => void;
  lessonsData: LessonsData;
  selectedIndices: Indices | null;
}

const getElementTypeFromIndices = (data: LessonsData, indices: Indices): string | null => {
  if (indices.itemIndex !== undefined) return 'item';
  if (indices.subsubsectionIndex !== undefined) return 'subsubsection';
  if (indices.subsectionIndex !== undefined) return 'subsection';
  if (indices.sectionIndex !== undefined) return 'section';
  if (indices.chapterIndex !== undefined) return data[indices.chapterIndex]?.type || null;
  return null;
};

const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return /\$\$?[^$]+\$\$?|\\\(|\\\[|\\begin\{/.test(value);
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
      className={`relative flex select-none items-start gap-3 rounded-xl border p-2.5 text-start transition-all duration-150 ${
        disabled
          ? 'bg-zinc-50/50 border-zinc-100 opacity-40 cursor-not-allowed'
          : 'bg-white hover:bg-zinc-50/80 border-zinc-200 hover:border-zinc-300 active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-md'
      }`}
      title={tooltip}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg p-2 ${disabled ? 'bg-zinc-100 text-zinc-400' : `${colorClass} bg-zinc-100/60`}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-xs text-zinc-800 leading-snug">{label}</div>
        {description && (
          <div className="text-[10px] text-zinc-400 mt-0.5 leading-normal truncate">{description}</div>
        )}
        {disabled && tooltip && (
          <div className="text-[9px] text-red-500 font-medium mt-1 leading-tight flex items-center gap-1">
            <CircleAlert className="h-2 w-2" />
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
}) => {
  const { t, isRtl } = useLocale();
  const [stage, setStage] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const selectFocusRef = useRef<HTMLSelectElement>(null);

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
      const displayTitle = itemAny.title || itemAny.name || itemAny.content || (itemAny.type ? t(`contentType.${itemAny.type}`) : t('addContent.item'));
      return t('addContent.afterItem', { title: displayTitle });
    } catch {
      return t('addContent.atEnd');
    }
  }, [selectedIndices, lessonsData, isOpen, t]);

  let modalTitle = t('addContent.title');
  if (stage !== 'select' && selectedType) {
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelItem['type']];
    if (config) {
      modalTitle = t('addContent.addType', { type: t(`manageLessons.type.${selectedType}`) });
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
      const localizedName = t(`manageLessons.type.${type}`);
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

  const labelClasses = "block text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5";

  // Math detected on currently edited form
  const hasMath = useMemo(() => {
    return hasMathSyntax(formData.title || formData.name || formData.content || formData.description);
  }, [formData]);

  const renderForm = () => {
    if (!selectedType) return null;
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelItem['type']];
    if (config) {
      const localizedName = t(`manageLessons.type.${selectedType}`);
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
                    {UNIQUE_LESSON_ITEM_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {t(`contentType.${type}`)}
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
    return !!selectedItem && 'items' in selectedItem;
  }, [selectedItem]);

  const canAddSeparator = !!selectedIndices;

  const titleNode = (
    <div className="flex items-center gap-2.5">
      {stage === 'form' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStage('select')}
          className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-zinc-100 flex-shrink-0 cursor-pointer"
          aria-label={t('addContent.back')}
        >
          <ArrowLeft className={`h-3.5 w-3.5 text-zinc-500 ${isRtl ? 'rotate-180' : ''}`} />
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
      maxWidth={stage === 'select' ? "2xl" : "lg"}
      footer={
        stage === 'form' ? (
          <>
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              form="add-content-form" 
              className="rounded-xl bg-primary hover:bg-primary/90 font-semibold px-5 shadow-sm text-primary-foreground"
            >
              {t('addContent.insert')}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">
            {t('common.close')}
          </Button>
        )
      }
    >
      {/* Context Target Banner */}
      <div className="mb-4 p-3 bg-zinc-50/80 border border-zinc-200 rounded-xl text-xs text-zinc-500 flex items-start gap-2.5 flex-shrink-0">
        <div className="p-1.5 bg-white border border-zinc-200 text-zinc-400 rounded-lg flex-shrink-0">
          <MapPin className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-zinc-700">{t('addContent.insertionPoint')}</div>
          <div className="truncate mt-0.5 text-zinc-400 font-medium">{targetLocationLabel}</div>
        </div>
      </div>

      {stage === 'select' ? (
        <div className="custom-scrollbar max-h-[50vh] space-y-5 overflow-y-auto py-1 pe-1">
          {/* Group 1: Cours & Structures */}
          <div className="space-y-2">
            <h3 className="ps-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t('addContent.groupStructures')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryCard
                icon={Book}
                label={t('manageLessons.type.chapter')}
                description={t('addContent.chapterHint')}
                colorClass="text-zinc-800"
                onClick={() => handleSelectType('chapter')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.section')}
                description={t('addContent.sectionHint')}
                colorClass="text-zinc-700"
                onClick={() => handleSelectType('section')}
                disabled={!canAddSection}
                tooltip={t('addContent.sectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsection')}
                description={t('addContent.subsectionHint')}
                colorClass="text-zinc-700"
                onClick={() => handleSelectType('subsection')}
                disabled={!canAddSubsection}
                tooltip={t('addContent.subsectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsubsection')}
                description={t('addContent.subsubsectionHint')}
                colorClass="text-zinc-700"
                onClick={() => handleSelectType('subsubsection')}
                disabled={!canAddSubsubsection}
                tooltip={t('addContent.subsubsectionTooltip')}
              />
              <CategoryCard
                icon={ListTree}
                label={t('addContent.item')}
                description={t('addContent.itemHint')}
                colorClass="text-zinc-600"
                onClick={() => handleSelectType('item')}
                disabled={!canAddItem}
                tooltip={t('addContent.itemTooltip')}
              />
              <CategoryCard
                icon={GripHorizontal}
                label={t('addContent.separator')}
                description={t('addContent.separatorHint')}
                colorClass="text-zinc-400"
                onClick={() => handleSelectType('separator')}
                disabled={!canAddSeparator}
                tooltip={t('addContent.separatorTooltip')}
              />
            </div>
          </div>

          {/* Group 2: Évaluations & Devoirs */}
          <div className="space-y-2">
            <h3 className="ps-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t('addContent.groupAssessments')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryCard
                icon={TestTube}
                label={t('manageLessons.type.evaluation_diagnostic')}
                description={t('addContent.diagnosticHint')}
                colorClass="text-zinc-750"
                onClick={() => handleSelectType('evaluation_diagnostic')}
              />
              <CategoryCard
                icon={Home}
                label={t('manageLessons.type.devoir_maison')}
                description={t('addContent.homeworkHint')}
                colorClass="text-zinc-750"
                onClick={() => handleSelectType('devoir_maison')}
              />
              <CategoryCard
                icon={FileSignature}
                label={t('manageLessons.type.controle_continu')}
                description={t('addContent.assessmentHint')}
                colorClass="text-zinc-750"
                onClick={() => handleSelectType('controle_continu')}
              />
            </div>
          </div>

          {/* Group 3: Corrections */}
          <div className="space-y-2">
            <h3 className="ps-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t('addContent.groupCorrections')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryCard
                icon={CheckCheck}
                label={t('manageLessons.type.correction_devoir_maison')}
                description={t('addContent.homeworkCorrectionHint')}
                colorClass="text-emerald-700"
                onClick={() => handleSelectType('correction_devoir_maison')}
              />
              <CategoryCard
                icon={CheckSquare}
                label={t('manageLessons.type.correction_controle_continu')}
                description={t('addContent.assessmentCorrectionHint')}
                colorClass="text-zinc-750"
                onClick={() => handleSelectType('correction_controle_continu')}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="custom-scrollbar flex h-full max-h-[55vh] flex-col overflow-y-auto pe-1">
          <form id="add-content-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            {renderForm()}
          </form>

          {/* Live LaTeX Render Area */}
          {hasMath && (
            <div className="mt-2 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2 animate-fade-in flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sigma className="h-3 w-3" />
                  <span>{t('descriptionModal.preview')}</span>
                </span>
                <span className="text-[9px] text-zinc-400 font-medium">{t('descriptionModal.generated')}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-inner text-xs text-zinc-800 leading-relaxed overflow-x-auto min-h-[50px] flex flex-col justify-center">
                <MathJax hideUntilTypeset="first">
                  {formData.title || formData.name || formData.content ? (
                    <div className="font-semibold text-zinc-800 break-words">
                      {formData.title || formData.name || formData.content}
                    </div>
                  ) : null}
                  {formData.description ? (
                    <div className="text-zinc-500 mt-1.5 whitespace-pre-wrap break-words">
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

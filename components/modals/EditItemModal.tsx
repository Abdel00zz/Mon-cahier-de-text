import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { MathJax } from 'better-react-mathjax';
import { Indices, LessonsData, TopLevelItem } from '../../types';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '../../constants';
import { countOccurrencesOfType, findItem } from '../../utils/dataUtils';
import {
  ArrowLeft, Plus, MapPin, Book, Network, ListTree, GripHorizontal,
  TestTube, Home, FileSignature, CheckCheck, CheckSquare, Sigma, CircleAlert,
} from '../ui/icons';

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
      className={`relative flex items-start gap-3.5 p-3 rounded-2xl border text-left transition-all duration-150 select-none ${
        disabled
          ? 'bg-secondary/30 border-border/60 opacity-40 cursor-not-allowed'
          : 'bg-card hover:bg-secondary/40 border-border hover:border-primary active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-md'
      }`}
      title={tooltip}
    >
      <div className={`p-2.5 rounded-xl ${disabled ? 'bg-secondary text-muted-foreground/60' : `${colorClass} bg-secondary/30`} flex-shrink-0 flex items-center justify-center w-11 h-11`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-xs text-foreground leading-snug">{label}</div>
        {description && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5 leading-normal truncate">{description}</div>
        )}
        {disabled && tooltip && (
          <div className="text-[9px] text-destructive font-medium mt-1 leading-tight flex items-center gap-1">
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
    if (!selectedIndices || !isOpen) return "À la fin du cahier de textes";
    try {
      const { item } = findItem(lessonsData, selectedIndices);
      if (!item) return "À la fin du cahier de textes";
      const itemAny = item as any;
      const displayTitle = itemAny.title || itemAny.name || itemAny.content || (itemAny.type ? `${itemAny.type.charAt(0).toUpperCase() + itemAny.type.slice(1)}` : 'Élément');
      return `Après l'élément : "${displayTitle}"`;
    } catch {
      return "À la fin du cahier de textes";
    }
  }, [selectedIndices, lessonsData, isOpen]);

  let modalTitle = 'Ajouter du contenu';
  if (stage !== 'select' && selectedType) {
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelItem['type']];
    if (config) {
      modalTitle = `Ajouter : ${config.name}`;
    } else if (selectedType === 'section') {
      modalTitle = "Ajouter : Section";
    } else if (selectedType === 'subsection') {
      modalTitle = "Ajouter : Sous-section";
    } else if (selectedType === 'subsubsection') {
      modalTitle = "Ajouter : Sous-sous-section";
    } else if (selectedType === 'item') {
      modalTitle = "Ajouter : Élément";
    } else if (selectedType === 'separator') {
      modalTitle = "Ajouter : Séparateur";
    }
  }

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const config = TOP_LEVEL_TYPE_CONFIG[type as TopLevelItem['type']];
    let initialData: any = {};

    if (config) {
      // Types récurrents : titre auto-suggéré « Contrôle continu N » (N =
      // occurrences existantes dans le cahier + 1). Simple suggestion — le
      // champ reste librement modifiable par le professeur.
      initialData.title = config.autoNumber
        ? `${config.name} ${countOccurrencesOfType(lessonsData, type) + 1}`
        : config.name;
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

  const labelClasses = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

  // Math detected on currently edited form
  const hasMath = useMemo(() => {
    return hasMathSyntax(formData.title || formData.name || formData.content || formData.description);
  }, [formData]);

  const renderForm = () => {
    if (!selectedType) return null;
    const config = TOP_LEVEL_TYPE_CONFIG[selectedType as TopLevelItem['type']];
    if (config) {
      return (
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label htmlFor="title" className={labelClasses}>Titre pour "{config.name}"</label>
            <Input
              ref={initialFocusRef}
              type="text"
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder={`Ex: ${config.name} de mathématiques`}
              className="rounded-xl border-border h-11"
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
            ? 'Nom de la section'
            : selectedType === 'subsection'
              ? 'Nom de la sous-section'
              : 'Nom de la sous-sous-section';
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
                placeholder="Ex: Définitions et propriétés"
                className="rounded-xl border-border h-11"
              />
            </div>
          </div>
        );
      case 'item':
        return (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="itemType" className={labelClasses}>Type de contenu *</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger id="itemType" ref={selectFocusRef as any} className="rounded-xl border-border h-11 shadow-none">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIQUE_LESSON_ITEM_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="itemNumber" className={labelClasses}>Numéro</label>
                <Input
                  ref={initialFocusRef}
                  type="text"
                  id="itemNumber"
                  value={formData.number || ''}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="Ex: 1, 1.2, A..."
                  className="rounded-xl border-border h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="itemTitle" className={labelClasses}>Titre de l'élément</label>
              <Input
                type="text"
                id="itemTitle"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Saisir un titre optionnel..."
                className="rounded-xl border-border h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="itemDescription" className={labelClasses}>Description / Contenu (LaTeX supporté)</label>
              <Textarea
                id="itemDescription"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Établir que la fonction f est continue sur $$[0, +\infty[$$..."
                className="rounded-xl border-border"
              />
            </div>
          </div>
        );
      case 'separator':
        return (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label htmlFor="separatorContent" className={labelClasses}>Texte du séparateur</label>
              <Input
                ref={initialFocusRef}
                type="text"
                id="separatorContent"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Ex: Travail effectué, Fin de séance, etc."
                className="rounded-xl border-border h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="separatorDate" className={labelClasses}>Date du séparateur (optionnelle)</label>
              <Input
                type="date"
                id="separatorDate"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="rounded-xl border-border h-11"
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
          className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-secondary flex-shrink-0"
          aria-label="Retour à la sélection"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
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
          ? "Choisissez l'élément à insérer dans votre progression pédagogique" 
          : "Renseignez les détails de l'élément à ajouter"
      }
      maxWidth={stage === 'select' ? "2xl" : "lg"}
      footer={
        stage === 'form' ? (
          <>
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">
              Annuler
            </Button>
            <Button 
              type="submit" 
              form="add-content-form" 
              className="rounded-xl bg-primary hover:bg-primary/90 font-semibold px-5 shadow-sm"
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Insérer
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">
            Fermer
          </Button>
        )
      }
    >
      {/* Context Target Banner */}
      <div className="mb-4 p-3 bg-secondary/50 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-start gap-2.5 flex-shrink-0">
        <div className="p-1.5 bg-card border border-border text-muted-foreground/60 rounded-lg flex-shrink-0">
          <MapPin className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground/80">Point d'insertion ciblé</div>
          <div className="truncate mt-0.5 text-muted-foreground font-medium">{targetLocationLabel}</div>
        </div>
      </div>

      {stage === 'select' ? (
        <div className="space-y-5 py-1 overflow-y-auto max-h-[50vh] pr-1">
          {/* Group 1: Cours & Structures */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider pl-1">
              Structures & Cours
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryCard
                icon={Book}
                label="Chapitre"
                description="Ajoute un grand chapitre de cours à la racine"
                colorClass="text-primary bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('chapter')}
              />
              <CategoryCard
                icon={Network}
                label="Section"
                description="Ajoute une partie au chapitre ou bloc sélectionné"
                colorClass="text-signature-gold bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('section')}
                disabled={!canAddSection}
                tooltip="Sélectionnez un chapitre ou une section"
              />
              <CategoryCard
                icon={Network}
                label="Sous-section"
                description="Ajoute un niveau sous la section sélectionnée"
                colorClass="text-signature-gold bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('subsection')}
                disabled={!canAddSubsection}
                tooltip="Sélectionnez une section"
              />
              <CategoryCard
                icon={Network}
                label="Sous-sous-section"
                description="Ajoute un niveau sous la sous-section sélectionnée"
                colorClass="text-signature-gold bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('subsubsection')}
                disabled={!canAddSubsubsection}
                tooltip="Sélectionnez une sous-section"
              />
              <CategoryCard
                icon={ListTree}
                label="Élément"
                description="Ajoute un exercice, cours, méthode, application..."
                colorClass="text-muted-foreground bg-secondary border-border"
                onClick={() => handleSelectType('item')}
                disabled={!canAddItem}
                tooltip="Sélectionnez une section pour insérer un élément"
              />
              <CategoryCard
                icon={GripHorizontal}
                label="Séparateur"
                description="Insère une démarcation chronologique de séance"
                colorClass="text-muted-foreground/60 bg-secondary/50 border-border/50"
                onClick={() => handleSelectType('separator')}
                disabled={!canAddSeparator}
                tooltip="Sélectionnez un élément pour ajouter un séparateur après"
              />
            </div>
          </div>

          {/* Group 2: Évaluations & Devoirs */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider pl-1">
              Évaluations & Devoirs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryCard
                icon={TestTube}
                label="Évaluation diagnostique"
                description="Évaluer les prérequis en début de chapitre"
                colorClass="text-primary bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('evaluation_diagnostic')}
              />
              <CategoryCard
                icon={Home}
                label="Devoir maison"
                description="Planifier un travail personnel hors-classe"
                colorClass="text-signature-gold bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('devoir_maison')}
              />
              <CategoryCard
                icon={FileSignature}
                label="Contrôle continu"
                description="Ajouter un devoir surveillé ou un quiz régulier"
                colorClass="text-muted-foreground bg-secondary border-border"
                onClick={() => handleSelectType('controle_continu')}
              />
            </div>
          </div>

          {/* Group 3: Corrections */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider pl-1">
              Corrections d'épreuves
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryCard
                icon={CheckCheck}
                label="Correction Devoir maison"
                description="Ajouter le corrigé complet d'un DM"
                colorClass="text-signature-gold bg-primary/10 border-primary/20"
                onClick={() => handleSelectType('correction_devoir_maison')}
              />
              <CategoryCard
                icon={CheckSquare}
                label="Correction Contrôle continu"
                description="Ajouter le barème et corrigé d'un contrôle"
                colorClass="text-muted-foreground bg-secondary border-border"
                onClick={() => handleSelectType('correction_controle_continu')}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full max-h-[55vh] overflow-y-auto pr-1">
          <form id="add-content-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            {renderForm()}
          </form>

          {/* Live LaTeX Render Area */}
          {hasMath && (
            <div className="mt-2 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-fade-in flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sigma className="h-3 w-3" />
                  <span>Aperçu LaTeX en temps réel</span>
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-medium">Auto-généré</span>
              </div>
              <div className="bg-card/95 p-3 rounded-lg border border-primary/10 shadow-inner text-xs text-foreground leading-relaxed overflow-x-auto min-h-[50px] flex flex-col justify-center">
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

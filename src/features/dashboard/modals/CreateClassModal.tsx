import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dequal } from 'dequal';
import { uniq } from 'es-toolkit';
import { toast } from 'sonner';
import { ClassDraftSchema, type ClassDraftValues } from '@/domain/validation/schemas';
import { parseStudentNames } from '@/domain/evaluations/studentRoster';
import { ClassRosterFields } from './ClassRosterFields';
import { ClassColorField } from './ClassColorField';
import { ClassCreationProgress } from './ClassCreationProgress';
import type { ClassRoster } from '@/types';
import type { ClassInfo, Cycle } from '@/types';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from '@/components/ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, formatClassLevelGroupLabel, formatLocalizedClassDisplayName, formatLocalizedBranchForLevel, formatLocalizedSubjectDisplayName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { cn } from '@/lib/utils';
import { classNameForLevelAndGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/domain/classes/classGroup';
import { classLevelPartsFor } from '@/domain/classes/classLevelParts';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { classCyclePolicy, existingClassCycle, firstFreeGroup, initialClassDraft, reconcileClassCycle, usedGroupsForLevel, type WizardStep } from './classCreationFlow';
import type { ClassIdentityDraft } from '@/types';
import { useModalHaptics } from '@/hooks/useModalHaptics';
import { isTeachingSubject, isClassStream, streamLabelForMistake } from '@/domain/classes/subjectPolicy';
import './createClassModal.css';
interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: ClassIdentityDraft & { color?: string }) => void | Promise<void>;
  defaultCycle?: Cycle;
  teacherSubjects?: string[];
  teacherCycles?: Cycle[];
  existingClasses?: ClassInfo[];
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void | Promise<void>;
  onDelete?: () => void;
  roster?: ClassRoster;
  onRosterSave?: (baseNames: string[], names: string[]) => void | Promise<void>;
  initialSection?: 'identity' | 'students';
  suggestedStudentNames?: string[];
}

const COPY: Record<AppLocale, {
  createTitle: string; editTitle: string; editDescription: string;
  cancel: string; back: string; next: string; create: string; save: string; saving: string;
  cycle: string; cyclePlaceholder: string; level: string; branch: string; group: string; customLevel: string;
  otherCycle: string;
  groupHint: string; invalidGroup: string; duplicateGroup: string; decrementGroup: string; incrementGroup: string;
  subject: string; subjectPlaceholder: string; customLevelPlaceholder: string; customSubjectPlaceholder: string;
  createCustom: string; switchToOfficial: string; selectedClass: string; guidedLabel: string;
  streamAsSubjectWarning: (streamName: string) => string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Ajouter une nouvelle classe', editTitle: 'Modifier la classe',
    editDescription: 'Modifiez uniquement les informations utiles.',
    cancel: 'Annuler', back: 'Retour', next: 'Continuer', create: 'Créer la classe', save: 'Enregistrer', saving: 'Enregistrement…',
    cycle: 'Cycle', cyclePlaceholder: 'Choisir un cycle', level: 'Niveau scolaire', branch: 'Filière / Série', group: 'N° de groupe', customLevel: 'Nom du niveau',
    groupHint: 'Numéro libre proposé automatiquement.', invalidGroup: 'Saisissez un numéro de 1 à 99.', duplicateGroup: 'Ce groupe existe déjà pour cette classe.', decrementGroup: 'Groupe libre précédent', incrementGroup: 'Groupe libre suivant',
    subject: 'Matière', subjectPlaceholder: 'Choisir une matière', customLevelPlaceholder: 'Ex. : Groupe de soutien', customSubjectPlaceholder: 'Saisir la matière',
    createCustom: 'Autre niveau', switchToOfficial: 'Niveaux officiels', selectedClass: 'Classe sélectionnée', guidedLabel: 'Configuration guidée',
    streamAsSubjectWarning: (stream: string) => `« ${stream} » est une filière et non une matière — veuillez choisir la matière enseignée`,
    otherCycle: 'Autre cycle',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'ابدأ إضافة قسم جديد', editTitle: 'تعديل القسم',
    editDescription: 'عدّل المعلومات الضرورية فقط.',
    cancel: 'إلغاء', back: 'رجوع', next: 'متابعة', create: 'إنشاء القسم', save: 'حفظ', saving: 'جارٍ الحفظ…',
    cycle: 'السلك التعليمي', cyclePlaceholder: 'اختر السلك', level: 'المستوى الدراسي', branch: 'الشعبة / المسلك', group: 'رقم الفوج', customLevel: 'اسم المستوى',
    groupHint: 'يُقترح أول رقم متاح تلقائياً.', invalidGroup: 'أدخل رقماً من 1 إلى 99.', duplicateGroup: 'هذا الفوج موجود بالفعل لهذا القسم.', decrementGroup: 'الفوج المتاح السابق', incrementGroup: 'الفوج المتاح التالي',
    subject: 'المادة الدراسية', subjectPlaceholder: 'اختر المادة', customLevelPlaceholder: 'مثال: مجموعة الدعم', customSubjectPlaceholder: 'أدخل المادة',
    createCustom: 'مستوى مخصص', switchToOfficial: 'المستويات الرسمية', selectedClass: 'القسم المحدد', guidedLabel: 'إعداد موجّه',
    streamAsSubjectWarning: (stream: string) => `« ${stream} » شعبة أو مسلك دراسي وليست مادة — يرجى اختيار المادة التي تدرّسها لهذا القسم`,
    otherCycle: 'سلك آخر',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
  },
  en: {
    createTitle: 'Add a new class', editTitle: 'Edit class',
    editDescription: 'Edit only the information you need.',
    cancel: 'Cancel', back: 'Back', next: 'Continue', create: 'Create class', save: 'Save', saving: 'Saving…',
    cycle: 'Education cycle', cyclePlaceholder: 'Choose a cycle', level: 'Grade level', branch: 'Stream / Track', group: 'Group number', customLevel: 'Level name',
    groupHint: 'First free number proposed automatically.', invalidGroup: 'Enter a number from 1 to 99.', duplicateGroup: 'This group already exists for this class.', decrementGroup: 'Previous free group', incrementGroup: 'Next free group',
    subject: 'Subject', subjectPlaceholder: 'Choose a subject', customLevelPlaceholder: 'e.g. Support group', customSubjectPlaceholder: 'Enter subject',
    createCustom: 'Custom level', switchToOfficial: 'Official levels', selectedClass: 'Selected class', guidedLabel: 'Guided setup',
    streamAsSubjectWarning: (stream: string) => `“${stream}” is a study stream, not a subject — please choose the subject taught`,
    otherCycle: 'Another cycle',
    cycleLabels: { college: 'Middle school', lycee: 'High school', prepa: 'Preparatory class' },
  },
};

const uniqueValues = (values: string[]) => uniq(values.map(value => value.trim()).filter(Boolean));
const EMPTY_SUBJECTS: string[] = [];
const EMPTY_CYCLES: Cycle[] = [];
const EMPTY_CLASSES: ClassInfo[] = [];
const CLASS_COLOR_OPTIONS: ReadonlyArray<{ value: string; background: string; ink: string; label: Record<AppLocale, string> }> = [
  { value: 'rose', background: 'oklch(0.70 0.14 355)', ink: '#ffffff', label: { fr: 'Rose', ar: 'وردي', en: 'Rose' } },
  { value: 'lavender', background: 'oklch(0.66 0.19 285)', ink: '#ffffff', label: { fr: 'Violet', ar: 'بنفسجي', en: 'Purple' } },
  { value: 'sky', background: 'oklch(0.68 0.14 245)', ink: '#ffffff', label: { fr: 'Bleu', ar: 'أزرق', en: 'Blue' } },
  { value: 'mint', background: 'oklch(0.70 0.14 150)', ink: '#ffffff', label: { fr: 'Vert', ar: 'أخضر', en: 'Green' } },
  { value: 'sand', background: 'oklch(0.75 0.10 95)', ink: '#ffffff', label: { fr: 'Sable', ar: 'رملي', en: 'Sand' } },
  { value: 'coral', background: 'oklch(0.72 0.14 45)', ink: '#ffffff', label: { fr: 'Orange', ar: 'برتقالي', en: 'Orange' } },
];

const ChoiceCard: React.FC<{ children: React.ReactNode; onClick: () => void; selected?: boolean }> = ({ children, onClick, selected }) => (
  <button
    type="button"
    onClick={onClick}
    data-selected={selected ? 'true' : undefined}
    aria-pressed={selected}
    className="claude-choice-card"
  >
    <span className="font-medium text-[15px] sm:text-[16px]">{children}</span>
    {selected && (
      <span className="claude-choice-check" aria-hidden="true">
        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
      </span>
    )}
  </button>
);

export const CreateClassModal: React.FC<CreateClassModalProps> = props => (
  props.isOpen ? <ClassFormSession key={props.editingClass?.id ?? 'new'} {...props} /> : null
);

const ClassFormSession: React.FC<CreateClassModalProps> = ({
  isOpen, onClose, onCreate, defaultCycle = 'lycee', teacherSubjects = EMPTY_SUBJECTS, teacherCycles = EMPTY_CYCLES, existingClasses = EMPTY_CLASSES, editingClass = null, onUpdate, onDelete, roster, onRosterSave, initialSection = 'identity', suggestedStudentNames,
}) => {
  const { locale, t, isRtl } = useLocale();
  const haptics = useModalHaptics();
  /*
   * Sens de saisie des champs libres : ils suivent leur ÉCRITURE — un nom de
   * classe ou une matière écrit en arabe commence à droite, même dans une
   * interface latine — et le sens de l'interface quand ils sont vides (même
   * règle que les champs de contenu, voir ContentFields).
   */
  const fieldDir = (text: string) => (text ? 'auto' : isRtl ? 'rtl' : 'ltr');
  const copy = COPY[locale] ?? COPY.fr;
  const [initial] = useState(() => initialClassDraft(teacherCycles, uniqueValues(teacherSubjects), defaultCycle, editingClass));
  const { watch, setValue } = useForm<ClassDraftValues>({
    resolver: zodResolver(ClassDraftSchema),
    defaultValues: {
      cycle: initial.cycle,
      level: initial.level,
      levelGroupKey: initial.levelGroupKey,
      group: initial.group,
      subject: initial.subject,
      customMode: initial.customMode,
      customLevel: initial.customLevel,
      customSubject: initial.customSubject,
    },
  });
  const { cycle, level, levelGroupKey, group, subject, customMode, customLevel, customSubject } = watch();
  const setCycle = (val: Cycle) => setValue('cycle', val, { shouldDirty: true });
  const setLevel = (val: string) => setValue('level', val, { shouldDirty: true });
  const setLevelGroupKey = (val: ClassLevelGroupKey | '') => setValue('levelGroupKey', val, { shouldDirty: true });
  const setGroup = (val: string | ((curr: string) => string)) => {
    const nextVal = typeof val === 'function' ? val(group) : val;
    setValue('group', nextVal, { shouldDirty: true });
  };
  const setSubject = (val: string) => setValue('subject', val, { shouldDirty: true });
  const setCustomMode = (val: boolean | ((curr: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(customMode) : val;
    setValue('customMode', nextVal, { shouldDirty: true });
  };
  const setCustomLevel = (val: string) => setValue('customLevel', val, { shouldDirty: true });
  const setCustomSubject = (val: string) => setValue('customSubject', val, { shouldDirty: true });
  const defaultTone = useMemo(() => {
    if (editingClass?.color) return editingClass.color;
    const usedTones = new Set(existingClasses.map(c => c.color).filter(Boolean));
    const available = CLASS_COLOR_OPTIONS.find(opt => !usedTones.has(opt.value));
    return available ? available.value : CLASS_COLOR_OPTIONS[existingClasses.length % CLASS_COLOR_OPTIONS.length].value;
  }, [editingClass, existingClasses]);
  const [classColor, setClassColor] = useState(defaultTone);
  const [groupTouched, setGroupTouched] = useState(false);
  const [currentStep, setStep] = useState<WizardStep>(initial.step);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [section, setSection] = useState(initialSection);
  const [rosterBase] = useState(() => roster?.names ?? []);
  const [rosterText, setRosterText] = useState(() => rosterBase.join(' ؛ '));
  const [discardRoster, setDiscardRoster] = useState(false);
  const parsedRoster = useMemo(() => {
    try { return { names: parseStudentNames(rosterText), invalid: false }; }
    catch { return { names: [], invalid: true }; }
  }, [rosterText]);
  const rosterDirty = parsedRoster.invalid || !dequal(parsedRoster.names, rosterBase);
  const rosterSection = Boolean(editingClass && onRosterSave && section === 'students');
  const requestClose = () => {
    if (submittingRef.current) return;
    if (rosterDirty) setDiscardRoster(true); else onClose();
  };
  const formId = useId();
  const stepContentRef = useRef<HTMLDivElement>(null);

  const configuredSubjects = useMemo(() => uniqueValues(teacherSubjects), [teacherSubjects]);
  const subjectOptions = useMemo(() => {
    const options = configuredSubjects.length ? [...configuredSubjects] : [...SUBJECTS];
    if (editingClass?.subject && isTeachingSubject(editingClass.subject) && !options.includes(editingClass.subject)) {
      options.unshift(editingClass.subject);
    }
    return options;
  }, [configuredSubjects, editingClass?.subject]);
  const cyclePolicy = useMemo(() => classCyclePolicy(teacherCycles, existingClassCycle(editingClass)), [editingClass, teacherCycles]);
  const cycleOptions = cyclePolicy.options;
  /*
   * Le profil n'a qu'un cycle : l'étape « cycle » serait un clic inutile, mais
   * elle doit rester ATTEIGNABLE — sinon un professeur qui enseigne aussi en
   * prépa ne peut jamais créer cette classe. « Autre cycle » l'ouvre à la
   * demande (les trois cycles, ceux du profil en tête).
   */
  const [showAllCycles, setShowAllCycles] = useState(false);
  const hasCycleChoice = cyclePolicy.showChoice || showAllCycles;
  const step = !hasCycleChoice && currentStep === 'cycle' ? 'level' : currentStep;
  const isEditingStreamMistake = Boolean(editingClass?.subject && isClassStream(editingClass.subject));
  const showSubjectChoice = configuredSubjects.length !== 1 || Boolean(editingClass && (editingClass.subject !== configuredSubjects[0] || isEditingStreamMistake));
  const levelGroups = useMemo(() => classLevelGroupsForCycle(cycle), [cycle]);
  const singleLevelGroup = levelGroups.length === 1 ? levelGroups[0] : null;
  const activeLevelGroup = levelGroups.find(item => item.key === levelGroupKey) ?? levelGroups.find(item => item.levels.includes(level));
  const needsBranchChoice = !customMode && !singleLevelGroup && (activeLevelGroup ? activeLevelGroup.levels.length > 1 : levelGroups.some(item => item.levels.length > 1));
  const steps = useMemo<WizardStep[]>(() => [...(hasCycleChoice ? ['cycle'] as WizardStep[] : []), 'level', ...(needsBranchChoice ? ['branch'] as WizardStep[] : []), 'details'], [hasCycleChoice, needsBranchChoice]);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const effectiveLevel = customMode ? customLevel.trim() : level;
  const effectiveSubject = customMode ? (customSubject.trim() || subject) : subject;
  const activeStreamMistake = isEditingStreamMistake
    ? editingClass?.subject
    : (customMode && isClassStream(customSubject))
      ? customSubject
      : null;
  const streamWarning = activeStreamMistake ? copy.streamAsSubjectWarning(streamLabelForMistake(activeStreamMistake, locale)) : null;
  const normalizedGroup = normalizeGroupNumber(group);
  const usedGroups = useMemo(() => usedGroupsForLevel(existingClasses, effectiveLevel, editingClass?.id), [existingClasses, effectiveLevel, editingClass?.id]);
  const duplicateGroup = Boolean(normalizedGroup && usedGroups.has(normalizedGroup));
  const groupError = groupTouched && !normalizedGroup ? copy.invalidGroup : duplicateGroup ? copy.duplicateGroup : null;
  const isFormValid = Boolean(effectiveLevel && effectiveSubject && isTeachingSubject(effectiveSubject) && normalizedGroup && !duplicateGroup && (editingClass || cycleOptions.includes(cycle)));

  const adjacentFreeGroup = (direction: -1 | 1): string | null => {
    const start = normalizedGroup ? Number(normalizedGroup) : direction === 1 ? 0 : 100;
    for (let next = start + direction; next >= 1 && next <= 99; next += direction) {
      if (!usedGroups.has(String(next))) return String(next);
    }
    return null;
  };
  const changeGroup = (direction: -1 | 1) => {
    const next = adjacentFreeGroup(direction);
    if (!next) return;
    haptics.onSelect();
    setGroupTouched(true);
    setGroup(next);
  };

  const firstAvailableGroup = (classLevel: string): string => firstFreeGroup(usedGroupsForLevel(existingClasses, classLevel, editingClass?.id));

  useEffect(() => {
    stepContentRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (submitting) return;
    const next = reconcileClassCycle(teacherCycles, cycle, currentStep, Boolean(editingClass), hasCycleChoice);
    if (next.resetLevel) {
      setCycle(next.cycle);
      setLevel('');
      setLevelGroupKey('');
      setGroup('');
    }
    if (next.step !== currentStep) setStep(next.step);
  }, [teacherCycles, cycle, currentStep, editingClass, submitting, hasCycleChoice]);

  const chooseCycle = (nextCycle: Cycle) => {
    haptics.onSelect();
    if (nextCycle !== cycle) {
      setCycle(nextCycle);
      setLevel('');
      setLevelGroupKey('');
      if (!groupTouched) setGroup('');
    }
    setStep('level');
  };
  const chooseLevel = (nextLevel: string) => {
    haptics.onSelect();
    setLevel(nextLevel);
    setLevelGroupKey(levelGroups.find(item => item.levels.includes(nextLevel))?.key ?? '');
    setGroup(current => {
      const normalized = normalizeGroupNumber(current);
      const nextUsed = usedGroupsForLevel(existingClasses, nextLevel, editingClass?.id);
      if ((groupTouched || nextLevel === level) && normalized && !nextUsed.has(normalized)) return current;
      return firstAvailableGroup(nextLevel);
    });
    setStep('details');
  };
  const chooseLevelGroup = (nextGroup: ClassLevelGroupKey) => {
    haptics.onSelect();
    const selected = levelGroups.find(item => item.key === nextGroup);
    setLevelGroupKey(nextGroup);
    if (!selected || !selected.levels.includes(level)) setLevel('');
    if (selected && selected.levels.length > 1) { setStep('branch'); return; }
    if (selected?.levels[0]) chooseLevel(selected.levels[0]);
  };
  const continueCustomLevel = () => {
    const nextLevel = customLevel.trim();
    if (!nextLevel) return;
    haptics.onSelect();
    setGroup(current => current || firstAvailableGroup(nextLevel)); setStep('details');
  };
  const goBack = () => {
    haptics.onSelect();
    if (step === 'details') { setStep(needsBranchChoice ? 'branch' : 'level'); return; }
    if (step === 'branch') { setStep('level'); return; }
    if (step === 'level' && hasCycleChoice) setStep('cycle');
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    if (rosterSection) {
      if (submittingRef.current || parsedRoster.invalid || !rosterDirty || !onRosterSave) return;
      submittingRef.current = true; setSubmitting(true);
      try {
        await onRosterSave(rosterBase, parsedRoster.names);
        haptics.onConfirm(); toast.success(t('classRoster.saved')); onClose();
      } catch { haptics.onError(); setSaveError(t('common.error')); }
      finally { submittingRef.current = false; setSubmitting(false); }
      return;
    }
    if ((!editingClass && step !== 'details') || submittingRef.current || !isFormValid || !normalizedGroup) return;
    submittingRef.current = true;
    setSubmitting(true);
    const name = classNameForLevelAndGroup(effectiveLevel, normalizedGroup);
    /*
     * Le niveau officiel est décomposé une seule fois ici : le palier (« 2ème
     * Bac ») et la filière (« Sciences Physiques ») voyagent avec la classe au
     * lieu d'obliger les plans de devoirs à réinterpréter le nom. Une classe
     * hors liste garde son nom libre, sans identité inventée.
     */
    const identity = customMode ? null : classLevelPartsFor(cycle, effectiveLevel);
    const details = {
      name,
      subject: effectiveSubject,
      cycle,
      level: identity?.level,
      branch: identity?.branch || undefined,
      group: normalizedGroup,
      ...(classColor ? { color: classColor } : {}),
    };
    try {
      if (editingClass) {
        if (!onUpdate) return;
        if (rosterDirty && onRosterSave) {
          if (parsedRoster.invalid) return;
          await onRosterSave(rosterBase, parsedRoster.names);
        }
        await onUpdate(editingClass.id, details);
      } else {
        await onCreate(details);
      }
      haptics.onConfirm();
      onClose();
    } catch {
      haptics.onError();
      setSaveError(locale === 'ar' ? 'تعذّر حفظ القسم. بياناتك محفوظة هنا، حاول مجدداً.' : locale === 'en' ? 'Could not save. Your entries are still here. Please try again.' : 'Enregistrement impossible. Vos saisies sont conservées ici. Réessayez.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const selectedClassLabel = customMode ? customLevel : formatLocalizedClassDisplayName(level, locale, { includeClassPrefix: false });
  const editingLevelOptions = CLASS_LEVELS_BY_CYCLE[cycle] ?? [];
  const stepLabel = (item: WizardStep) => item === 'cycle' ? copy.cycle : item === 'level' ? copy.level : item === 'branch' ? copy.branch : copy.group;

  const [deletePending, setDeletePending] = useState(false);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'identity' : event.key === 'End' ? 'students'
      : (isRtl ? event.key === 'ArrowRight' : event.key === 'ArrowLeft') ? 'identity' : 'students';
    setSection(next);
    document.getElementById(`class-tab-${next}`)?.focus();
  };

  const groupControl = (
    <div className="flex items-center justify-center py-2">
      <div className="claude-stepper">
        <button
          type="button"
          onClick={() => changeGroup(-1)}
          disabled={!adjacentFreeGroup(-1)}
          aria-label={copy.decrementGroup}
          className="claude-stepper-btn"
        >
          −
        </button>
        <input
          id="class-group"
          value={group}
          onChange={event => { setGroupTouched(true); setGroup(sanitizeGroupNumberInput(event.target.value)); }}
          onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }}
          placeholder="1"
          inputMode="numeric"
          enterKeyHint="done"
          maxLength={2}
          aria-describedby="group-help"
          aria-invalid={Boolean(groupError)}
          className="claude-stepper-value bg-transparent border-0 outline-none p-0 w-12 text-center"
        />
        <button
          type="button"
          onClick={() => changeGroup(1)}
          disabled={!adjacentFreeGroup(1)}
          aria-label={copy.incrementGroup}
          className="claude-stepper-btn"
        >
          +
        </button>
      </div>
    </div>
  );

  const editConfiguration = editingClass && (
    <section className="space-y-3">
      {hasCycleChoice && (
        <div className="space-y-1">
          <label htmlFor="edit-class-cycle" className="block text-xs font-medium text-muted-foreground">
            {copy.cycle} :
          </label>
          <Select value={cycle} onValueChange={value => {
            const nextCycle = value as Cycle;
            setCycle(nextCycle);
            setLevel('');
            setLevelGroupKey('');
          }}>
            <SelectTrigger id="edit-class-cycle" className="h-[52px] rounded-[14px] border border-border bg-card">
              <SelectValue placeholder={copy.cyclePlaceholder} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <label htmlFor="edit-class-level">{copy.level} :</label>
          <button type="button" onClick={() => setCustomMode(value => !value)} className="text-[13px] text-[var(--cm-accent)] hover:underline">
            {customMode ? copy.switchToOfficial : copy.createCustom}
          </button>
        </div>
        {customMode ? (
          <Input id="edit-class-level" value={customLevel} dir={fieldDir(customLevel)} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-[52px] rounded-[14px] border border-border bg-card" />
        ) : (
          <Select value={level} onValueChange={value => { setLevel(value); setLevelGroupKey(levelGroups.find(item => item.levels.includes(value))?.key ?? ''); }}>
            <SelectTrigger id="edit-class-level" className="h-[52px] rounded-[14px] border border-border bg-card">
              <SelectValue placeholder={copy.level} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">{editingLevelOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <label htmlFor="edit-class-group" className="text-sm font-medium text-foreground">{copy.group} :</label>
        <div className="claude-stepper">
          <button type="button" onClick={() => changeGroup(-1)} disabled={!adjacentFreeGroup(-1)} aria-label={copy.decrementGroup} className="claude-stepper-btn">−</button>
          <input id="edit-class-group" value={group} onChange={event => { setGroupTouched(true); setGroup(sanitizeGroupNumberInput(event.target.value)); }} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} inputMode="numeric" enterKeyHint="done" maxLength={2} aria-invalid={Boolean(groupError)} aria-describedby={groupError ? 'edit-class-group-error' : undefined} className="claude-stepper-value bg-transparent border-0 outline-none p-0 w-12 text-center" />
          <button type="button" onClick={() => changeGroup(1)} disabled={!adjacentFreeGroup(1)} aria-label={copy.incrementGroup} className="claude-stepper-btn">+</button>
        </div>
      </div>

      {showSubjectChoice && (
        <div className="space-y-1 pt-1">
          <label htmlFor="edit-class-subject" className="block text-xs font-medium text-muted-foreground">{copy.subject} :</label>
          {customMode ? (
            <Input id="edit-class-subject" value={customSubject} dir={fieldDir(customSubject)} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-[52px] rounded-[14px] border border-border bg-card" />
          ) : (
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="edit-class-subject" className="h-[52px] rounded-[14px] border border-border bg-card">
                <SelectValue placeholder={copy.subjectPlaceholder} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {streamWarning && (
            <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium mt-1.5">
              {streamWarning}
            </p>
          )}
        </div>
      )}

      {groupError && <p id="edit-class-group-error" role="alert" className="text-xs font-semibold text-destructive">{groupError}</p>}
    </section>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={requestClose}
        blockDismiss={submitting}
        hideClose={submitting}
        maxWidth="sm"
        mobilePresentation="sheet"
        className="class-create-modal sm:max-w-md sm:rounded-2xl"
        headerClassName="border-b-0 px-5 pt-3 pb-1 bg-transparent"
        bodyClassName="px-5 py-3 space-y-4"
        footerClassName="border-t-0 px-5 py-3.5 bg-transparent"
        title={
          <div className="claude-sheet-header p-0">
            <div>
              <span className="claude-sheet-title">
                {editingClass ? copy.editTitle : copy.createTitle}
              </span>
              {editingClass && editingClass.name && (
                <p className="claude-sheet-subtitle">
                  {formatLocalizedClassDisplayName(editingClass.name, locale)}
                </p>
              )}
            </div>
          </div>
        }
        footer={(editingClass || stepIndex > 0 || (step === 'level' && customMode)) && (
          <fieldset disabled={submitting} className="flex w-full items-center justify-between gap-2.5">
            {editingClass && onDelete && !rosterSection && (
              <button
                type="button"
                onClick={() => {
                  if (!deletePending) {
                    setDeletePending(true);
                    haptics.onSelect();
                  } else {
                    onDelete();
                  }
                }}
                className="claude-btn-danger"
              >
                <span>{deletePending ? (locale === 'ar' ? 'تأكيد الحذف ؟' : 'Confirmer ?') : (locale === 'ar' ? 'حذف القسم' : t('dashboard.delete'))}</span>
              </button>
            )}

            {!editingClass && stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="claude-btn-secondary flex-1"
              >
                {copy.back}
              </button>
            )}

            {step === 'level' && customMode && (
              <button
                type="button"
                onClick={continueCustomLevel}
                disabled={!customLevel.trim()}
                className="claude-btn-primary flex-1"
              >
                {copy.next}
              </button>
            )}

            {(editingClass || step === 'details') && (
              <button
                type="submit"
                form={formId}
                disabled={submitting || (rosterSection ? !rosterDirty || parsedRoster.invalid : !isFormValid || (rosterDirty && parsedRoster.invalid))}
                className="claude-btn-primary flex-1"
              >
                {submitting ? copy.saving : editingClass ? copy.save : copy.create}
              </button>
            )}
          </fieldset>
        )}
      >
        {editingClass && onRosterSave && (
          <div className="claude-tabs mx-0 mb-3" role="tablist" aria-label={copy.editTitle} onKeyDown={handleTabKeyDown}>
            {(['identity', 'students'] as const).map(item => (
              <button
                key={item}
                type="button"
                role="tab"
                id={`class-tab-${item}`}
                aria-controls={`class-panel-${item}`}
                aria-selected={section === item}
                tabIndex={section === item ? 0 : -1}
                data-active={section === item ? 'true' : 'false'}
                onClick={() => setSection(item)}
                className="claude-tab-btn"
              >
                <span>{t(item === 'identity' ? 'classRoster.identity' : 'classRoster.title')}</span>
                {item === 'students' && (
                  <span className="claude-tab-badge">
                    {parsedRoster.names.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <form id={formId} onSubmit={handleSubmit} aria-busy={submitting} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-4 text-start font-sans">
          {saveError && <p role="alert" className="text-xs font-semibold text-destructive">{saveError}</p>}
          <fieldset disabled={submitting} className="min-w-0 space-y-4 border-0 p-0 m-0">
          {!editingClass && (
            <ClassCreationProgress
              steps={steps}
              currentIndex={stepIndex}
              label={copy.guidedLabel}
              stepLabel={stepLabel}
              onReturn={previous => { haptics.onSelect(); setStep(previous); }}
            />
          )}

          {!editingClass && (
            <div ref={stepContentRef} tabIndex={-1} aria-label={stepLabel(step)} key={step} className="outline-none">
              {step === 'cycle' && hasCycleChoice && (
                <section className="space-y-3">
                  <h3 className="sr-only">{copy.cycle}</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {cycleOptions.map(item => (
                      <ChoiceCard key={item} selected={item === cycle} onClick={() => chooseCycle(item)}>
                        {copy.cycleLabels[item]}
                      </ChoiceCard>
                    ))}
                  </div>
                </section>
              )}

              {step === 'level' && (
                <section className="space-y-3">
                  <div className="flex items-center justify-end gap-2">
                    <h3 className="sr-only">{copy.level}</h3>
                    {!editingClass && (
                      <button
                        type="button"
                        onClick={() => setCustomMode(value => !value)}
                        className="text-xs font-medium text-[var(--cm-accent)] hover:underline"
                      >
                        {customMode ? copy.switchToOfficial : copy.createCustom}
                      </button>
                    )}
                  </div>
                  {!customMode && !hasCycleChoice && (
                    <button
                      type="button"
                      onClick={() => { setShowAllCycles(true); setStep('cycle'); }}
                      className="w-full text-center py-2 px-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{copy.otherCycle} · {cycleOptions.map(item => copy.cycleLabels[item]).join(' / ')}</span>
                    </button>
                  )}
                  {customMode ? (
                    <div className="space-y-2">
                      <label htmlFor="class-custom-level" className="block text-xs font-medium text-muted-foreground">{copy.customLevel}</label>
                      <Input id="class-custom-level" value={customLevel} dir={fieldDir(customLevel)} onChange={event => setCustomLevel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); continueCustomLevel(); } }} placeholder={copy.customLevelPlaceholder} className="h-[52px] rounded-[14px]" autoFocus />
                    </div>
                  ) : singleLevelGroup ? (
                    <div className="grid grid-cols-1 gap-2.5">
                      {singleLevelGroup.levels.map(item => (
                        <ChoiceCard key={item} selected={item === level} onClick={() => chooseLevel(item)}>
                          {formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}
                        </ChoiceCard>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {levelGroups.map(item => (
                        <ChoiceCard key={item.key} selected={item.key === (levelGroupKey || activeLevelGroup?.key)} onClick={() => chooseLevelGroup(item.key)}>
                          {formatClassLevelGroupLabel(item.key, locale)}
                        </ChoiceCard>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {step === 'branch' && activeLevelGroup && (
                <section className="space-y-3">
                  <h3 className="sr-only">{copy.branch}</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {activeLevelGroup.levels.map(item => (
                      <ChoiceCard key={item} selected={item === level} onClick={() => chooseLevel(item)}>
                        {formatLocalizedBranchForLevel(item, locale)}
                      </ChoiceCard>
                    ))}
                  </div>
                </section>
              )}

              {step === 'details' && (
                <section className="space-y-4">
                  <div className="rounded-[16px] bg-[var(--cm-surface)] border border-[var(--cm-border)] p-4 space-y-3">
                    <div>
                      <p className="text-xs text-[var(--cm-text-muted)]">{copy.selectedClass}</p>
                      <p className="text-lg font-semibold text-foreground mt-0.5">{selectedClassLabel}</p>
                      {!customMode && level && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {activeLevelGroup && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 font-medium text-foreground/80">
                              {formatClassLevelGroupLabel(activeLevelGroup.key, locale)}
                            </span>
                          )}
                          {needsBranchChoice && (
                            <>
                              <span aria-hidden="true" className="opacity-40">·</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                                {formatLocalizedBranchForLevel(level, locale)}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1">
                      <label htmlFor="class-group" className="block text-xs font-medium text-foreground">{copy.group}</label>
                      {groupControl}
                      <p id="group-help" role={groupError ? 'alert' : undefined} className={cn('text-xs text-center', groupError ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                        {groupError ?? copy.groupHint}
                      </p>
                    </div>

                    {showSubjectChoice ? (
                      <div className="space-y-1 pt-1">
                        <label htmlFor="class-subject" className="block text-xs font-medium text-foreground">{copy.subject}</label>
                        {customMode ? (
                          <Input id="class-subject" value={customSubject} dir={fieldDir(customSubject)} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-11 rounded-xl" />
                        ) : (
                          <Select value={subject} onValueChange={setSubject}>
                            <SelectTrigger id="class-subject" className="h-11 rounded-xl">
                              <SelectValue placeholder={copy.subjectPlaceholder} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {streamWarning && (
                          <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium mt-1.5">
                            {streamWarning}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                        <span>{copy.subject} :</span>
                        <span className="font-semibold text-foreground">{formatLocalizedSubjectDisplayName(effectiveSubject, locale)}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          <div hidden={rosterSection} role="tabpanel" id="class-panel-identity" aria-labelledby="class-tab-identity" tabIndex={0}>
            {editConfiguration}
            {((!editingClass && step === 'details') || editingClass) && (
              <ClassColorField
                value={classColor}
                options={CLASS_COLOR_OPTIONS}
                locale={locale}
                onChange={setClassColor}
              />
            )}
          </div>
          {editingClass && onRosterSave && (
            <div hidden={!rosterSection} role="tabpanel" id="class-panel-students" aria-labelledby="class-tab-students" tabIndex={0}>
              <ClassRosterFields
                value={rosterText}
                onChange={setRosterText}
                names={parsedRoster.names}
                invalid={parsedRoster.invalid}
                changed={!dequal(roster?.names ?? [], rosterBase)}
                suggestedNames={suggestedStudentNames}
              />
            </div>
          )}
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog open={discardRoster} onOpenChange={setDiscardRoster} title={t('classRoster.discard')}
        description={t('classRoster.discardBody')} confirmLabel={t('classRoster.leave')} onConfirm={onClose} />
      {editingClass && onDelete && <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('dashboard.deleteNotebookTitle', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} description={t('dashboard.deleteNotebookDescription')} confirmLabel={t('dashboard.delete')} confirmationPhrase={formatLocalizedClassDisplayName(editingClass.name, locale)} confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} onConfirm={onDelete} />}
    </>
  );
};

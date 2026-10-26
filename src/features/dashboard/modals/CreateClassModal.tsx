import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { parseStudentNames } from '@/domain/evaluations/studentRoster';
import { ClassRosterFields } from './ClassRosterFields';
import { ClassCreationProgress } from './ClassCreationProgress';
import type { ClassRoster } from '@/types';
import type { ClassInfo, Cycle } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Plus, Users } from '@/components/ui/icons';
import { AnimatedSubmitButton } from '@/components/ui/animated-submit-button';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, formatClassLevelGroupLabel, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { cn } from '@/lib/utils';
import { classNameForLevelAndGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/domain/classes/classGroup';
import { classLevelPartsFor } from '@/domain/classes/classLevelParts';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { classCyclePolicy, existingClassCycle, firstFreeGroup, initialClassDraft, reconcileClassCycle, usedGroupsForLevel, type WizardStep } from './classCreationFlow';
import type { ClassIdentityDraft } from '@/types';
import { useModalHaptics } from '@/hooks/useModalHaptics';
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
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une classe', editTitle: 'Modifier la classe',
    editDescription: 'Modifiez uniquement les informations utiles.',
    cancel: 'Annuler', back: 'Retour', next: 'Continuer', create: 'Créer la classe', save: 'Enregistrer', saving: 'Enregistrement…',
    cycle: 'Cycle', cyclePlaceholder: 'Choisir un cycle', level: 'Classe', branch: 'Filière', group: 'N° de groupe', customLevel: 'Nom du niveau',
    groupHint: 'Numéro libre proposé automatiquement.', invalidGroup: 'Saisissez un numéro de 1 à 99.', duplicateGroup: 'Ce groupe existe déjà pour cette classe.', decrementGroup: 'Groupe libre précédent', incrementGroup: 'Groupe libre suivant',
    subject: 'Matière', subjectPlaceholder: 'Choisir une matière', customLevelPlaceholder: 'Ex. : Groupe de soutien', customSubjectPlaceholder: 'Saisir la matière',
    createCustom: 'Autre niveau', switchToOfficial: 'Niveaux officiels', selectedClass: 'Classe choisie', guidedLabel: 'Configuration guidée',
    otherCycle: 'Autre cycle',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم', editTitle: 'تعديل القسم',
    editDescription: 'عدّل المعلومات الضرورية فقط.',
    cancel: 'إلغاء', back: 'رجوع', next: 'متابعة', create: 'إنشاء القسم', save: 'حفظ', saving: 'جارٍ الحفظ…',
    cycle: 'السلك التعليمي', cyclePlaceholder: 'اختر السلك', level: 'القسم', branch: 'الشعبة', group: 'رقم الفوج', customLevel: 'اسم المستوى',
    groupHint: 'يُقترح أول رقم متاح تلقائياً.', invalidGroup: 'أدخل رقماً من 1 إلى 99.', duplicateGroup: 'هذا الفوج موجود بالفعل لهذا القسم.', decrementGroup: 'الفوج المتاح السابق', incrementGroup: 'الفوج المتاح التالي',
    subject: 'المادة الدراسية', subjectPlaceholder: 'اختر المادة', customLevelPlaceholder: 'مثال: مجموعة الدعم', customSubjectPlaceholder: 'أدخل المادة',
    createCustom: 'مستوى مخصص', switchToOfficial: 'المستويات الرسمية', selectedClass: 'القسم المختار', guidedLabel: 'إعداد موجّه',
    otherCycle: 'سلك آخر',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
  },
  en: {
    createTitle: 'Create class', editTitle: 'Edit class',
    editDescription: 'Edit only the information you need.',
    cancel: 'Cancel', back: 'Back', next: 'Continue', create: 'Create class', save: 'Save', saving: 'Saving…',
    cycle: 'Education cycle', cyclePlaceholder: 'Choose a cycle', level: 'Class', branch: 'Stream', group: 'Group number', customLevel: 'Level name',
    groupHint: 'First free number proposed automatically.', invalidGroup: 'Enter a number from 1 to 99.', duplicateGroup: 'This group already exists for this class.', decrementGroup: 'Previous free group', incrementGroup: 'Next free group',
    subject: 'Subject', subjectPlaceholder: 'Choose a subject', customLevelPlaceholder: 'e.g. Support group', customSubjectPlaceholder: 'Enter subject',
    createCustom: 'Custom level', switchToOfficial: 'Official levels', selectedClass: 'Selected class', guidedLabel: 'Guided setup',
    otherCycle: 'Another cycle',
    cycleLabels: { college: 'Middle school', lycee: 'High school', prepa: 'Preparatory class' },
  },
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
const EMPTY_SUBJECTS: string[] = [];
const EMPTY_CYCLES: Cycle[] = [];
const EMPTY_CLASSES: ClassInfo[] = [];
const CLASS_MODAL_DETENTS = [0.72, 0.92];

const ChoiceCard: React.FC<{ children: React.ReactNode; onClick: () => void; selected?: boolean }> = ({ children, onClick, selected }) => (
  <button
    type="button"
    onClick={onClick}
    data-selected={selected ? 'true' : undefined}
    aria-pressed={selected}
    className="class-create-option"
  >
    <span>{children}</span>
    <span className="class-create-option-mark" aria-hidden="true">{selected ? <Check /> : <Plus />}</span>
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
  const [cycle, setCycle] = useState<Cycle>(initial.cycle);
  const [level, setLevel] = useState(initial.level);
  const [levelGroupKey, setLevelGroupKey] = useState<ClassLevelGroupKey | ''>(initial.levelGroupKey);
  const [group, setGroup] = useState(initial.group);
  const [groupTouched, setGroupTouched] = useState(false);
  const [subject, setSubject] = useState(initial.subject);
  const [customMode, setCustomMode] = useState(initial.customMode);
  const [customLevel, setCustomLevel] = useState(initial.customLevel);
  const [customSubject, setCustomSubject] = useState(initial.customSubject);
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
  const rosterDirty = parsedRoster.invalid || JSON.stringify(parsedRoster.names) !== JSON.stringify(rosterBase);
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
    if (editingClass?.subject && !options.includes(editingClass.subject)) options.unshift(editingClass.subject);
    return options;
  }, [configuredSubjects, editingClass]);
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
  const showSubjectChoice = configuredSubjects.length !== 1 || Boolean(editingClass && editingClass.subject !== configuredSubjects[0]);
  const levelGroups = useMemo(() => classLevelGroupsForCycle(cycle), [cycle]);
  const activeLevelGroup = levelGroups.find(item => item.key === levelGroupKey) ?? levelGroups.find(item => item.levels.includes(level));
  const needsBranchChoice = !customMode && cycle !== 'college' && (activeLevelGroup ? activeLevelGroup.levels.length > 1 : levelGroups.some(item => item.levels.length > 1));
  const steps = useMemo<WizardStep[]>(() => [...(hasCycleChoice ? ['cycle'] as WizardStep[] : []), 'level', ...(needsBranchChoice ? ['branch'] as WizardStep[] : []), 'details'], [hasCycleChoice, needsBranchChoice]);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const effectiveLevel = customMode ? customLevel.trim() : level;
  const effectiveSubject = customMode ? (customSubject.trim() || subject) : subject;
  const normalizedGroup = normalizeGroupNumber(group);
  const usedGroups = useMemo(() => usedGroupsForLevel(existingClasses, effectiveLevel, editingClass?.id), [existingClasses, effectiveLevel, editingClass?.id]);
  const duplicateGroup = Boolean(normalizedGroup && usedGroups.has(normalizedGroup));
  const groupError = groupTouched && !normalizedGroup ? copy.invalidGroup : duplicateGroup ? copy.duplicateGroup : null;
  const isFormValid = Boolean(effectiveLevel && effectiveSubject && normalizedGroup && !duplicateGroup && (editingClass || cycleOptions.includes(cycle)));

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

  const groupControl = <div className="class-create-stepper flex min-w-0 items-center rounded-xl border border-border bg-background p-1 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
    <button type="button" onClick={() => changeGroup(-1)} disabled={!adjacentFreeGroup(-1)} aria-label={copy.decrementGroup} className="class-create-step class-create-step-down flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl font-medium text-foreground transition-[transform,background-color] duration-200 hover:bg-muted active:scale-95 disabled:opacity-40 motion-reduce:transition-none">−</button>
    <Input id="class-group" value={group} onChange={event => { setGroupTouched(true); setGroup(sanitizeGroupNumberInput(event.target.value)); }} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} placeholder="1–99" inputMode="numeric" enterKeyHint="done" maxLength={2} aria-describedby="group-help" aria-invalid={Boolean(groupError)} className="h-11 min-w-0 flex-1 border-0 bg-transparent text-center text-lg font-bold tabular-nums text-foreground shadow-none focus-visible:ring-0" />
    <button type="button" onClick={() => changeGroup(1)} disabled={!adjacentFreeGroup(1)} aria-label={copy.incrementGroup} className="class-create-step class-create-step-up flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-[transform,background-color] duration-200 hover:bg-muted active:scale-95 disabled:opacity-40 motion-reduce:transition-none"><Plus aria-hidden="true" className="h-5 w-5" /></button>
  </div>;

  const editConfiguration = editingClass && (
    <section className="keep-surface space-y-5 p-4 sm:p-5">
      {hasCycleChoice && (
        <div className="space-y-1.5">
          <label htmlFor="edit-class-cycle" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.cycle} :</label>
          <Select value={cycle} onValueChange={value => {
            const nextCycle = value as Cycle;
            setCycle(nextCycle);
            setLevel('');
            setLevelGroupKey('');
          }}>
            <SelectTrigger id="edit-class-cycle" className="!h-11 rounded-[8px] border-border bg-background text-sm"><SelectValue placeholder={copy.cyclePlaceholder} /></SelectTrigger>
            <SelectContent className="rounded-[12px]">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="edit-class-level" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.level} :</label>
          <button type="button" onClick={() => setCustomMode(value => !value)} className="min-h-11 px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2">
            {customMode ? copy.switchToOfficial : copy.createCustom}
          </button>
        </div>
        {customMode ? (
          <Input id="edit-class-level" value={customLevel} dir={fieldDir(customLevel)} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-11 rounded-lg border border-border bg-background text-foreground text-sm" />
        ) : (
          <Select value={level} onValueChange={value => { setLevel(value); setLevelGroupKey(levelGroups.find(item => item.levels.includes(value))?.key ?? ''); }}>
            <SelectTrigger id="edit-class-level" className="!h-11 rounded-[8px] border-border bg-background text-sm"><SelectValue placeholder={copy.level} /></SelectTrigger>
            <SelectContent className="rounded-[12px]">{editingLevelOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid gap-1.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:gap-3">
          <label htmlFor="edit-class-group" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.group} :</label>
            <Input id="edit-class-group" value={group} onChange={event => { setGroupTouched(true); setGroup(sanitizeGroupNumberInput(event.target.value)); }} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} inputMode="numeric" enterKeyHint="done" maxLength={2} aria-invalid={Boolean(groupError)} aria-describedby={groupError ? 'edit-class-group-error' : undefined} className="h-11 w-full rounded-[12px] border border-border bg-background text-center text-sm font-bold focus:border-primary" />
        </div>
        {showSubjectChoice && (
          <div className="grid gap-1.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:gap-3">
            <label htmlFor="edit-class-subject" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.subject} :</label>
            {customMode ? (
              <Input id="edit-class-subject" value={customSubject} dir={fieldDir(customSubject)} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-11 rounded-[12px] border-border bg-background text-sm" />
            ) : (
              <Select value={subject} onValueChange={setSubject}><SelectTrigger id="edit-class-subject" className="!h-11 rounded-[8px] border-border bg-background text-sm"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-[12px]">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>
            )}
          </div>
        )}
      </div>
      {groupError && <p id="edit-class-group-error" role="alert" className="text-xs font-semibold text-destructive">{groupError}</p>}
    </section>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={requestClose} blockDismiss={submitting} hideClose={submitting} title={
        <div className="class-create-heading">
          <span className="class-create-heading-icon" aria-hidden="true">
            <Users />
          </span>
          <span className="min-w-0">
            <span className="class-create-eyebrow">{hasCycleChoice ? copy.guidedLabel : copy.cycleLabels[cycle]}</span>
            <span className="class-create-title">{editingClass ? copy.editTitle : copy.createTitle}</span>
          </span>
        </div>
      } maxWidth="md" mobileDetents={CLASS_MODAL_DETENTS}
        elevation="high"
        className="class-create-modal sm:max-w-md sm:rounded-2xl"
        headerClassName="class-create-header"
        bodyClassName="class-create-body"
        footerClassName="class-create-actions"
        footer={<fieldset disabled={submitting} className="class-create-footer flex w-full min-w-0 items-center gap-2">
          {editingClass && onDelete && !rosterSection && <AnimatedTrashButton
            label={t('dashboard.delete')}
            variant="ghost"
            size="md"
            onClick={() => setConfirmDelete(true)}
            className="h-11 shrink-0 rounded-xl px-3 text-destructive hover:bg-destructive/5 hover:text-destructive sm:me-auto sm:px-4"
          />}
          {!editingClass && stepIndex > 0 && <Button type="button" variant="outline" onClick={goBack} className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold sm:me-auto sm:px-4 sm:text-sm">{copy.back}</Button>}
          <Button type="button" variant="ghost" onClick={requestClose} className="class-create-cancel h-11 shrink-0 rounded-xl px-3 text-sm sm:ms-auto sm:px-4">{copy.cancel}</Button>
          {step === 'level' && customMode && <Button type="button" onClick={continueCustomLevel} disabled={!customLevel.trim()} className="class-create-primary h-11 min-w-0 flex-1 px-3 text-xs font-bold shadow-sm sm:flex-none sm:px-5 sm:text-sm">{copy.next}</Button>}
          {(editingClass || step === 'details') && <AnimatedSubmitButton
            type="submit"
            form={formId}
            disabled={submitting || (rosterSection ? !rosterDirty || parsedRoster.invalid : !isFormValid || (rosterDirty && parsedRoster.invalid))}
            aria-busy={submitting}
            isSubmitting={submitting}
            icon={editingClass ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            label={editingClass ? copy.save : copy.create}
            loadingLabel={copy.saving}
            className="class-create-primary h-11 min-w-0 flex-1 rounded-xl px-3 text-xs font-bold shadow-sm sm:flex-none sm:px-5 sm:text-sm"
          />}
        </fieldset>}
      >
        {editingClass && onRosterSave && <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1" role="group" aria-label={copy.editTitle}>
          {(['identity', 'students'] as const).map(item => <button key={item} type="button" aria-pressed={section === item}
            onClick={() => setSection(item)} className={cn('min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors duration-150', section === item ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
            {t(item === 'identity' ? 'classRoster.identity' : 'classRoster.title')}
          </button>)}
        </div>}
        <form id={formId} onSubmit={handleSubmit} aria-busy={submitting} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-3.5 text-start">
          {saveError && <p role="alert" className="class-create-error">{saveError}</p>}
          <fieldset disabled={submitting} className="min-w-0 space-y-3.5">
          {!editingClass && <ClassCreationProgress steps={steps} currentIndex={stepIndex}
            label={copy.guidedLabel} stepLabel={stepLabel}
            onReturn={previous => { haptics.onSelect(); setStep(previous); }} />}

          {!editingClass && <div ref={stepContentRef} tabIndex={-1} aria-label={stepLabel(step)} key={step} className="class-create-stage outline-none">
          {step === 'cycle' && hasCycleChoice && <section className="space-y-2.5"><h3 className="text-sm font-bold text-foreground">{copy.cycle}</h3><div className="grid gap-2 sm:grid-cols-3">{cycleOptions.map(item => <button key={item} type="button" onClick={() => chooseCycle(item)} className={cn('class-create-choice flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-start text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] duration-200 active:scale-[0.98] motion-reduce:transition-none', item === cycle ? 'border-primary/55 bg-primary/5 text-foreground' : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40')}><span>{copy.cycleLabels[item]}</span>{item === cycle && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}</button>)}</div></section>}

          {step === 'level' && <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-medium text-foreground">{copy.level}</h3>{!editingClass && <button type="button" onClick={() => setCustomMode(value => !value)} className="min-h-11 px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2">{customMode ? copy.switchToOfficial : copy.createCustom}</button>}</div>
            {/* Le cycle n'est pas un filtre du profil : si le profil n'en liste
                qu'un, l'étape est masquée mais reste à un clic (collège → prépa). */}
            {!customMode && !hasCycleChoice && <button type="button" onClick={() => { setShowAllCycles(true); setStep('cycle'); }} className="min-h-11 rounded-xl border border-dashed border-border/90 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground cursor-pointer"><span className="sm:hidden">{copy.otherCycle}</span><span className="hidden sm:inline">{copy.otherCycle} · {cycleOptions.map(item => copy.cycleLabels[item]).join(' / ')}</span></button>}
            {customMode ? <div className="space-y-2"><label htmlFor="class-custom-level" className="block text-xs font-semibold text-foreground">{copy.customLevel}</label><Input id="class-custom-level" value={customLevel} dir={fieldDir(customLevel)} onChange={event => setCustomLevel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); continueCustomLevel(); } }} placeholder={copy.customLevelPlaceholder} className="h-11 rounded-xl border border-border bg-background text-foreground px-3.5" autoFocus /></div> : cycle === 'college' ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{CLASS_LEVELS_BY_CYCLE.college.map(item => <ChoiceCard key={item} selected={item === level} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{levelGroups.map(item => <ChoiceCard key={item.key} selected={item.key === (levelGroupKey || activeLevelGroup?.key)} onClick={() => chooseLevelGroup(item.key)}>{formatClassLevelGroupLabel(item.key, locale)}</ChoiceCard>)}</div>}
          </section>}

          {step === 'branch' && activeLevelGroup && <section className="space-y-2.5"><h3 className="text-sm font-bold text-foreground">{copy.branch}</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{activeLevelGroup.levels.map(item => <ChoiceCard key={item} selected={item === level} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div></section>}

          {step === 'details' && <section className="space-y-2.5"><div className="class-create-summary space-y-3 rounded-2xl border border-border bg-card p-3.5 text-card-foreground shadow-xs sm:p-4">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.selectedClass}</p><p className="mt-0.5 break-words text-base font-semibold tracking-tight text-foreground">{selectedClassLabel}</p></div>
            <div className="space-y-1.5 border-t border-border/70 pt-2.5"><label htmlFor="class-group" className="block text-xs font-bold text-foreground">{copy.group}</label>{groupControl}<p id="group-help" role={groupError ? 'alert' : undefined} className={cn('text-xs leading-snug', groupError ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{groupError ?? copy.groupHint}</p></div>
            {showSubjectChoice ? <div className="space-y-1.5 border-t border-border/70 pt-2.5"><label htmlFor="class-subject" className="block text-xs font-bold text-foreground">{copy.subject}</label>{customMode ? <Input id="class-subject" value={customSubject} dir={fieldDir(customSubject)} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-11 rounded-xl border-border bg-background text-sm" /> : <Select value={subject} onValueChange={setSubject}><SelectTrigger id="class-subject" className="!h-11 rounded-xl border-border bg-background text-sm"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-xl">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>}</div> : <div className="flex min-w-0 items-baseline gap-2 border-t border-border/70 pt-2.5 text-xs"><span className="font-semibold text-muted-foreground">{copy.subject} :</span><span className="min-w-0 break-words font-semibold text-foreground">{formatLocalizedSubjectDisplayName(effectiveSubject, locale)}</span></div>}
          </div></section>}
          </div>}
          <div hidden={rosterSection}>{editConfiguration}</div>
          {editingClass && onRosterSave && <div hidden={!rosterSection}>
            <ClassRosterFields value={rosterText} onChange={setRosterText} names={parsedRoster.names} invalid={parsedRoster.invalid}
              changed={JSON.stringify(roster?.names ?? []) !== JSON.stringify(rosterBase)} suggestedNames={suggestedStudentNames} />
          </div>}
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog open={discardRoster} onOpenChange={setDiscardRoster} title={t('classRoster.discard')}
        description={t('classRoster.discardBody')} confirmLabel={t('classRoster.leave')} onConfirm={onClose} />
      {editingClass && onDelete && <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('dashboard.deleteNotebookTitle', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} description={t('dashboard.deleteNotebookDescription')} confirmLabel={t('dashboard.delete')} confirmationPhrase={formatLocalizedClassDisplayName(editingClass.name, locale)} confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} onConfirm={onDelete} />}
    </>
  );
};

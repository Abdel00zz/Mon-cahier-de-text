import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ClassInfo, Cycle } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, ChevronRight, GraduationCap, Settings, Trash2, Sparkles } from '@/components/ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, formatClassLevelGroupLabel, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { cn } from '@/lib/utils';
import { classNameForLevelAndGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { classCyclePolicy, existingClassCycle, firstFreeGroup, initialClassDraft, reconcileClassCycle, usedGroupsForLevel, type WizardStep } from './classCreationFlow';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; color?: string }) => void | Promise<void>;
  defaultCycle?: Cycle;
  teacherSubjects?: string[];
  teacherCycles?: Cycle[];
  existingClasses?: ClassInfo[];
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void | Promise<void>;
  onDelete?: () => void;
}

const COPY: Record<AppLocale, {
  createTitle: string; editTitle: string; editDescription: string;
  cancel: string; back: string; next: string; create: string; save: string; saving: string;
  cycle: string; cyclePlaceholder: string; level: string; branch: string; group: string;
  groupHint: string; invalidGroup: string; duplicateGroup: string;
  subject: string; subjectPlaceholder: string; customLevelPlaceholder: string; customSubjectPlaceholder: string;
  createCustom: string; switchToOfficial: string; selectedClass: string; guidedLabel: string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une classe', editTitle: 'Modifier la classe',
    editDescription: 'Modifiez uniquement les informations utiles.',
    cancel: 'Annuler', back: 'Retour', next: 'Continuer', create: 'Créer', save: 'Enregistrer', saving: 'Enregistrement…',
    cycle: 'Cycle', cyclePlaceholder: 'Choisir un cycle', level: 'Classe', branch: 'Branche / filière', group: 'N° de groupe',
    groupHint: 'De 1 à 99. Le premier numéro libre est proposé automatiquement.', invalidGroup: 'Saisissez un numéro de 1 à 99.', duplicateGroup: 'Ce groupe existe déjà pour cette classe.',
    subject: 'Matière', subjectPlaceholder: 'Choisir une matière', customLevelPlaceholder: 'Ex. : Groupe de soutien', customSubjectPlaceholder: 'Saisir la matière',
    createCustom: 'Classe non listée', switchToOfficial: 'Liste officielle', selectedClass: 'Classe choisie', guidedLabel: 'Configuration guidée',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم', editTitle: 'تعديل القسم',
    editDescription: 'عدّل المعلومات الضرورية فقط.',
    cancel: 'إلغاء', back: 'رجوع', next: 'متابعة', create: 'إنشاء', save: 'حفظ', saving: 'جارٍ الحفظ…',
    cycle: 'السلك التعليمي', cyclePlaceholder: 'اختر السلك', level: 'القسم', branch: 'الشعبة أو المسلك', group: 'رقم الفوج',
    groupHint: 'من 1 إلى 99. يُقترح أول رقم فوج متاح تلقائياً.', invalidGroup: 'أدخل رقماً من 1 إلى 99.', duplicateGroup: 'هذا الفوج موجود بالفعل لهذا القسم.',
    subject: 'المادة الدراسية', subjectPlaceholder: 'اختر المادة', customLevelPlaceholder: 'مثال: مجموعة الدعم', customSubjectPlaceholder: 'أدخل المادة',
    createCustom: 'قسم غير مدرج', switchToOfficial: 'اللائحة الرسمية', selectedClass: 'القسم المختار', guidedLabel: 'إعداد موجّه',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
  },
  en: {
    createTitle: 'Create class', editTitle: 'Edit class',
    editDescription: 'Edit only the information you need.',
    cancel: 'Cancel', back: 'Back', next: 'Continue', create: 'Create', save: 'Save', saving: 'Saving…',
    cycle: 'Education cycle', cyclePlaceholder: 'Choose a cycle', level: 'Class', branch: 'Stream', group: 'Group number',
    groupHint: 'From 1 to 99. The first available number is proposed automatically.', invalidGroup: 'Enter a number from 1 to 99.', duplicateGroup: 'This group already exists for this class.',
    subject: 'Subject', subjectPlaceholder: 'Choose a subject', customLevelPlaceholder: 'e.g. Support group', customSubjectPlaceholder: 'Enter subject',
    createCustom: 'Class not listed', switchToOfficial: 'Official list', selectedClass: 'Selected class', guidedLabel: 'Guided setup',
    cycleLabels: { college: 'Middle school', lycee: 'High school', prepa: 'Preparatory class' },
  },
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
const EMPTY_SUBJECTS: string[] = [];
const EMPTY_CYCLES: Cycle[] = [];
const EMPTY_CLASSES: ClassInfo[] = [];
const CLASS_MODAL_DETENTS = [0.78, 0.94];

const ChoiceCard: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="keep-surface keep-interactive group flex min-h-[60px] w-full cursor-pointer items-center justify-center rounded-2xl border border-[#dadce0] dark:border-[#5f6368]/60 bg-white dark:bg-[#202124] px-5 py-3.5 text-center text-sm font-semibold text-[#202124] dark:text-[#e8eaed] transition-all duration-200 hover:border-[#bdc1c6] dark:hover:border-[#70757a] hover:bg-[#f8f9fa] dark:hover:bg-[#28292c] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]"
  >
    <span className="min-w-0 flex-1 leading-snug text-center">{children}</span>
  </button>
);

export const CreateClassModal: React.FC<CreateClassModalProps> = props => (
  props.isOpen ? <ClassFormSession key={props.editingClass?.id ?? 'new'} {...props} /> : null
);

const ClassFormSession: React.FC<CreateClassModalProps> = ({
  isOpen, onClose, onCreate, defaultCycle = 'lycee', teacherSubjects = EMPTY_SUBJECTS, teacherCycles = EMPTY_CYCLES, existingClasses = EMPTY_CLASSES, editingClass = null, onUpdate, onDelete,
}) => {
  const { locale, t } = useLocale();
  const copy = COPY[locale] ?? COPY.fr;
  const [initial] = useState(() => initialClassDraft(teacherCycles, uniqueValues(teacherSubjects), defaultCycle, editingClass));
  const [cycle, setCycle] = useState<Cycle>(initial.cycle);
  const [level, setLevel] = useState(initial.level);
  const [levelGroupKey, setLevelGroupKey] = useState<ClassLevelGroupKey | ''>(initial.levelGroupKey);
  const [group, setGroup] = useState(initial.group);
  const [subject, setSubject] = useState(initial.subject);
  const [customMode, setCustomMode] = useState(initial.customMode);
  const [customLevel, setCustomLevel] = useState(initial.customLevel);
  const [customSubject, setCustomSubject] = useState(initial.customSubject);
  const [currentStep, setStep] = useState<WizardStep>(initial.step);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
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
  const hasCycleChoice = cyclePolicy.showChoice;
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
  const groupError = group.trim() && !normalizedGroup ? copy.invalidGroup : duplicateGroup ? copy.duplicateGroup : null;
  const isFormValid = Boolean(effectiveLevel && effectiveSubject && normalizedGroup && !duplicateGroup && (editingClass || cycleOptions.includes(cycle)));

  const firstAvailableGroup = (classLevel: string): string => firstFreeGroup(usedGroupsForLevel(existingClasses, classLevel, editingClass?.id));

  useEffect(() => {
    stepContentRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (submitting) return;
    const next = reconcileClassCycle(teacherCycles, cycle, currentStep, Boolean(editingClass));
    if (next.resetLevel) {
      setCycle(next.cycle);
      setLevel('');
      setLevelGroupKey('');
      setGroup('');
    }
    if (next.step !== currentStep) setStep(next.step);
  }, [teacherCycles, cycle, currentStep, editingClass, submitting]);

  const chooseCycle = (nextCycle: Cycle) => { setCycle(nextCycle); setLevel(''); setLevelGroupKey(''); setGroup(''); setStep('level'); };
  const chooseLevel = (nextLevel: string) => {
    setLevel(nextLevel);
    setLevelGroupKey(levelGroups.find(item => item.levels.includes(nextLevel))?.key ?? '');
    setGroup(current => nextLevel === level && current ? current : firstAvailableGroup(nextLevel));
    setStep('details');
  };
  const chooseLevelGroup = (nextGroup: ClassLevelGroupKey) => {
    const selected = levelGroups.find(item => item.key === nextGroup);
    setLevelGroupKey(nextGroup); setLevel('');
    if (selected && selected.levels.length > 1) { setStep('branch'); return; }
    if (selected?.levels[0]) chooseLevel(selected.levels[0]);
  };
  const continueCustomLevel = () => {
    const nextLevel = customLevel.trim();
    if (!nextLevel) return;
    setGroup(current => current || firstAvailableGroup(nextLevel)); setStep('details');
  };
  const goBack = () => {
    if (step === 'details') { setStep(needsBranchChoice ? 'branch' : 'level'); return; }
    if (step === 'branch') { setStep('level'); return; }
    if (step === 'level' && hasCycleChoice) setStep('cycle');
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!editingClass && step !== 'details') || submittingRef.current || !isFormValid || !normalizedGroup) return;
    submittingRef.current = true;
    setSubmitting(true);
    const name = classNameForLevelAndGroup(effectiveLevel, normalizedGroup);
    try {
      if (editingClass) {
        if (!onUpdate) return;
        await onUpdate(editingClass.id, { name, subject: effectiveSubject, cycle });
      } else {
        await onCreate({ name, subject: effectiveSubject, cycle });
      }
      onClose();
    } catch {
      toast.error(locale === 'ar' ? 'تعذّر حفظ القسم. حاول مرة أخرى.' : locale === 'en' ? 'Unable to save the class. Please try again.' : 'Impossible d’enregistrer la classe. Réessayez.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const selectedClassLabel = customMode ? customLevel : formatLocalizedClassDisplayName(level, locale, { includeClassPrefix: false });
  const editingLevelOptions = CLASS_LEVELS_BY_CYCLE[cycle] ?? [];
  const stepLabel = (item: WizardStep) => item === 'cycle' ? copy.cycle : item === 'level' ? copy.level : item === 'branch' ? copy.branch : copy.selectedClass;

  const editConfiguration = editingClass && (
    <section className="keep-surface space-y-5 p-4 sm:p-5">
      {hasCycleChoice && (
        <div className="space-y-1.5">
          <label htmlFor="edit-class-cycle" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.cycle}</label>
          <Select value={cycle} onValueChange={value => {
            const nextCycle = value as Cycle;
            setCycle(nextCycle);
            setLevel('');
            setLevelGroupKey('');
          }}>
            <SelectTrigger id="edit-class-cycle" className="!h-11 rounded-[8px] border-[#e0e0e0] bg-white dark:bg-[#202124] text-sm dark:border-white/15 dark:bg-slate-900"><SelectValue placeholder={copy.cyclePlaceholder} /></SelectTrigger>
            <SelectContent className="rounded-[12px]">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="edit-class-level" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.level}</label>
          <button type="button" onClick={() => { setCustomMode(value => !value); setLevel(''); setCustomLevel(''); }} className="min-h-11 px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2">
            {customMode ? copy.switchToOfficial : copy.createCustom}
          </button>
        </div>
        {customMode ? (
          <Input id="edit-class-level" value={customLevel} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-11 rounded-[8px] border-[#e0e0e0] bg-white dark:bg-[#202124] text-sm dark:border-white/15 dark:bg-slate-900" />
        ) : (
          <Select value={level} onValueChange={value => { setLevel(value); setLevelGroupKey(levelGroups.find(item => item.levels.includes(value))?.key ?? ''); }}>
            <SelectTrigger id="edit-class-level" className="!h-11 rounded-[8px] border-border bg-background text-sm"><SelectValue placeholder={copy.level} /></SelectTrigger>
            <SelectContent className="rounded-[12px]">{editingLevelOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid gap-1.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:gap-3">
          <label htmlFor="edit-class-group" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.group}</label>
          <Input id="edit-class-group" value={group} onChange={event => setGroup(sanitizeGroupNumberInput(event.target.value))} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} inputMode="numeric" enterKeyHint="done" maxLength={2} aria-invalid={Boolean(groupError)} className="h-11 w-full rounded-[12px] border border-border bg-background text-center text-sm font-bold focus:border-primary" />
        </div>
        {showSubjectChoice && (
          <div className="grid gap-1.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:gap-3">
            <label htmlFor="edit-class-subject" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.subject}</label>
            {customMode ? (
              <Input id="edit-class-subject" value={customSubject} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-11 rounded-[12px] border-border bg-background text-sm" />
            ) : (
              <Select value={subject} onValueChange={setSubject}><SelectTrigger id="edit-class-subject" className="!h-11 rounded-[8px] border-border bg-background text-sm"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-[12px]">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>
            )}
          </div>
        )}
      </div>
      {groupError && <p className="text-xs font-semibold text-destructive">{groupError}</p>}
    </section>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => { if (!submittingRef.current) onClose(); }} blockDismiss={submitting} hideClose={submitting} title={
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-[8px] border border-[#e0e0e0] bg-muted text-muted-foreground dark:border-[#5f6368]">
            {editingClass ? <Settings className="h-5 w-5 stroke-[2.2]" /> : (!editingClass && hasCycleChoice) ? <Sparkles className="h-5 w-5 stroke-[2.2] text-primary" /> : <GraduationCap className="h-5 w-5 stroke-[2.2]" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{hasCycleChoice ? copy.guidedLabel : copy.cycleLabels[cycle]}</span>
            <span className="mt-0.5 block text-lg sm:text-xl font-bold tracking-tight text-foreground">{editingClass ? copy.editTitle : copy.createTitle}</span>
          </span>
        </div>
      } description={editingClass ? copy.editDescription : undefined} maxWidth="xl" mobileDetents={CLASS_MODAL_DETENTS}
        className="border border-[#e0e0e0] bg-card shadow-xl dark:border-[#5f6368] sm:max-w-2xl sm:rounded-[12px]"
        headerClassName="border-b border-[#e0e0e0] dark:border-[#5f6368] bg-card px-5 pb-4 pt-5 sm:px-7 sm:pb-4 sm:pt-6"
        bodyClassName="bg-muted/20 px-5 py-5 sm:px-7 sm:py-6"
        footerClassName="border-t border-[#e0e0e0] dark:border-[#5f6368] bg-card px-5 py-3.5 sm:px-7 sm:py-4"
        footer={<fieldset disabled={submitting} className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {(editingClass && onDelete || !editingClass && stepIndex > 0) && <div className="flex min-h-11 items-center gap-2">
            {editingClass && onDelete && <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} className="h-11 w-full rounded-[12px] px-4 text-xs font-semibold sm:w-auto sm:text-sm"><Trash2 className="h-4 w-4" />{t('dashboard.delete')}</Button>}
            {!editingClass && stepIndex > 0 && <Button type="button" variant="outline" onClick={goBack} className="h-11 w-full rounded-[12px] px-4 text-xs font-semibold sm:w-auto sm:text-sm">
              {locale === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{copy.back}
            </Button>}
          </div>}
          <div className="grid grid-cols-2 gap-2 sm:ms-auto sm:flex sm:items-center">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 w-full rounded-[12px] border-slate-200 bg-white dark:bg-[#202124] px-4 text-xs font-semibold shadow-xs sm:w-auto sm:text-sm dark:border-white/10 dark:bg-white dark:bg-[#202124]/5">{copy.cancel}</Button>
            {step === 'cycle' && <Button type="button" onClick={() => chooseCycle(cycle)} className="h-11 w-full px-5 text-xs font-bold shadow-sm sm:w-auto sm:text-sm">{copy.next}{locale === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button>}
            {step === 'level' && customMode && <Button type="button" onClick={continueCustomLevel} disabled={!customLevel.trim()} className="h-11 w-full px-5 text-xs font-bold shadow-sm sm:w-auto sm:text-sm">{copy.next}{locale === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button>}
            {(editingClass || step === 'details') && <Button type="submit" form={formId} disabled={!isFormValid || submitting} aria-busy={submitting} className="h-11 w-full px-5 text-xs font-bold shadow-sm sm:w-auto sm:text-sm">{submitting ? copy.saving : editingClass ? copy.save : copy.create}</Button>}
          </div>
        </fieldset>}
      >
        <form id={formId} onSubmit={handleSubmit} aria-busy={submitting} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-5 text-start">
          <fieldset disabled={submitting} className="min-w-0 space-y-5">
          {!editingClass && <nav className="relative overflow-hidden rounded-[12px] border border-border bg-muted/40 px-3 py-4 shadow-xs sm:px-5 sm:py-5" aria-label={copy.guidedLabel}>
            <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
              {steps.map((item, index) => {
                const isComplete = index < stepIndex;
                const isActive = index === stepIndex;
                return <li key={item} className="relative flex min-w-0 flex-col items-center gap-2 text-center" aria-current={isActive ? 'step' : undefined}>
                  {index < steps.length - 1 && <span aria-hidden="true" className="absolute start-1/2 top-[18px] h-[3px] w-full rounded-full bg-border">
                    <span className={cn('block h-full origin-left rounded-full bg-primary transition-transform duration-500 motion-reduce:transition-none rtl:origin-right', isComplete ? 'scale-x-100' : 'scale-x-0')} />
                  </span>}
                  <span className={cn(
                    'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition-all duration-300 motion-reduce:transition-none sm:h-11 sm:w-10',
                    isComplete && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isActive && 'border-primary bg-card text-primary ring-4 ring-primary/10',
                    !isComplete && !isActive && 'border-border bg-card text-muted-foreground',
                  )}>
                    {isComplete ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
                    {isActive && <span aria-hidden="true" className="absolute -inset-2 -z-10 rounded-full border border-primary/15" />}
                  </span>
                  <span className={cn(
                    'max-w-full truncate px-1 text-[10px] font-bold leading-tight tracking-[-0.01em] transition-colors sm:text-[11px]',
                    isActive ? 'text-primary' : isComplete ? 'text-primary/80' : 'text-muted-foreground',
                  )}>{stepLabel(item)}</span>
                </li>;
              })}
            </ol>
          </nav>}

          {!editingClass && <div ref={stepContentRef} tabIndex={-1} aria-label={stepLabel(step)} key={step} className="outline-none animate-fade-in motion-reduce:animate-none">
          {step === 'cycle' && hasCycleChoice && <section className="space-y-3"><label htmlFor="class-cycle" className="block text-sm font-bold text-foreground">{copy.cycle}</label><Select value={cycle} onValueChange={value => setCycle(value as Cycle)}><SelectTrigger id="class-cycle" className="!h-12 rounded-[12px] border-border bg-card px-4 text-sm"><SelectValue placeholder={copy.cyclePlaceholder} /></SelectTrigger><SelectContent className="rounded-[12px]">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent></Select></section>}

          {step === 'level' && <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-medium text-foreground">{copy.level}</h3>{!editingClass && <button type="button" onClick={() => { setCustomMode(value => !value); setLevel(''); setLevelGroupKey(''); setGroup(''); }} className="min-h-11 px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2">{customMode ? copy.switchToOfficial : copy.createCustom}</button>}</div>
            {customMode ? <Input value={customLevel} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-12 rounded-2xl border-slate-300 bg-white dark:bg-[#202124] px-4 dark:border-white/15 dark:bg-slate-900" autoFocus /> : cycle === 'college' ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{CLASS_LEVELS_BY_CYCLE.college.map(item => <ChoiceCard key={item} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{levelGroups.map(item => <ChoiceCard key={item.key} onClick={() => chooseLevelGroup(item.key)}>{formatClassLevelGroupLabel(item.key, locale)}</ChoiceCard>)}</div>}
          </section>}

          {step === 'branch' && activeLevelGroup && <section className="space-y-3"><h3 className="text-sm font-bold text-foreground">{copy.branch}</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{activeLevelGroup.levels.map(item => <ChoiceCard key={item} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div></section>}

          {step === 'details' && <section className="space-y-3"><div className="keep-surface p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-start"><div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{copy.selectedClass}</p><p className="mt-1 text-lg font-medium tracking-tight text-foreground">{selectedClassLabel}</p><p id="group-help" className={cn('mt-1 text-[11px]', groupError ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{groupError ?? copy.groupHint}</p></div><div className="min-w-0 self-start"><label htmlFor="class-group" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{copy.group}</label><Input id="class-group" value={group} onChange={event => setGroup(sanitizeGroupNumberInput(event.target.value))} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} placeholder="1–99" inputMode="numeric" enterKeyHint="done" maxLength={2} aria-describedby="group-help" aria-invalid={Boolean(groupError)} className="h-11 w-full rounded-[12px] border border-border bg-background text-center text-sm font-medium text-foreground shadow-none focus:border-primary" /></div></div>
            {showSubjectChoice && <div className="mt-3 border-t border-border/55 pt-3"><label htmlFor="class-subject" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{copy.subject}</label>{customMode ? <Input id="class-subject" value={customSubject} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-11 rounded-[12px] border-border bg-background text-sm" /> : <Select value={subject} onValueChange={setSubject}><SelectTrigger id="class-subject" className="!h-11 rounded-[8px] border-border bg-background text-sm"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-[12px]">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>}</div>}
          </div></section>}
          </div>}
          {editConfiguration}
          </fieldset>
        </form>
      </Modal>

      {editingClass && onDelete && <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('dashboard.deleteNotebookTitle', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} description={t('dashboard.deleteNotebookDescription')} confirmLabel={t('dashboard.delete')} confirmationPhrase={formatLocalizedClassDisplayName(editingClass.name, locale)} confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} onConfirm={onDelete} />}
    </>
  );
};

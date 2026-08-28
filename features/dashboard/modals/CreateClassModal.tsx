import React, { useEffect, useMemo, useState } from 'react';
import type { ClassInfo, Cycle } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, ChevronRight, GraduationCap, Settings, Trash2 } from '@/components/ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, formatClassLevelGroupLabel, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { cn } from '@/lib/utils';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; color?: string }) => void;
  defaultTeacherName?: string;
  defaultCycle?: Cycle;
  teacherSubjects?: string[];
  teacherCycles?: Cycle[];
  existingClasses?: ClassInfo[];
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void;
  onDelete?: () => void;
}

type WizardStep = 'cycle' | 'level' | 'branch' | 'details';
type StepDirection = 'forward' | 'back';

const COPY: Record<AppLocale, {
  createTitle: string; editTitle: string; editDescription: string;
  cancel: string; back: string; next: string; create: string; save: string;
  cycle: string; cyclePlaceholder: string; level: string; branch: string; group: string;
  groupHint: string; invalidGroup: string; duplicateGroup: string;
  subject: string; subjectPlaceholder: string; customLevelPlaceholder: string; customSubjectPlaceholder: string;
  createCustom: string; switchToOfficial: string; selectedClass: string; guidedLabel: string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une classe', editTitle: 'Modifier la classe',
    editDescription: 'Modifiez uniquement les informations utiles.',
    cancel: 'Annuler', back: 'Retour', next: 'Continuer', create: 'Créer', save: 'Enregistrer',
    cycle: 'Cycle', cyclePlaceholder: 'Choisir un cycle', level: 'Classe / niveau', branch: 'Branche / filière', group: 'N° de groupe',
    groupHint: 'De 1 à 99. Le premier numéro libre est proposé automatiquement.', invalidGroup: 'Saisissez un numéro de 1 à 99.', duplicateGroup: 'Ce groupe existe déjà pour cette classe.',
    subject: 'Matière', subjectPlaceholder: 'Choisir une matière', customLevelPlaceholder: 'Ex. : Groupe de soutien', customSubjectPlaceholder: 'Saisir la matière',
    createCustom: 'Classe non listée', switchToOfficial: 'Liste officielle', selectedClass: 'Classe choisie', guidedLabel: 'Configuration guidée',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم', editTitle: 'تعديل القسم',
    editDescription: 'عدّل المعلومات الضرورية فقط.',
    cancel: 'إلغاء', back: 'رجوع', next: 'متابعة', create: 'إنشاء', save: 'حفظ',
    cycle: 'السلك التعليمي', cyclePlaceholder: 'اختر السلك', level: 'القسم / المستوى', branch: 'الشعبة أو المسلك', group: 'رقم الفوج',
    groupHint: 'من 1 إلى 99. يُقترح أول رقم فوج متاح تلقائياً.', invalidGroup: 'أدخل رقماً من 1 إلى 99.', duplicateGroup: 'هذا الفوج موجود بالفعل لهذا القسم.',
    subject: 'المادة الدراسية', subjectPlaceholder: 'اختر المادة', customLevelPlaceholder: 'مثال: مجموعة الدعم', customSubjectPlaceholder: 'أدخل المادة',
    createCustom: 'قسم غير مدرج', switchToOfficial: 'اللائحة الرسمية', selectedClass: 'القسم المختار', guidedLabel: 'إعداد موجّه',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
  },
  en: {
    createTitle: 'Create class', editTitle: 'Edit class',
    editDescription: 'Edit only the information you need.',
    cancel: 'Cancel', back: 'Back', next: 'Continue', create: 'Create', save: 'Save',
    cycle: 'Education cycle', cyclePlaceholder: 'Choose a cycle', level: 'Class / level', branch: 'Stream', group: 'Group number',
    groupHint: 'From 1 to 99. The first available number is proposed automatically.', invalidGroup: 'Enter a number from 1 to 99.', duplicateGroup: 'This group already exists for this class.',
    subject: 'Subject', subjectPlaceholder: 'Choose a subject', customLevelPlaceholder: 'e.g. Support group', customSubjectPlaceholder: 'Enter subject',
    createCustom: 'Class not listed', switchToOfficial: 'Official list', selectedClass: 'Selected class', guidedLabel: 'Guided setup',
    cycleLabels: { college: 'Middle school', lycee: 'High school', prepa: 'Preparatory class' },
  },
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

const ChoiceCard: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex min-h-[4.25rem] w-full items-center gap-3.5 rounded-[18px] border border-border/80 bg-card px-4 py-3.5 text-start text-sm font-extrabold text-foreground shadow-2xs transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30 hover:shadow-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 active:translate-y-0 active:scale-[0.98]"
  >
    <span className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-muted text-primary transition-colors duration-200 group-hover:bg-primary/10">
      <GraduationCap className="h-[18px] w-[18px]" />
    </span>
    <span className="min-w-0 flex-1 leading-snug">{children}</span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/55 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
  </button>
);

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen, onClose, onCreate, defaultCycle = 'lycee', teacherSubjects = [], teacherCycles = [], existingClasses = [], editingClass = null, onUpdate, onDelete,
}) => {
  const { locale, t } = useLocale();
  const copy = COPY[locale] ?? COPY.fr;
  const [cycle, setCycle] = useState<Cycle>(defaultCycle);
  const [level, setLevel] = useState('');
  const [levelGroupKey, setLevelGroupKey] = useState<ClassLevelGroupKey | ''>('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [step, setStep] = useState<WizardStep>('level');
  const [stepDirection, setStepDirection] = useState<StepDirection>('forward');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const configuredSubjects = useMemo(() => uniqueValues(teacherSubjects), [teacherSubjects]);
  const subjectOptions = useMemo(() => {
    const options = configuredSubjects.length ? [...configuredSubjects] : [...SUBJECTS];
    if (editingClass?.subject && !options.includes(editingClass.subject)) options.unshift(editingClass.subject);
    return options;
  }, [configuredSubjects, editingClass]);
  const cycleOptions = useMemo(() => {
    const options = teacherCycles.length ? [...teacherCycles] : (Object.keys(copy.cycleLabels) as Cycle[]);
    if (editingClass?.cycle && !options.includes(editingClass.cycle)) options.unshift(editingClass.cycle);
    return options;
  }, [copy.cycleLabels, editingClass, teacherCycles]);
  const hasCycleChoice = cycleOptions.length > 1;
  const showSubjectChoice = configuredSubjects.length !== 1;
  const levelGroups = useMemo(() => classLevelGroupsForCycle(cycle), [cycle]);
  const activeLevelGroup = levelGroups.find(item => item.key === levelGroupKey) ?? levelGroups.find(item => item.levels.includes(level));
  const needsBranchChoice = !customMode && cycle === 'lycee' && Boolean(activeLevelGroup && activeLevelGroup.levels.length > 1);
  const steps = useMemo<WizardStep[]>(() => [...(hasCycleChoice ? ['cycle'] as WizardStep[] : []), 'level', ...(needsBranchChoice ? ['branch'] as WizardStep[] : []), 'details'], [hasCycleChoice, needsBranchChoice]);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const effectiveLevel = customMode ? customLevel.trim() : level;
  const effectiveSubject = customMode ? (customSubject.trim() || subject) : subject;
  const normalizedGroup = normalizeGroupNumber(group);
  const duplicateGroup = Boolean(normalizedGroup && effectiveLevel && existingClasses.some(classInfo => classInfo.id !== editingClass?.id && isSameClassGroup(classInfo.name, effectiveLevel, normalizedGroup)));
  const groupError = group.trim() && !normalizedGroup ? copy.invalidGroup : duplicateGroup ? copy.duplicateGroup : null;
  const isFormValid = Boolean(effectiveLevel && effectiveSubject && normalizedGroup && !duplicateGroup);

  const firstAvailableGroup = (classLevel: string): string => {
    for (let number = 1; number <= 99; number += 1) {
      const candidate = String(number);
      if (!existingClasses.some(classInfo => classInfo.id !== editingClass?.id && isSameClassGroup(classInfo.name, classLevel, candidate))) return candidate;
    }
    return '';
  };

  useEffect(() => {
    if (!isOpen) { setConfirmDelete(false); return; }
    if (editingClass) {
      const classCycle = editingClass.cycle ?? defaultCycle;
      const matchedLevel = (CLASS_LEVELS_BY_CYCLE[classCycle] ?? []).find(item => editingClass.name.startsWith(item));
      setCycle(classCycle);
      setSubject(configuredSubjects.length === 1 ? configuredSubjects[0] : (editingClass.subject || SUBJECTS[0]));
      setCustomSubject(editingClass.subject || '');
      if (matchedLevel) {
        setCustomMode(false); setLevel(matchedLevel);
        setLevelGroupKey(classLevelGroupsForCycle(classCycle).find(item => item.levels.includes(matchedLevel))?.key ?? '');
        setGroup(editingClass.name.slice(matchedLevel.length).trim());
      } else {
        const match = editingClass.name.match(/^(.*?)\s+(\d{1,2})$/);
        setCustomMode(true); setLevel(''); setLevelGroupKey(''); setCustomLevel(match?.[1] ?? editingClass.name); setGroup(match?.[2] ?? '');
      }
      setStepDirection('forward'); setStep('details');
      return;
    }
    const initialCycle = cycleOptions.includes(defaultCycle) ? defaultCycle : cycleOptions[0] ?? 'lycee';
    setCycle(initialCycle); setLevel(''); setLevelGroupKey(''); setGroup(''); setSubject(configuredSubjects[0] ?? SUBJECTS[0]);
    setCustomMode(false); setCustomLevel(''); setCustomSubject(''); setStepDirection('forward'); setStep(hasCycleChoice ? 'cycle' : 'level');
  }, [configuredSubjects, cycleOptions, defaultCycle, editingClass, hasCycleChoice, isOpen]);

  const moveToStep = (nextStep: WizardStep, direction: StepDirection) => {
    setStepDirection(direction);
    setStep(nextStep);
  };
  const chooseCycle = (nextCycle: Cycle) => { setCycle(nextCycle); setLevel(''); setLevelGroupKey(''); setGroup(''); moveToStep('level', 'forward'); };
  const chooseLevel = (nextLevel: string) => {
    setLevel(nextLevel);
    setLevelGroupKey(levelGroups.find(item => item.levels.includes(nextLevel))?.key ?? '');
    setGroup(current => current || firstAvailableGroup(nextLevel));
    moveToStep('details', 'forward');
  };
  const chooseLevelGroup = (nextGroup: ClassLevelGroupKey) => {
    const selected = levelGroups.find(item => item.key === nextGroup);
    setLevelGroupKey(nextGroup); setLevel('');
    if (cycle === 'lycee' && selected && selected.levels.length > 1) { moveToStep('branch', 'forward'); return; }
    if (selected?.levels[0]) chooseLevel(selected.levels[0]);
  };
  const continueCustomLevel = () => {
    const nextLevel = customLevel.trim();
    if (!nextLevel) return;
    setGroup(current => current || firstAvailableGroup(nextLevel)); moveToStep('details', 'forward');
  };
  const goBack = () => {
    if (step === 'details') { moveToStep(needsBranchChoice ? 'branch' : 'level', 'back'); return; }
    if (step === 'branch') { moveToStep('level', 'back'); return; }
    if (step === 'level' && hasCycleChoice) moveToStep('cycle', 'back');
  };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid || !normalizedGroup) return;
    const name = classNameForLevelAndGroup(effectiveLevel, normalizedGroup);
    if (editingClass && onUpdate) { onUpdate(editingClass.id, { name, subject: effectiveSubject, cycle, color: '' }); onClose(); return; }
    onCreate({ name, subject: effectiveSubject, cycle });
  };
  const selectedClassLabel = customMode ? customLevel : formatLocalizedClassDisplayName(level, locale, { includeClassPrefix: false });
  const editingLevelOptions = CLASS_LEVELS_BY_CYCLE[cycle] ?? [];
  const stepLabel = (item: WizardStep) => item === 'cycle' ? copy.cycle : item === 'level' ? copy.level : item === 'branch' ? copy.branch : copy.selectedClass;

  const editConfiguration = editingClass && (
    <section className="space-y-5 rounded-[22px] border border-border/75 bg-card p-4 shadow-[0_4px_18px_rgb(15_23_42/0.05)] sm:p-5">
      {hasCycleChoice && (
        <div className="space-y-1.5">
          <label htmlFor="edit-class-cycle" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.cycle}</label>
          <Select value={cycle} onValueChange={value => {
            const nextCycle = value as Cycle;
            setCycle(nextCycle);
            setLevel('');
            setLevelGroupKey('');
          }}>
            <SelectTrigger id="edit-class-cycle" className="!h-10 rounded-xl border-slate-300 bg-white text-sm dark:border-white/15 dark:bg-slate-900"><SelectValue placeholder={copy.cyclePlaceholder} /></SelectTrigger>
            <SelectContent className="rounded-xl">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="edit-class-level" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.level}</label>
          <button type="button" onClick={() => { setCustomMode(value => !value); setLevel(''); setCustomLevel(''); }} className="text-[11px] font-bold text-[#4255ff] hover:underline dark:text-[#aab4ff]">
            {customMode ? copy.switchToOfficial : copy.createCustom}
          </button>
        </div>
        {customMode ? (
          <Input id="edit-class-level" value={customLevel} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-10 rounded-xl border-slate-300 bg-white text-sm dark:border-white/15 dark:bg-slate-900" />
        ) : (
          <Select value={level} onValueChange={value => { setLevel(value); setLevelGroupKey(levelGroups.find(item => item.levels.includes(value))?.key ?? ''); }}>
            <SelectTrigger id="edit-class-level" className="!h-10 rounded-xl border-slate-300 bg-white text-sm dark:border-white/15 dark:bg-slate-900"><SelectValue placeholder={copy.level} /></SelectTrigger>
            <SelectContent className="rounded-xl">{editingLevelOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="edit-class-group" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.group}</label>
          <Input id="edit-class-group" value={group} onChange={event => setGroup(sanitizeGroupNumberInput(event.target.value))} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} inputMode="numeric" enterKeyHint="done" maxLength={2} aria-invalid={Boolean(groupError)} className="h-10 rounded-xl border-2 border-[#4255ff]/35 bg-[#f8f9ff] text-center text-sm font-bold focus:border-[#4255ff] dark:border-[#7788ff]/35 dark:bg-slate-950" />
        </div>
        {showSubjectChoice && (
          <div className="space-y-1.5">
            <label htmlFor="edit-class-subject" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.subject}</label>
            {customMode ? (
              <Input id="edit-class-subject" value={customSubject} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-10 rounded-xl border-slate-300 bg-white text-sm dark:border-white/15 dark:bg-slate-900" />
            ) : (
              <Select value={subject} onValueChange={setSubject}><SelectTrigger id="edit-class-subject" className="!h-10 rounded-xl border-slate-300 bg-white text-sm dark:border-white/15 dark:bg-slate-900"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-xl">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>
            )}
          </div>
        )}
      </div>
      {groupError && <p className="text-xs font-semibold text-destructive">{groupError}</p>}
    </section>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-[15px] border border-primary/15 bg-primary/10 text-primary">
            {editingClass ? <Settings className="h-5 w-5 stroke-[2.2]" /> : <GraduationCap className="h-5 w-5 stroke-[2.2]" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{copy.guidedLabel}</span>
            <span className="mt-0.5 block text-lg sm:text-xl font-bold tracking-tight text-foreground">{editingClass ? copy.editTitle : copy.createTitle}</span>
          </span>
        </div>
      } description={editingClass ? copy.editDescription : undefined} maxWidth="xl"
        className="border border-border/80 bg-card shadow-[0_30px_90px_rgb(15_23_42/0.22)] sm:max-w-2xl sm:rounded-[28px]"
        headerClassName="border-b border-border/55 bg-card px-5 pb-4 pt-5 sm:px-7 sm:pb-4 sm:pt-6"
        bodyClassName="bg-muted/20 px-5 py-5 sm:px-7 sm:py-6"
        footerClassName="border-t border-border/55 bg-card px-5 py-3.5 sm:px-7 sm:py-4"
        footer={<div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {(editingClass && onDelete || !editingClass && stepIndex > 0) && <div className="flex min-h-10 items-center gap-2">
            {editingClass && onDelete && <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} className="h-10 w-full rounded-xl px-4 text-xs font-semibold sm:w-auto sm:text-sm"><Trash2 className="h-4 w-4" />{t('dashboard.delete')}</Button>}
            {!editingClass && stepIndex > 0 && <Button type="button" variant="outline" onClick={goBack} className="h-10 w-full rounded-xl px-4 text-xs font-semibold sm:w-auto sm:text-sm">
              {locale === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{copy.back}
            </Button>}
          </div>}
          <div className="grid grid-cols-2 gap-2 sm:ms-auto sm:flex sm:items-center">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 w-full rounded-xl border-slate-200 bg-white px-4 text-xs font-semibold shadow-xs sm:w-auto sm:text-sm dark:border-white/10 dark:bg-white/5">{copy.cancel}</Button>
            {step === 'cycle' && <Button type="button" onClick={() => chooseCycle(cycle)} className="h-10 w-full rounded-xl bg-[#4255ff] px-5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(66,85,255,0.25)] hover:bg-[#3444df] sm:w-auto sm:text-sm">{copy.next}{locale === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button>}
            {step === 'level' && customMode && <Button type="button" onClick={continueCustomLevel} disabled={!customLevel.trim()} className="h-10 w-full rounded-xl bg-[#4255ff] px-5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(66,85,255,0.25)] hover:bg-[#3444df] sm:w-auto sm:text-sm">{copy.next}{locale === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button>}
            {(editingClass || step === 'details') && <Button type="submit" form="class-form" disabled={!isFormValid} className="h-10 w-full rounded-xl bg-[#4255ff] px-5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(66,85,255,0.25)] hover:bg-[#3444df] sm:w-auto sm:text-sm">{editingClass ? copy.save : copy.create}</Button>}
          </div>
        </div>}
      >
        <form id="class-form" onSubmit={handleSubmit} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-5 text-start">
          {!editingClass && <nav className="relative overflow-hidden rounded-[22px] border border-[#d9e7f7] bg-[#f4f8fc] px-3 py-4 shadow-[0_10px_28px_rgba(37,78,126,0.07)] sm:px-5 sm:py-5 dark:border-white/10 dark:bg-[#101c32]" aria-label={copy.guidedLabel}>
            <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
              {steps.map((item, index) => {
                const isComplete = index < stepIndex;
                const isActive = index === stepIndex;
                return <li key={item} className="relative flex min-w-0 flex-col items-center gap-2 text-center" aria-current={isActive ? 'step' : undefined}>
                  {index < steps.length - 1 && <span aria-hidden="true" className="absolute start-1/2 top-[18px] h-[3px] w-full rounded-full bg-[#dbe6f2] dark:bg-white/10">
                    <span className={cn('block h-full origin-left rounded-full bg-[#4d7ff0] transition-transform duration-500 motion-reduce:transition-none rtl:origin-right', isComplete ? 'scale-x-100' : 'scale-x-0')} />
                  </span>}
                  <span className={cn(
                    'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition-all duration-300 motion-reduce:transition-none sm:h-10 sm:w-10',
                    isComplete && 'border-[#4d7ff0] bg-[#4d7ff0] text-white shadow-[0_5px_12px_rgba(77,127,240,0.18)]',
                    isActive && 'border-[#2f66dc] bg-white text-[#2f66dc] shadow-[0_0_0_5px_rgba(77,127,240,0.10),0_6px_16px_rgba(37,78,126,0.12)] dark:bg-[#172743] dark:text-[#9bbcff]',
                    !isComplete && !isActive && 'border-[#d3dfed] bg-white/80 text-[#8496ab] dark:border-white/15 dark:bg-white/5 dark:text-slate-400',
                  )}>
                    {isComplete ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
                    {isActive && <span aria-hidden="true" className="absolute -inset-2 -z-10 rounded-full border border-[#4d7ff0]/15" />}
                  </span>
                  <span className={cn(
                    'max-w-full truncate px-1 text-[10px] font-bold leading-tight tracking-[-0.01em] transition-colors sm:text-[11px]',
                    isActive ? 'text-[#244f9f] dark:text-[#b8cdff]' : isComplete ? 'text-[#3c67bd] dark:text-[#91b4ff]' : 'text-[#7d8fa3] dark:text-slate-400',
                  )}>{stepLabel(item)}</span>
                </li>;
              })}
            </ol>
          </nav>}

          {!editingClass && <div key={step} className={cn('motion-reduce:animate-none', (stepDirection === 'forward') !== (locale === 'ar') ? 'animate-class-step-forward' : 'animate-class-step-back')}>
          {step === 'cycle' && hasCycleChoice && <section className="space-y-3"><label htmlFor="class-cycle" className="block text-sm font-bold text-foreground">{copy.cycle}</label><Select value={cycle} onValueChange={value => setCycle(value as Cycle)}><SelectTrigger id="class-cycle" className="!h-12 rounded-2xl border-slate-300 bg-white px-4 text-sm dark:border-white/15 dark:bg-slate-900"><SelectValue placeholder={copy.cyclePlaceholder} /></SelectTrigger><SelectContent className="rounded-2xl">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent></Select></section>}

          {step === 'level' && <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-extrabold text-foreground">{copy.level}</h3>{!editingClass && <button type="button" onClick={() => { setCustomMode(value => !value); setLevel(''); setLevelGroupKey(''); setGroup(''); }} className="text-[11px] font-bold text-[#4255ff] hover:underline dark:text-[#aab4ff]">{customMode ? copy.switchToOfficial : copy.createCustom}</button>}</div>
            {customMode ? <Input value={customLevel} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-12 rounded-2xl border-slate-300 bg-white px-4 dark:border-white/15 dark:bg-slate-900" autoFocus /> : cycle === 'college' ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{CLASS_LEVELS_BY_CYCLE.college.map(item => <ChoiceCard key={item} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{levelGroups.map(item => <ChoiceCard key={item.key} onClick={() => chooseLevelGroup(item.key)}>{formatClassLevelGroupLabel(item.key, locale)}</ChoiceCard>)}</div>}
          </section>}

          {step === 'branch' && activeLevelGroup && <section className="space-y-3"><h3 className="text-sm font-bold text-foreground">{copy.branch}</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{activeLevelGroup.levels.map(item => <ChoiceCard key={item} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div></section>}

          {step === 'details' && <section className="space-y-3"><div className="rounded-[20px] border border-border/75 bg-card p-4 shadow-[0_4px_16px_rgb(15_23_42/0.05)]"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{copy.selectedClass}</p><p className="mt-1 text-lg font-extrabold tracking-tight text-foreground">{selectedClassLabel}</p><p id="group-help" className={cn('mt-1 text-[11px]', groupError ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{groupError ?? copy.groupHint}</p></div><div className="space-y-1"><label htmlFor="class-group" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{copy.group}</label><Input id="class-group" value={group} onChange={event => setGroup(sanitizeGroupNumberInput(event.target.value))} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} placeholder="1–99" inputMode="numeric" enterKeyHint="done" maxLength={2} aria-describedby="group-help" aria-invalid={Boolean(groupError)} className="h-11 rounded-xl border border-border bg-background text-center text-sm font-extrabold text-foreground shadow-none focus:border-primary" /></div></div>
            {showSubjectChoice && <div className="mt-3 border-t border-border/55 pt-3"><label htmlFor="class-subject" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{copy.subject}</label>{customMode ? <Input id="class-subject" value={customSubject} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-10 rounded-xl border-border bg-background text-sm" /> : <Select value={subject} onValueChange={setSubject}><SelectTrigger id="class-subject" className="!h-10 rounded-xl border-border bg-background text-sm"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-xl">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>}</div>}
          </div></section>}
          </div>}
          {editConfiguration}
        </form>
      </Modal>

      {editingClass && onDelete && <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('dashboard.deleteNotebookTitle', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} description={t('dashboard.deleteNotebookDescription')} confirmLabel={t('dashboard.delete')} confirmationPhrase={formatLocalizedClassDisplayName(editingClass.name, locale)} confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} onConfirm={onDelete} />}
    </>
  );
};

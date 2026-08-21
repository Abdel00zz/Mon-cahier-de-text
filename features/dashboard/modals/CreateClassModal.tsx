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
  createTitle: string; editTitle: string; createDescription: string; editDescription: string;
  cancel: string; back: string; next: string; create: string; save: string;
  cycle: string; cyclePlaceholder: string; level: string; branch: string; group: string;
  groupHint: string; invalidGroup: string; duplicateGroup: string;
  subject: string; subjectPlaceholder: string; customLevelPlaceholder: string; customSubjectPlaceholder: string;
  createCustom: string; switchToOfficial: string; step: string; selectedClass: string; guidedLabel: string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une classe', editTitle: 'Modifier la classe',
    createDescription: 'Choisissez une information à la fois.', editDescription: 'Modifiez uniquement les informations utiles.',
    cancel: 'Annuler', back: 'Retour', next: 'Continuer', create: 'Créer', save: 'Enregistrer',
    cycle: 'Cycle', cyclePlaceholder: 'Choisir un cycle', level: 'Classe / niveau', branch: 'Branche / filière', group: 'N° de groupe',
    groupHint: 'De 1 à 99. Le premier numéro libre est proposé automatiquement.', invalidGroup: 'Saisissez un numéro de 1 à 99.', duplicateGroup: 'Ce groupe existe déjà pour cette classe.',
    subject: 'Matière', subjectPlaceholder: 'Choisir une matière', customLevelPlaceholder: 'Ex. : Groupe de soutien', customSubjectPlaceholder: 'Saisir la matière',
    createCustom: 'Classe non listée', switchToOfficial: 'Liste officielle', step: 'Étape {current} sur {total}', selectedClass: 'Classe choisie', guidedLabel: 'Configuration guidée',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم', editTitle: 'تعديل القسم',
    createDescription: 'اختر معلومة واحدة في كل خطوة.', editDescription: 'عدّل المعلومات الضرورية فقط.',
    cancel: 'إلغاء', back: 'رجوع', next: 'متابعة', create: 'إنشاء', save: 'حفظ',
    cycle: 'السلك التعليمي', cyclePlaceholder: 'اختر السلك', level: 'القسم / المستوى', branch: 'الشعبة أو المسلك', group: 'رقم الفوج',
    groupHint: 'من 1 إلى 99. يُقترح أول رقم فوج متاح تلقائياً.', invalidGroup: 'أدخل رقماً من 1 إلى 99.', duplicateGroup: 'هذا الفوج موجود بالفعل لهذا القسم.',
    subject: 'المادة الدراسية', subjectPlaceholder: 'اختر المادة', customLevelPlaceholder: 'مثال: مجموعة الدعم', customSubjectPlaceholder: 'أدخل المادة',
    createCustom: 'قسم غير مدرج', switchToOfficial: 'اللائحة الرسمية', step: 'المرحلة {current} من {total}', selectedClass: 'القسم المختار', guidedLabel: 'إعداد موجّه',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
  },
  en: {
    createTitle: 'Create class', editTitle: 'Edit class',
    createDescription: 'Choose one item at a time.', editDescription: 'Edit only the information you need.',
    cancel: 'Cancel', back: 'Back', next: 'Continue', create: 'Create', save: 'Save',
    cycle: 'Education cycle', cyclePlaceholder: 'Choose a cycle', level: 'Class / level', branch: 'Stream', group: 'Group number',
    groupHint: 'From 1 to 99. The first available number is proposed automatically.', invalidGroup: 'Enter a number from 1 to 99.', duplicateGroup: 'This group already exists for this class.',
    subject: 'Subject', subjectPlaceholder: 'Choose a subject', customLevelPlaceholder: 'e.g. Support group', customSubjectPlaceholder: 'Enter subject',
    createCustom: 'Class not listed', switchToOfficial: 'Official list', step: 'Step {current} of {total}', selectedClass: 'Selected class', guidedLabel: 'Guided setup',
    cycleLabels: { college: 'Middle school', lycee: 'High school', prepa: 'Preparatory class' },
  },
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

const ChoiceCard: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="group relative flex min-h-[4.5rem] w-full items-center gap-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-start text-sm font-extrabold text-slate-800 shadow-[0_3px_0_rgba(66,85,255,0.14),0_8px_22px_rgba(30,41,59,0.05)] transition-all duration-200 before:absolute before:inset-y-0 before:start-0 before:w-1 before:bg-gradient-to-b before:from-[#4255ff] before:to-[#8b5cf6] hover:-translate-y-1 hover:border-[#4255ff]/45 hover:text-[#4255ff] hover:shadow-[0_6px_0_rgba(66,85,255,0.22),0_14px_30px_rgba(66,85,255,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4255ff]/15 active:translate-y-0 active:shadow-[0_2px_0_rgba(66,85,255,0.18)] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:border-[#8b9cff]/50 dark:hover:text-[#aab4ff]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4255ff]/10 text-[#4255ff] transition-all duration-200 group-hover:scale-105 group-hover:bg-[#4255ff] group-hover:text-white dark:bg-[#7788ff]/15 dark:text-[#aab4ff]">
      <GraduationCap className="h-[18px] w-[18px]" />
    </span>
    <span className="min-w-0 flex-1 leading-snug">{children}</span>
    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#4255ff] rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
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
    <section className="relative space-y-5 overflow-hidden rounded-[24px] border border-[#4255ff]/15 bg-white p-4 shadow-[0_12px_35px_rgba(66,85,255,0.08)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-[#4255ff] before:via-[#7c3aed] before:to-[#f59e0b] sm:p-5 dark:border-white/10 dark:bg-slate-900/80">
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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#4255ff] to-[#7c3aed] text-white shadow-[0_8px_20px_rgba(66,85,255,0.28)] ring-1 ring-white/25">
            {editingClass ? <Settings className="h-5 w-5 stroke-[2.2]" /> : <GraduationCap className="h-5 w-5 stroke-[2.2]" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#4255ff] dark:text-[#aab4ff]">{copy.guidedLabel}</span>
            <span className="mt-0.5 block text-base font-extrabold tracking-[-0.02em] text-foreground sm:text-lg">{editingClass ? copy.editTitle : copy.createTitle}</span>
          </span>
        </div>
      } description={editingClass ? copy.editDescription : copy.createDescription} maxWidth="xl"
        className="border border-slate-200/80 bg-white/95 shadow-[0_32px_100px_rgba(30,41,59,0.24)] backdrop-blur-2xl sm:max-w-2xl sm:rounded-[32px] dark:border-white/[0.10] dark:bg-[#0c142b]/95"
        headerClassName="border-b border-[#4255ff]/10 bg-gradient-to-r from-white via-[#fafaff] to-[#f4f1ff] px-5 pb-4 pt-5 backdrop-blur-md sm:px-7 sm:pb-4 sm:pt-6 dark:border-white/[0.08] dark:from-slate-900/90 dark:via-[#111a38]/90 dark:to-[#171638]/90"
        bodyClassName="bg-[#f7f8fc] px-5 py-5 sm:px-7 sm:py-6 dark:bg-gradient-to-b dark:from-[#0d1630] dark:to-[#0a1125]"
        footerClassName="border-t border-slate-200/70 bg-white/70 px-5 py-3.5 backdrop-blur-md sm:px-7 sm:py-4 dark:border-white/[0.08] dark:bg-slate-900/60"
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
          {!editingClass && <nav className="rounded-[20px] border border-[#4255ff]/10 bg-gradient-to-r from-white to-[#f3f1ff] px-3 py-3 shadow-[0_6px_20px_rgba(66,85,255,0.06)] sm:px-4 dark:border-white/10 dark:from-slate-900 dark:to-[#161735]" aria-label={copy.step.replace('{current}', String(stepIndex + 1)).replace('{total}', String(steps.length))}>
            <div className="flex items-start">
              {steps.map((item, index) => <React.Fragment key={item}>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-extrabold transition-all duration-300', index < stepIndex ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm' : index === stepIndex ? 'border-[#4255ff] bg-[#4255ff] text-white shadow-[0_0_0_5px_rgba(66,85,255,0.12)]' : 'border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5')}>
                    {index < stepIndex ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className={cn('max-w-full truncate text-[9px] font-bold transition-colors sm:text-[10px]', index === stepIndex ? 'text-[#4255ff] dark:text-[#aab4ff]' : index < stepIndex ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>{stepLabel(item)}</span>
                </div>
                {index < steps.length - 1 && <span className={cn('mt-3.5 h-0.5 min-w-3 flex-1 rounded-full transition-colors duration-500', index < stepIndex ? 'bg-gradient-to-r from-emerald-400 to-[#4255ff]' : 'bg-slate-200 dark:bg-white/10')} />}
              </React.Fragment>)}
            </div>
            <p className="mt-2 text-center text-[10px] font-semibold text-muted-foreground">{copy.step.replace('{current}', String(stepIndex + 1)).replace('{total}', String(steps.length))}</p>
          </nav>}

          {!editingClass && <div key={step} className={cn('motion-reduce:animate-none', (stepDirection === 'forward') !== (locale === 'ar') ? 'animate-class-step-forward' : 'animate-class-step-back')}>
          {step === 'cycle' && hasCycleChoice && <section className="space-y-3"><label htmlFor="class-cycle" className="block text-sm font-bold text-foreground">{copy.cycle}</label><Select value={cycle} onValueChange={value => setCycle(value as Cycle)}><SelectTrigger id="class-cycle" className="!h-12 rounded-2xl border-slate-300 bg-white px-4 text-sm dark:border-white/15 dark:bg-slate-900"><SelectValue placeholder={copy.cyclePlaceholder} /></SelectTrigger><SelectContent className="rounded-2xl">{cycleOptions.map(item => <SelectItem key={item} value={item}>{copy.cycleLabels[item]}</SelectItem>)}</SelectContent></Select></section>}

          {step === 'level' && <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-extrabold text-foreground">{copy.level}</h3>{!editingClass && <button type="button" onClick={() => { setCustomMode(value => !value); setLevel(''); setLevelGroupKey(''); setGroup(''); }} className="text-[11px] font-bold text-[#4255ff] hover:underline dark:text-[#aab4ff]">{customMode ? copy.switchToOfficial : copy.createCustom}</button>}</div>
            {customMode ? <Input value={customLevel} onChange={event => setCustomLevel(event.target.value)} placeholder={copy.customLevelPlaceholder} className="h-12 rounded-2xl border-slate-300 bg-white px-4 dark:border-white/15 dark:bg-slate-900" autoFocus /> : cycle === 'college' ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{CLASS_LEVELS_BY_CYCLE.college.map(item => <ChoiceCard key={item} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{levelGroups.map(item => <ChoiceCard key={item.key} onClick={() => chooseLevelGroup(item.key)}>{formatClassLevelGroupLabel(item.key, locale)}</ChoiceCard>)}</div>}
          </section>}

          {step === 'branch' && activeLevelGroup && <section className="space-y-3"><h3 className="text-sm font-bold text-foreground">{copy.branch}</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{activeLevelGroup.levels.map(item => <ChoiceCard key={item} onClick={() => chooseLevel(item)}>{formatLocalizedClassDisplayName(item, locale, { includeClassPrefix: false })}</ChoiceCard>)}</div></section>}

          {step === 'details' && <section className="space-y-3"><div className="relative overflow-hidden rounded-[22px] border border-[#4255ff]/20 bg-gradient-to-br from-white via-[#f7f7ff] to-[#efedff] p-4 shadow-[0_12px_30px_rgba(66,85,255,0.09)] before:absolute before:inset-y-0 before:start-0 before:w-1 before:bg-gradient-to-b before:from-[#4255ff] before:to-[#8b5cf6] dark:border-[#7788ff]/25 dark:from-[#141a39] dark:via-[#121832] dark:to-[#1a1740]"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4255ff] dark:text-[#aab4ff]">{copy.selectedClass}</p><p className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{selectedClassLabel}</p><p id="group-help" className={cn('mt-1 text-[11px]', groupError ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{groupError ?? copy.groupHint}</p></div><div className="space-y-1"><label htmlFor="class-group" className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{copy.group}</label><Input id="class-group" value={group} onChange={event => setGroup(sanitizeGroupNumberInput(event.target.value))} onBlur={() => { const value = normalizeGroupNumber(group); if (value) setGroup(value); }} placeholder="1–99" inputMode="numeric" enterKeyHint="done" maxLength={2} aria-describedby="group-help" aria-invalid={Boolean(groupError)} className="h-11 rounded-xl border-2 border-[#4255ff]/35 bg-white text-center text-sm font-extrabold text-slate-900 shadow-inner focus:border-[#4255ff] dark:border-[#7788ff]/35 dark:bg-slate-950 dark:text-white" /></div></div>
            {showSubjectChoice && <div className="mt-3 border-t border-[#4255ff]/15 pt-3"><label htmlFor="class-subject" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{copy.subject}</label>{customMode ? <Input id="class-subject" value={customSubject} onChange={event => setCustomSubject(event.target.value)} placeholder={copy.customSubjectPlaceholder} className="h-10 rounded-xl border-[#4255ff]/20 bg-white text-sm dark:border-[#7788ff]/25 dark:bg-slate-950" /> : <Select value={subject} onValueChange={setSubject}><SelectTrigger id="class-subject" className="!h-10 rounded-xl border-[#4255ff]/20 bg-white text-sm dark:border-[#7788ff]/25 dark:bg-slate-950"><SelectValue placeholder={copy.subjectPlaceholder} /></SelectTrigger><SelectContent className="rounded-xl">{subjectOptions.map(item => <SelectItem key={item} value={item}>{formatLocalizedSubjectDisplayName(item, locale)}</SelectItem>)}</SelectContent></Select>}</div>}
          </div></section>}
          </div>}
          {editConfiguration}
        </form>
      </Modal>

      {editingClass && onDelete && <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('dashboard.deleteNotebookTitle', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} description={t('dashboard.deleteNotebookDescription')} confirmLabel={t('dashboard.delete')} confirmationPhrase={formatLocalizedClassDisplayName(editingClass.name, locale)} confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: formatLocalizedClassDisplayName(editingClass.name, locale) })} onConfirm={onDelete} />}
    </>
  );
};

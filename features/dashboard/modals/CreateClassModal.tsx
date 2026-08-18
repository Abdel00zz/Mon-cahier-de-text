import React, { useState, useEffect } from 'react';
import { Cycle, ClassInfo } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Trash2 } from '@/components/ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, formatClassLevelGroupLabel, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { cn } from '@/lib/utils';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { useLocale, AppLocale } from '@/i18n/LocaleProvider';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; color?: string; }) => void;
  defaultTeacherName?: string;
  /** cycle actif du tableau de bord, pré-sélectionné */
  defaultCycle?: Cycle;
  /** matières configurées dans les Paramètres, filtrent le choix de matière */
  teacherSubjects?: string[];
  /**
   * cycles configurés dans l'onboarding (puis modifiables dans les
   * Paramètres), un seul cycle : le champ disparaît, il est hérité ;
   * plusieurs : le choix est restreint à ces cycles
   */
  teacherCycles?: Cycle[];
  /** Classes déjà créées : évite deux groupes identiques au même niveau. */
  existingClasses?: ClassInfo[];
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void;
  onDelete?: () => void;
}

type ModalLanguage = AppLocale;

const COPY: Record<ModalLanguage, {
  createTitle: string;
  editTitle: string;
  createDescription: string;
  editDescription: string;
  cancel: string;
  create: string;
  save: string;
  cycle: string;
  cyclePlaceholder: string;
  level: string;
  levelPlaceholder: string;
  group: string;
  groupHint: string;
  invalidGroup: string;
  duplicateGroup: string;
  subject: string;
  subjectPlaceholder: string;
  customLevelPlaceholder: string;
  customSubjectPlaceholder: string;
  switchToOfficial: string;
  createCustom: string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une nouvelle classe',
    editTitle: 'Configurer la classe',
    createDescription: 'Choisissez le niveau et la matière ; le nom est composé automatiquement.',
    editDescription: 'Modifiez le niveau et la matière de la classe.',
    cancel: 'Annuler',
    create: 'Créer la classe',
    save: 'Enregistrer les modifications',
    cycle: 'Cycle',
    cyclePlaceholder: 'Choisir un cycle…',
    level: 'Niveau / classe',
    levelPlaceholder: 'Choisir un niveau…',
    group: 'N° de groupe',
    groupHint: 'Obligatoire : un numéro unique par niveau.',
    invalidGroup: 'Saisissez un numéro de 1 à 99.',
    duplicateGroup: 'Ce numéro est déjà utilisé pour ce niveau.',
    subject: 'Matière',
    subjectPlaceholder: 'Choisir une matière…',
    customLevelPlaceholder: 'Ex. : Groupe soutien, DAOL…',
    customSubjectPlaceholder: 'Saisir une matière…',
    switchToOfficial: '← Revenir à la liste officielle',
    createCustom: 'Niveau non listé ? Créer une classe personnalisée',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم جديد',
    editTitle: 'إعداد القسم والتهيئة',
    createDescription: 'اختر السلك، المستوى والمادة التعليمية؛ يُنشأ اسم القسم تلقائياً وفق التسميات الرسمية.',
    editDescription: 'تعديل سلك ومستوى القسم والمادة المسندة.',
    cancel: 'إلغاء',
    create: 'إنشاء القسم',
    save: 'حفظ التعديلات',
    cycle: 'السلك التعليمي',
    cyclePlaceholder: 'اختر السلك…',
    level: 'المستوى / الشعبة أو المسلك',
    levelPlaceholder: 'اختر المستوى…',
    group: 'رقم الفوج / المجموعة',
    groupHint: 'مطلوب: رقم الفوج داخل نفس المستوى (مثال: 1، 2...).',
    invalidGroup: 'يرجى إدخال رقم فوج صحيح من 1 إلى 99.',
    duplicateGroup: 'رقم الفوج هذا مستخدم بالفعل لهذا المستوى.',
    subject: 'المادة الدراسية',
    subjectPlaceholder: 'اختر المادة…',
    customLevelPlaceholder: 'مثال: حصة الدعم، أنشطة الأندية…',
    customSubjectPlaceholder: 'أدخل المادة أو التخصص…',
    switchToOfficial: 'العودة إلى اللائحة الرسمية للوزارة ←',
    createCustom: 'مستوى غير مدرج؟ إنشاء قسم أو نشاط مخصص',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية للمدارس العليا' },
  },
  en: {
    createTitle: 'Create New Class',
    editTitle: 'Configure Class',
    createDescription: 'Select level and subject; the official class name is composed automatically.',
    editDescription: 'Modify class level, subject, and group.',
    cancel: 'Cancel',
    create: 'Create Class',
    save: 'Save Changes',
    cycle: 'Education Cycle',
    cyclePlaceholder: 'Select a cycle…',
    level: 'Grade Level / Stream',
    levelPlaceholder: 'Select a level…',
    group: 'Group / Section #',
    groupHint: 'Required: unique group number per level (1–99).',
    invalidGroup: 'Please enter a number from 1 to 99.',
    duplicateGroup: 'This group number is already in use for this level.',
    subject: 'Subject',
    subjectPlaceholder: 'Select a subject…',
    customLevelPlaceholder: 'e.g. Tutoring group, club…',
    customSubjectPlaceholder: 'Enter subject name…',
    switchToOfficial: '← Back to official curriculum list',
    createCustom: 'Level not listed? Create custom class',
    cycleLabels: { college: 'Middle School', lycee: 'High School', prepa: 'Preparatory Classes' },
  },
};

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultCycle = 'lycee',
  teacherSubjects = [],
  teacherCycles = [],
  existingClasses = [],
  editingClass = null,
  onUpdate,
  onDelete,
}) => {
  const { locale, t } = useLocale();
  const language: ModalLanguage = locale;
  const copy = COPY[language] ?? COPY.fr;
  const isAr = language === 'ar';
  const [cycle, setCycle] = useState<Cycle>(defaultCycle);
  const [level, setLevel] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  // Mode « personnalisé » : niveau libre pour les cas rares hors liste officielle.
  const [customMode, setCustomMode] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editingDisplayName = editingClass ? formatLocalizedClassDisplayName(editingClass.name, language) : '';

  /*
   * Héritage du profil d'inscription (modifiable dans les Paramètres) :
   * une seule matière ou un seul cycle : champ masqué, valeur héritée ;
   * plusieurs : choix restreint aux valeurs du professeur.
   * En édition, la valeur actuelle de la classe reste toujours proposée.
   */
  const subjectOptions = React.useMemo(() => {
    const base = teacherSubjects.length > 0 ? [...teacherSubjects] : [...SUBJECTS];
    if (editingClass?.subject && !base.includes(editingClass.subject)) base.unshift(editingClass.subject);
    return base;
  }, [teacherSubjects, editingClass]);

  const cycleOptions = React.useMemo(() => {
    const base: Cycle[] = teacherCycles.length > 0 ? [...teacherCycles] : (Object.keys(copy.cycleLabels) as Cycle[]);
    if (editingClass?.cycle && !base.includes(editingClass.cycle)) base.unshift(editingClass.cycle);
    return base;
  }, [teacherCycles, editingClass, copy.cycleLabels]);

  // Le sélecteur de matière n'est nécessaire que si le prof a configuré
  // plusieurs matières (2+) dans les Paramètres ; sinon la matière est héritée.
  const hideSubjectField = !editingClass && teacherSubjects.length <= 1;
  const singleCycle = !editingClass && cycleOptions.length === 1 && teacherCycles.length === 1;

  useEffect(() => {
    if (!isOpen) setConfirmDelete(false);
    if (isOpen) {
      if (editingClass) {
        const classCycle = editingClass.cycle || 'lycee';
        setCycle(classCycle);
        const classLevels = CLASS_LEVELS_BY_CYCLE[classCycle] || [];
        const matchedLevel = classLevels.find(l => editingClass.name.startsWith(l));

        if (matchedLevel) {
          setCustomMode(false);
          setLevel(matchedLevel);
          setGroup(editingClass.name.slice(matchedLevel.length).trim());
        } else {
          setCustomMode(true);
          const match = editingClass.name.match(/^(.*?)\s+(\d{1,2})$/);
          if (match) {
            setCustomLevel(match[1]);
            setGroup(match[2]);
          } else {
            setCustomLevel(editingClass.name);
            setGroup('');
          }
        }
        setSubject(editingClass.subject || '');
        setCustomSubject(editingClass.subject || '');
      } else {
        // cycle initial : celui du tableau de bord s'il est autorisé par les
        // paramètres pédagogiques, sinon le premier cycle configuré.
        const initialCycle: Cycle =
          teacherCycles.length === 0 || teacherCycles.includes(defaultCycle)
            ? defaultCycle
            : teacherCycles[0];
        setCycle(initialCycle);
        const firstLevel = CLASS_LEVELS_BY_CYCLE[initialCycle][0] ?? '';
        setLevel(firstLevel);
        setGroup('');
        setSubject(teacherSubjects[0] ?? SUBJECTS[0]);
        setCustomMode(false);
        setCustomLevel('');
        setCustomSubject('');
      }
    }
  }, [isOpen, defaultCycle, teacherSubjects, teacherCycles, editingClass]);

  const levelGroups = React.useMemo(() => classLevelGroupsForCycle(cycle), [cycle]);
  const activeGroup = levelGroups.find(g => g.levels.includes(level)) ?? levelGroups[0];

  const selectGroup = (groupKey: ClassLevelGroupKey) => {
    const target = levelGroups.find(g => g.key === groupKey);
    if (target?.levels.length) setLevel(target.levels[0]);
  };

  const effectiveLevel = customMode ? customLevel.trim() : level;
  const effectiveSubject = customMode ? customSubject.trim() : subject;
  const normalizedGroup = normalizeGroupNumber(group);
  const duplicateGroup = !!normalizedGroup && existingClasses.some(classInfo =>
    classInfo.id !== editingClass?.id && isSameClassGroup(classInfo.name, effectiveLevel, normalizedGroup)
  );
  const isFormValid = !!effectiveLevel && !!effectiveSubject && !!normalizedGroup && !duplicateGroup;
  const groupError = group.trim() && !normalizedGroup
    ? copy.invalidGroup
    : duplicateGroup
      ? copy.duplicateGroup
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && normalizedGroup) {
      const composedName = classNameForLevelAndGroup(effectiveLevel, normalizedGroup);
      if (editingClass && onUpdate) {
        onUpdate(editingClass.id, {
          name: composedName,
          subject: effectiveSubject,
          cycle,
          color: '',
        });
        onClose();
      } else {
        onCreate({ name: composedName, subject: effectiveSubject, cycle });
      }
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingClass ? copy.editTitle : copy.createTitle}
        description={editingClass ? copy.editDescription : copy.createDescription}
        maxWidth="md"
        className="sm:max-w-[38rem] sm:rounded-[32px] border border-slate-200/90 dark:border-white/[0.08] bg-card/95 backdrop-blur-2xl shadow-xl overflow-hidden"
        headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 dark:border-white/[0.08] bg-card/70 backdrop-blur-md"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200/70 dark:border-white/[0.08] bg-card/70 backdrop-blur-md"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          {editingClass && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              className="order-2 h-11 w-full gap-2 rounded-xl sm:order-1 sm:me-auto sm:h-10 sm:w-auto cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              {t('dashboard.delete')}
            </Button>
          )}
          <div className="order-1 flex w-full gap-2.5 sm:order-2 sm:ms-auto sm:w-auto">
            <Button type="button" onClick={onClose} variant="secondary" className="h-11 flex-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08] sm:h-10 sm:flex-none cursor-pointer">
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              form="create-class-form"
              variant="accent"
              disabled={!isFormValid}
              className="h-11 flex-1 rounded-xl font-bold shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/40 sm:h-10 sm:flex-none cursor-pointer"
            >
              {editingClass ? copy.save : copy.create}
            </Button>
          </div>
        </div>
        }
      >
      <form id="create-class-form" onSubmit={handleSubmit} dir={isAr ? 'rtl' : 'ltr'} className="space-y-3 py-1 text-start sm:space-y-4">
        {/* Cycle : masqué si un seul cycle est configuré dans les paramètres. */}
        {!singleCycle && (
          <div className="space-y-1.5">
            <label htmlFor="cycle" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.cycle} *
            </label>
            <Select
              value={cycle}
              onValueChange={(value) => {
                const nextCycle = value as Cycle;
                setCycle(nextCycle);
                setLevel(CLASS_LEVELS_BY_CYCLE[nextCycle][0] ?? '');
              }}
            >
              <SelectTrigger id="cycle" className="!h-11 text-sm sm:!h-9 rounded-xl border-slate-200/80 dark:border-white/[0.08] bg-background/80">
                <SelectValue placeholder={copy.cyclePlaceholder} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200/80 dark:border-white/[0.08]">
                {cycleOptions.map(c => (
                  <SelectItem key={c} value={c}>{copy.cycleLabels[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <span id="level-label" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {copy.level} *
          </span>
          {customMode ? (
            <Input
              id="level"
              type="text"
              value={customLevel}
              onChange={(e) => setCustomLevel(e.target.value)}
              placeholder={copy.customLevelPlaceholder}
              aria-labelledby="level-label"
              className="rounded-xl border-slate-200/80 dark:border-white/[0.08] bg-background/80"
              required
            />
          ) : (
            <div role="group" aria-labelledby="level-label" className="space-y-2">
              {/* Paliers : Tronc commun / 1re Bac / 2e Bac (choix en deux temps) */}
              <div className="flex flex-wrap gap-1.5">
                {levelGroups.map(g => {
                  const isActive = activeGroup?.key === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => selectGroup(g.key)}
                      aria-pressed={isActive}
                      className={cn(
                        'inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-bold transition-all cursor-pointer',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-xs shadow-indigo-500/25 border border-white/15'
                          : 'bg-muted/50 text-muted-foreground border border-slate-200/80 dark:border-white/[0.08] hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {formatClassLevelGroupLabel(g.key, language)}
                    </button>
                  );
                })}
              </div>
              {/* Filières du palier sélectionné */}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {activeGroup?.levels.map(l => {
                  const isSelected = level === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-start text-xs font-semibold leading-snug transition-all cursor-pointer',
                        isSelected
                          ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/30 shadow-xs'
                          : 'border-slate-200/80 dark:border-white/[0.08] bg-card text-muted-foreground hover:border-slate-300 dark:hover:border-white/20 hover:text-foreground'
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        {formatLocalizedClassDisplayName(l, language, { includeClassPrefix: false })}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-muted/20 p-3 sm:p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <label htmlFor="group" className="block text-xs font-bold uppercase tracking-wider text-foreground">
                {copy.group} *
              </label>
              <p id="group-help" className={cn('mt-0.5 text-[11px]', groupError ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                {groupError ?? copy.groupHint}
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <Input
                id="group"
                type="text"
                value={group}
                onChange={(e) => setGroup(sanitizeGroupNumberInput(e.target.value))}
                onBlur={() => {
                  const next = normalizeGroupNumber(group);
                  if (next) setGroup(next);
                }}
                placeholder="1–99"
                className="h-11 w-full sm:w-28 text-center text-sm font-bold rounded-xl border-2 border-black dark:border-white bg-white dark:bg-slate-950 text-black dark:text-white shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-black dark:focus-visible:border-white"
                inputMode="numeric"
                maxLength={2}
                aria-invalid={!!groupError}
                aria-describedby="group-help"
              />
            </div>
          </div>
        </div>

        {/* Matière : affichée seulement si le prof enseigne plusieurs matières
            (2+ configurées dans les Paramètres) ; sinon la matière est héritée. */}
        {!(hideSubjectField && !customMode) && (
          <div className="space-y-1.5">
            <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.subject} *
            </label>
            {customMode ? (
              <Input
                id="subject"
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder={copy.customSubjectPlaceholder}
                className="rounded-xl border-slate-200/80 dark:border-white/[0.08] bg-background/80"
                required
              />
            ) : (
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger id="subject" className="!h-11 text-sm sm:!h-9 rounded-xl border-slate-200/80 dark:border-white/[0.08] bg-background/80">
                  <SelectValue placeholder={copy.subjectPlaceholder} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200/80 dark:border-white/[0.08]">
                  {subjectOptions.map(s => (
                    <SelectItem key={s} value={s}>{formatLocalizedSubjectDisplayName(s, language)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {!editingClass && (
          <button
            type="button"
            onClick={() => setCustomMode(v => !v)}
            className="mt-2 text-[11px] font-medium text-muted-foreground/70 underline-offset-2 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
          >
            {customMode ? copy.switchToOfficial : copy.createCustom}
          </button>
        )}
      </form>
      </Modal>
      {editingClass && onDelete && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('dashboard.deleteNotebookTitle', { name: editingDisplayName })}
          description={t('dashboard.deleteNotebookDescription')}
          confirmLabel={t('dashboard.delete')}
          confirmationPhrase={editingDisplayName}
          confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: editingDisplayName })}
          onConfirm={onDelete}
        />
      )}
    </>
  );
};

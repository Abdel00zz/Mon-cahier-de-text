import React, { useState, useEffect } from 'react';
import { Cycle, ClassInfo } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from '@/components/ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
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
          setCustomLevel(editingClass.name);
          setGroup('');
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

  const levels = CLASS_LEVELS_BY_CYCLE[cycle] || [];
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
        className="sm:max-w-[38rem] sm:rounded-[28px]"
        headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/50 bg-card/60"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          {editingClass && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              className="order-2 h-11 w-full gap-2 rounded-xl sm:order-1 sm:me-auto sm:h-10 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              {t('dashboard.delete')}
            </Button>
          )}
          <div className="order-1 flex w-full gap-2.5 sm:order-2 sm:ms-auto sm:w-auto">
            <Button type="button" onClick={onClose} variant="secondary" className="h-11 flex-1 rounded-xl sm:h-10 sm:flex-none">
              {copy.cancel}
            </Button>
            <Button type="submit" form="create-class-form" variant="default" disabled={!isFormValid} className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm sm:h-10 sm:flex-none">
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
              <SelectTrigger id="cycle" className="!h-11 text-sm sm:!h-9">
                <SelectValue placeholder={copy.cyclePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {cycleOptions.map(c => (
                  <SelectItem key={c} value={c}>{copy.cycleLabels[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <label htmlFor="level" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.level} *
            </label>
            {customMode ? (
              <Input
                id="level"
                type="text"
                value={customLevel}
                onChange={(e) => setCustomLevel(e.target.value)}
                placeholder={copy.customLevelPlaceholder}
                required
              />
            ) : (
              <Select value={level} onValueChange={setLevel} required>
                <SelectTrigger id="level" className="!h-11 text-sm sm:!h-9">
                  <SelectValue placeholder={copy.levelPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(l => (
                    <SelectItem key={l} value={l} className="text-xs leading-snug">
                      {formatLocalizedClassDisplayName(l, language, { includeClassPrefix: false })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="group" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.group} *
            </label>
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
              className="h-11 w-24 text-center sm:h-9"
              inputMode="numeric"
              maxLength={2}
              aria-invalid={!!groupError}
              aria-describedby="group-help"
            />
          </div>
        </div>
        <p id="group-help" className={groupError ? 'text-[11px] font-medium text-destructive' : 'text-[11px] text-muted-foreground'}>
          {groupError ?? copy.groupHint}
        </p>

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
                required
              />
            ) : (
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger id="subject" className="!h-11 text-sm sm:!h-9">
                  <SelectValue placeholder={copy.subjectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
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
            className="mt-2 text-[11px] font-medium text-muted-foreground/60 underline-offset-2 transition-colors hover:text-[#423ed8] hover:underline"
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

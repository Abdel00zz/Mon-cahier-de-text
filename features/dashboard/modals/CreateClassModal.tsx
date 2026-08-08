import React, { useState, useEffect } from 'react';
import { Cycle, ClassInfo } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { useLocale } from '@/i18n/LocaleProvider';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; color?: string; }) => void;
  defaultTeacherName?: string;
  /** cycle actif du tableau de bord, pré-sélectionné */
  defaultCycle?: Cycle;
  /** matières de l'enseignant (choisies à l'inscription), filtrent le choix */
  teacherSubjects?: string[];
  /**
   * cycles de l'enseignant (choisis à l'inscription, modifiables dans les
   * Paramètres), un seul cycle : le champ disparaît, il est hérité ;
   * plusieurs : le choix est restreint à ces cycles
   */
  teacherCycles?: Cycle[];
  /** Classes déjà créées : évite deux groupes identiques au même niveau. */
  existingClasses?: ClassInfo[];
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void;
}

type ModalLanguage = 'fr' | 'ar';

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
  switchToCustom: string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une nouvelle classe',
    editTitle: 'Configurer la classe',
    createDescription: 'Choisissez le niveau et la matière ; le nom est composé automatiquement.',
    editDescription: 'Modifiez les paramètres et la matière de la classe.',
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
    switchToCustom: 'Niveau non listé ? Créer une classe personnalisée',
    cycleLabels: { college: 'Collège', lycee: 'Lycée', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم جديد',
    editTitle: 'إعداد القسم',
    createDescription: 'اختر المستوى والمادة؛ يُنشأ اسم القسم تلقائياً.',
    editDescription: 'عدّل إعدادات القسم ومادته.',
    cancel: 'إلغاء',
    create: 'إنشاء القسم',
    save: 'حفظ التعديلات',
    cycle: 'السلك',
    cyclePlaceholder: 'اختر السلك…',
    level: 'المستوى / القسم',
    levelPlaceholder: 'اختر المستوى…',
    group: 'رقم المجموعة',
    groupHint: 'مطلوب: رقم فريد داخل المستوى نفسه.',
    invalidGroup: 'أدخل رقماً من 1 إلى 99.',
    duplicateGroup: 'هذا الرقم مستخدم بالفعل في هذا المستوى.',
    subject: 'المادة',
    subjectPlaceholder: 'اختر مادة…',
    customLevelPlaceholder: 'مثال: مجموعة الدعم، DAOL…',
    customSubjectPlaceholder: 'أدخل المادة…',
    switchToOfficial: 'العودة إلى اللائحة الرسمية ←',
    switchToCustom: 'المستوى غير موجود؟ أنشئ قسماً مخصصاً',
    cycleLabels: { college: 'الإعدادي', lycee: 'الثانوي', prepa: 'الأقسام التحضيرية' },
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
}) => {
  const { locale } = useLocale();
  const language: ModalLanguage = locale === 'ar' ? 'ar' : 'fr';
  const copy = COPY[language];
  const isAr = language === 'ar';
  const [cycle, setCycle] = useState<Cycle>(defaultCycle);
  const [level, setLevel] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  // Mode « personnalisé » : niveau libre pour les cas rares hors liste officielle.
  const [customMode, setCustomMode] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  /*
   * Héritage du profil d'inscription (modifiable dans les Paramètres) :
   * Une seule matière ou un seul cycle : champ masqué, valeur héritée ;
   * Plusieurs choix : choix restreint aux valeurs du professeur.
   * En édition, la valeur actuelle de la classe reste toujours proposée
   * (même si le prof a depuis retiré ce cycle/cette matière de son profil).
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

  const singleSubject = !editingClass && subjectOptions.length === 1 && teacherSubjects.length === 1;
  const singleCycle = !editingClass && cycleOptions.length === 1 && teacherCycles.length === 1;

  useEffect(() => {
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
        // cycle initial : celui du tableau de bord s'il appartient au profil,
        // sinon le premier cycle du prof
        const initialCycle: Cycle =
          teacherCycles.length === 0 || teacherCycles.includes(defaultCycle)
            ? defaultCycle
            : teacherCycles[0];
        setCycle(initialCycle);
        const firstLevel = CLASS_LEVELS_BY_CYCLE[initialCycle][0] ?? '';
        setLevel(firstLevel);
        setGroup('');
        setSubject(teacherSubjects[0] ?? '');
        setCustomMode(false);
        setCustomLevel('');
        setCustomSubject('');
      }
    }
  }, [isOpen, defaultCycle, teacherSubjects, editingClass]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClass ? copy.editTitle : copy.createTitle}
      description={editingClass ? copy.editDescription : copy.createDescription}
      maxWidth="md"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            {copy.cancel}
          </Button>
          <Button type="submit" form="create-class-form" variant="default" disabled={!isFormValid}>
            {editingClass ? copy.save : copy.create}
          </Button>
        </>
      }
    >
      <form id="create-class-form" onSubmit={handleSubmit} dir={isAr ? 'rtl' : 'ltr'} className="space-y-4 py-1 text-left">
        {/* Cycle : masqué si le prof n'enseigne qu'un cycle (hérité du profil) */}
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
              <SelectTrigger id="cycle">
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
                <SelectTrigger id="level">
                  <SelectValue placeholder={copy.levelPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(l => (
                    <SelectItem key={l} value={l} className="text-xs leading-snug">
                      {formatLocalizedClassDisplayName(l, language)}
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
              className="w-24 text-center"
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

        {/* Matière : masquée si le prof n'en enseigne qu'une (héritée du profil) */}
        {!(singleSubject && !customMode) && (
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
                <SelectTrigger id="subject">
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

        {/* Échappatoire discrète : niveau personnalisé (choix rare) */}
        <button
          type="button"
          onClick={() => setCustomMode(v => !v)}
          className="text-[11px] font-medium text-muted-foreground/60 underline-offset-2 transition-colors hover:text-primary hover:underline mt-2"
        >
          {customMode
            ? copy.switchToOfficial
            : copy.switchToCustom}
        </button>
      </form>
    </Modal>
  );
};

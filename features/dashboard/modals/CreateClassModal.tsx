import React, { useState, useEffect } from 'react';
import { Cycle, ClassInfo } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from '@/components/ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, formatLocalizedClassDisplayName } from '@/constants';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { useLocale } from '@/i18n/LocaleProvider';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; color?: string; }) => void;
  defaultTeacherName?: string;
  /** cycle actif du tableau de bord, pré-sélectionné */
  defaultCycle?: Cycle;
  /** matière enseignée (unique), héritée des paramètres ; la classe l'adopte */
  defaultSubject?: string;
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
  customLevelPlaceholder: string;
  switchToOfficial: string;
  createCustom: string;
  cycleLabels: Record<Cycle, string>;
}> = {
  fr: {
    createTitle: 'Créer une nouvelle classe',
    editTitle: 'Configurer la classe',
    createDescription: 'Choisissez le niveau ; le nom est composé automatiquement.',
    editDescription: 'Modifiez le niveau de la classe.',
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
    customLevelPlaceholder: 'Ex. : Groupe soutien, DAOL…',
    switchToOfficial: '← Revenir à la liste officielle',
    createCustom: 'Niveau non listé ? Créer une classe personnalisée',
    cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' },
  },
  ar: {
    createTitle: 'إضافة قسم جديد',
    editTitle: 'إعداد القسم',
    createDescription: 'اختر المستوى؛ يُنشأ اسم القسم تلقائياً.',
    editDescription: 'عدّل مستوى القسم.',
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
    customLevelPlaceholder: 'مثال: مجموعة الدعم، DAOL…',
    switchToOfficial: 'العودة إلى اللائحة الرسمية ←',
    createCustom: 'المستوى غير موجود؟ أنشئ قسماً مخصصاً',
    cycleLabels: { college: 'الثانوي الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
  },
};

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultCycle = 'lycee',
  defaultSubject,
  teacherCycles = [],
  existingClasses = [],
  editingClass = null,
  onUpdate,
  onDelete,
}) => {
  const { locale, t } = useLocale();
  const language: ModalLanguage = locale === 'ar' ? 'ar' : 'fr';
  const copy = COPY[language];
  const isAr = language === 'ar';
  const [cycle, setCycle] = useState<Cycle>(defaultCycle);
  const [level, setLevel] = useState('');
  const [group, setGroup] = useState('');
  // Mode « personnalisé » : niveau libre pour les cas rares hors liste officielle.
  const [customMode, setCustomMode] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editingDisplayName = editingClass ? formatLocalizedClassDisplayName(editingClass.name, language) : '';

  // Matière unique, héritée des Paramètres (Profil) — plus de champ matière ici.
  const effectiveSubject = defaultSubject || SUBJECTS[0];

  /*
   * Héritage du profil d'inscription (modifiable dans les Paramètres) :
   * un seul cycle : champ masqué, valeur héritée ; plusieurs : choix restreint.
   */
  const cycleOptions = React.useMemo(() => {
    const base: Cycle[] = teacherCycles.length > 0 ? [...teacherCycles] : (Object.keys(copy.cycleLabels) as Cycle[]);
    if (editingClass?.cycle && !base.includes(editingClass.cycle)) base.unshift(editingClass.cycle);
    return base;
  }, [teacherCycles, editingClass, copy.cycleLabels]);

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
        setCustomMode(false);
        setCustomLevel('');
      }
    }
  }, [isOpen, defaultCycle, teacherCycles, editingClass]);

  const levels = CLASS_LEVELS_BY_CYCLE[cycle] || [];
  const effectiveLevel = customMode ? customLevel.trim() : level;
  const normalizedGroup = normalizeGroupNumber(group);
  const duplicateGroup = !!normalizedGroup && existingClasses.some(classInfo =>
    classInfo.id !== editingClass?.id && isSameClassGroup(classInfo.name, effectiveLevel, normalizedGroup)
  );
  const isFormValid = !!effectiveLevel && !!normalizedGroup && !duplicateGroup;
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
        className="sm:max-w-[34rem]"
        headerClassName="px-4 pt-4 sm:px-6 sm:pt-6"
        bodyClassName="px-4 py-3 sm:px-6 sm:py-4"
        footerClassName="px-4 py-2.5 sm:px-6 sm:py-3"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          {editingClass && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              className="order-2 h-11 w-full gap-2 sm:order-1 sm:me-auto sm:h-9 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              {t('dashboard.delete')}
            </Button>
          )}
          <div className="order-1 flex w-full gap-2 sm:order-2 sm:ms-auto sm:w-auto">
            <Button type="button" onClick={onClose} variant="secondary" className="h-11 flex-1 sm:h-9 sm:flex-none">
              {copy.cancel}
            </Button>
            <Button type="submit" form="create-class-form" variant="default" disabled={!isFormValid} className="h-11 flex-1 sm:h-9 sm:flex-none">
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

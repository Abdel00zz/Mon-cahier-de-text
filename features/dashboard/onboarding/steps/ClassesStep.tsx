import { memo, useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  formatLocalizedClassDisplayName,
  formatLocalizedSubjectDisplayName,
  CLASS_LEVELS_BY_CYCLE,
  classLevelGroupsForCycle,
  formatClassLevelGroupLabel,
  SUBJECTS,
  type ClassLevelGroupKey,
} from '@/constants';
import {
  classNameForLevelAndGroup,
  normalizeGroupNumber,
  sanitizeGroupNumberInput,
} from '@/utils/classGroup';
import { classCyclePolicy } from '../../modals/classCreationFlow';
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
} from '@/components/ui/icons';
import type { ClassInfo, Cycle } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';

export interface ClassesStepProps {
  classes: ClassInfo[];
  lang: ModalLang;
  copy: OnboardingCopy;
  teacherCycles?: Cycle[];
  teacherSubjects?: string[];
  onCreateClass: (details: {
    name: string;
    subject: string;
    cycle?: Cycle;
    color?: string;
  }) => unknown;
  onRemove: (classInfo: ClassInfo) => void;
  onAdvance?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Libellés très courts pour les puces de filières sur mobile */
function getShortBranchLabel(level: string, isAr: boolean): string {
  // Tronc commun
  if (level.includes('Scientifique')) return isAr ? 'علمي' : 'Scientifique';
  if (level.includes('Lettres')) return isAr ? 'آداب' : 'Lettres';
  if (level.includes('Technologique')) return isAr ? 'تكنولوجي' : 'Technologique';

  // 1er Bac
  if (level === '1er Bac Sciences Expérimentales') return isAr ? 'علوم تجريبية' : 'Sc. Expérimentales';
  if (level === '1er Bac Sciences Mathématiques') return isAr ? 'علوم رياضية' : 'Sc. Maths';
  if (level.includes('Lettres')) return isAr ? 'آداب وإنسانية' : 'Lettres';
  if (level.includes('Économiques')) return isAr ? 'علوم اقتصادية' : 'Sc. Économiques';

  // 2ème Bac
  if (level.includes('Physiques')) return isAr ? 'فيزياء (PC)' : 'PC (Physique)';
  if (level.includes('Vie et de la Terre')) return isAr ? 'علوم الحياة (SVT)' : 'SVT';
  if (level.includes('Mathématiques A')) return isAr ? 'رياضية أ (SM-A)' : 'Sc. Maths A';
  if (level.includes('Mathématiques B')) return isAr ? 'رياضية ب (SM-B)' : 'Sc. Maths B';
  if (level === '2ème Bac Sciences Économiques') return isAr ? 'اقتصاد' : 'Économie';
  if (level.includes('Gestion Comptable')) return isAr ? 'تدبير محاسباتي' : 'Gestion Comptable';
  if (level === '2ème Bac Lettres') return isAr ? 'آداب' : 'Lettres';
  if (level.includes('Sciences Humaines')) return isAr ? 'علوم إنسانية' : 'Sc. Humaines';

  // Prépa
  if (level.includes('MPSI')) return 'MPSI';
  if (level.includes('PCSI')) return 'PCSI';
  if (level.includes('TSI')) return 'TSI';
  if (level.includes('MP')) return 'MP';
  if (level.includes('PSI')) return 'PSI';

  return formatLocalizedClassDisplayName(level, isAr ? 'ar' : 'fr');
}

export const ClassesStep = memo<ClassesStepProps>(
  ({
    classes: _classes,
    lang,
    copy,
    teacherCycles = [],
    teacherSubjects = [],
    onCreateClass,
    onRemove: _onRemove,
    onAdvance,
    onBack,
    onSkip,
  }) => {
    const isAr = lang === 'ar';

    // 1. Détermination du cycle sélectionné
    const cyclePolicy = useMemo(() => classCyclePolicy(teacherCycles), [teacherCycles]);
    const availableCyclesList = cyclePolicy.options;
    const [selectedCycle, setSelectedCycle] = useState<Cycle>(
      availableCyclesList[0] || 'lycee'
    );

    useEffect(() => {
      if (availableCyclesList.length > 0 && !availableCyclesList.includes(selectedCycle)) {
        setSelectedCycle(availableCyclesList[0]);
      }
    }, [availableCyclesList, selectedCycle]);

    // 2. Groupes de niveaux & sous-groupes pour le cycle
    const levelGroups = useMemo(
      () => classLevelGroupsForCycle(selectedCycle),
      [selectedCycle]
    );

    const [selectedGroupKey, setSelectedGroupKey] = useState<ClassLevelGroupKey>('common');
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    // Synchronisation intelligente des sélections par défaut selon le cycle
    useEffect(() => {
      if (selectedCycle === 'college') {
        setSelectedGroupKey('college');
        setSelectedLevel('1AC');
      } else if (selectedCycle === 'lycee') {
        setSelectedGroupKey('common');
        setSelectedLevel('Tronc Commun Scientifique');
      } else if (selectedCycle === 'prepa') {
        setSelectedGroupKey('prepaFirst');
        setSelectedLevel('1re année MPSI');
      }
    }, [selectedCycle]);

    // Changement de palier (Tronc commun / 1re Bac / 2e Bac)
    const handleSelectPalier = (key: ClassLevelGroupKey) => {
      setSelectedGroupKey(key);
      const group = levelGroups.find((g) => g.key === key);
      if (group && group.levels.length > 0) {
        setSelectedLevel(group.levels[0]);
      }
    };

    // 3. Groupe (numéro de groupe)
    const [groupInput, setGroupInput] = useState<string>('1');

    // 4. Matière
    const subjectsList = useMemo(() => {
      const filtered = teacherSubjects.filter((s) => s.trim());
      return filtered.length > 0 ? filtered : [SUBJECTS[0]];
    }, [teacherSubjects]);

    const [selectedSubject, setSelectedSubject] = useState<string>(subjectsList[0]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Validation du formulaire
    const isFormValid = useMemo(() => {
      return selectedLevel.trim().length > 0 && Boolean(normalizeGroupNumber(groupInput));
    }, [selectedLevel, groupInput]);

    // Nom final en aperçu
    const previewClassName = useMemo(() => {
      const groupNumber = normalizeGroupNumber(groupInput) || '1';
      return classNameForLevelAndGroup(
        formatLocalizedClassDisplayName(selectedLevel, lang),
        groupNumber
      );
    }, [selectedLevel, groupInput, lang]);

    // Création & Avance automatique
    const handleCreateClass = async () => {
      if (!isFormValid || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const groupNumber = normalizeGroupNumber(groupInput) || '1';
        const finalName = classNameForLevelAndGroup(selectedLevel, groupNumber);
        const finalSubject = selectedSubject;
        const finalCycle: Cycle = selectedCycle;

        await onCreateClass({
          name: finalName,
          subject: finalSubject,
          cycle: finalCycle,
        });

        toast.success(copy.classAdded);

        // Transition automatique immédiate vers l'étape suivante (Emploi du temps)
        if (onAdvance) {
          onAdvance();
        }
      } catch {
        toast.error(isAr ? 'حدث خطأ أثناء إضافة القسم' : 'Erreur lors de l’ajout de la classe');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="w-full space-y-4">
        {/* Conteneur principal épuré, doux et spacieux Style Vercel avec fond #fcfcfc */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[#fcfcfc] p-4 shadow-xs transition-all dark:border-[hsl(var(--border))] dark:bg-[#18181b] sm:p-7 md:p-8">
          {/* Barre supérieure : Titre épuré sans bouton 'تسمية حرة' */}
          <div className="mb-4 flex items-center gap-2.5 sm:mb-6">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#facc15]" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 sm:text-base">
              {isAr ? 'تحديد قسمك الأول (نموذج للبدء)' : 'Votre première classe (modèle de départ)'}
            </h2>
          </div>

          {/* Mode sélecteur direct et intuitif inspiré de la première page */}
          <div className="space-y-4 sm:space-y-5">
            {/* 1. Commutateur de cycles (si plusieurs cycles) */}
            {availableCyclesList.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 sm:text-sm">
                  {isAr ? 'السلك:' : 'Cycle :'}
                </span>
                <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-[hsl(var(--border))]">
                  {availableCyclesList.map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setSelectedCycle(cycle)}
                      className={`touch-manipulation rounded-lg px-3 py-1.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
                        selectedCycle === cycle
                          ? 'bg-[#7033e3] text-white shadow-xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {copy.cycleLabels[cycle]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Sélection du niveau / palier - Grille spacieuse et tactile */}
            {selectedCycle === 'college' ? (
              /* Collège : 1AC, 2AC, 3AC directement sous forme de cartes */
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted-foreground sm:text-sm">
                  {isAr ? 'المستوى الدراسي:' : 'Niveau :'}
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                  {CLASS_LEVELS_BY_CYCLE.college.map((level) => {
                    const isSelected = selectedLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSelectedLevel(level)}
                        className={`group relative flex min-h-[58px] sm:min-h-[76px] touch-manipulation flex-col items-center justify-center rounded-xl sm:rounded-2xl border p-2 text-center transition-all duration-150 active:scale-95 cursor-pointer sm:p-3.5 ${
                          isSelected
                            ? 'border-2 border-[#7033e3] bg-[#7033e3]/10 text-[#7033e3] font-bold shadow-xs dark:border-[#a855f7] dark:bg-[#7033e3]/20 dark:text-[#c4b5fd]'
                            : 'border-[hsl(var(--border))] bg-card text-foreground hover:border-neutral-400 hover:bg-muted/50'
                        }`}
                      >
                        <span className="text-sm font-bold sm:text-base">{level}</span>
                        <span className="mt-0.5 text-[10.5px] opacity-80 sm:text-xs">
                          {formatLocalizedClassDisplayName(level, lang)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Lycée ou Prépa : Paliers (TC, 1BAC, 2BAC) en 3 colonnes optimisées mobile */
              <div className="space-y-4 sm:space-y-5">
                {/* Paliers présentés en grille de 3 cartes tactiles */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-600 dark:text-neutral-400 sm:text-sm">
                    {isAr ? 'المستوى:' : 'Niveau :'}
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {levelGroups.map((group) => {
                      const isSelected = selectedGroupKey === group.key;
                      const shortBadge =
                        group.key === 'common'
                          ? 'TC'
                          : group.key === 'firstBac'
                          ? '1BAC'
                          : group.key === 'secondBac'
                          ? '2BAC'
                          : group.key === 'prepaFirst'
                          ? '1CPGE'
                          : '2CPGE';
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => handleSelectPalier(group.key)}
                          className={`group relative flex min-h-[58px] sm:min-h-[76px] touch-manipulation flex-col items-center justify-center rounded-xl sm:rounded-2xl border p-2 text-center transition-all duration-150 active:scale-95 cursor-pointer sm:p-3.5 ${
                            isSelected
                              ? 'border-2 border-[#7033e3] bg-[#7033e3]/10 text-[#7033e3] font-bold shadow-xs dark:border-[#a855f7] dark:bg-[#7033e3]/20 dark:text-[#c4b5fd]'
                              : 'border-[hsl(var(--border))] bg-card text-foreground hover:border-neutral-400 hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground sm:text-xs">
                            {shortBadge}
                          </span>
                          <span className="mt-0.5 text-xs font-bold leading-tight sm:text-sm md:text-base">
                            {formatClassLevelGroupLabel(group.key, isAr ? 'ar' : 'fr')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Branches / Filières du palier sélectionné */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-muted-foreground sm:text-sm">
                    {isAr ? 'الشعبة / المسلك:' : 'Filière :'}
                  </label>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {levelGroups
                      .find((g) => g.key === selectedGroupKey)
                      ?.levels.map((level) => {
                        const isSelected = selectedLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setSelectedLevel(level)}
                            className={`min-h-[44px] touch-manipulation rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer sm:px-4 sm:py-2.5 sm:text-sm ${
                              isSelected
                                ? 'border-2 border-[#7033e3] bg-[#7033e3]/15 text-[#7033e3] font-bold shadow-xs dark:border-[#a855f7] dark:bg-[#7033e3]/25 dark:text-[#c4b5fd]'
                                : 'border border-[hsl(var(--border))] bg-card text-foreground hover:border-neutral-400 hover:text-foreground'
                            }`}
                          >
                            {getShortBranchLabel(level, isAr)}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Numéro de groupe (Fauj) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
                {isAr ? 'رقم الفوج:' : 'Groupe :'}
              </span>
              <div className="flex items-center gap-2">
                {['1', '2', '3', '4'].map((num) => {
                  const isSelected = groupInput === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGroupInput(num)}
                      className={`flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#7033e3] bg-[#7033e3] text-white shadow-xs'
                          : 'border border-[hsl(var(--border))] bg-card text-foreground hover:border-neutral-400 hover:bg-muted'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
                <input
                  type="text"
                  inputMode="numeric"
                  value={groupInput}
                  onChange={(e) => setGroupInput(sanitizeGroupNumberInput(e.target.value))}
                  aria-label={isAr ? 'رقم مخصص' : 'Numéro libre'}
                  className="h-11 w-14 touch-manipulation rounded-xl border border-[hsl(var(--border))] bg-card text-center text-sm font-bold text-foreground focus:border-[#7033e3] focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Matière (si plusieurs matières) */}
            {subjectsList.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
                  {isAr ? 'المادة:' : 'Matière :'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {subjectsList.map((subject) => {
                    const isSelected = selectedSubject === subject;
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => setSelectedSubject(subject)}
                        className={`min-h-[44px] touch-manipulation rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer sm:px-4 sm:text-sm ${
                          isSelected
                            ? 'bg-[#7033e3] text-white font-bold shadow-xs border border-[#7033e3]'
                            : 'border border-[hsl(var(--border))] bg-card text-foreground hover:border-neutral-400'
                        }`}
                      >
                        {formatLocalizedSubjectDisplayName(subject, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Aperçu instantané Style Néo-Éditorial */}
          <div className="mt-5 text-center sm:mt-6">
            <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-[#7033e3]/30 bg-[#7033e3]/10 px-4 py-2 text-xs font-bold text-[#7033e3] dark:text-[#c4b5fd] sm:rounded-2xl sm:px-6 sm:py-2.5 sm:text-sm shadow-2xs">
              <span className="truncate">{previewClassName}</span>
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span className="font-semibold text-foreground/80 truncate">
                {formatLocalizedSubjectDisplayName(selectedSubject, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* Barre de navigation directe avec boutons tactiles ergonomiques */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              <span>{copy.back}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex min-h-12 flex-1 sm:flex-initial items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <span>{copy.ignoreClass}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isFormValid || isSubmitting}
              onClick={handleCreateClass}
              className="artistic-cta-button group inline-flex min-h-12 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-6 sm:px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-[#7033e3]/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none cursor-pointer"
            >
              <span>{isAr ? 'إنشاء هذا القسم والمتابعة' : 'Créer la classe et continuer'}</span>
              {isAr ? (
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 stroke-[2.5]" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* Note informative discrète en bas sans émoji */}
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-1">
          {isAr
            ? 'يمكنك إضافة باقي أقسامك وتعديلها بسهولة في أي وقت لاحقاً من لوحة التحكم.'
            : 'Vous pourrez ajouter et personnaliser l’ensemble de vos classes plus tard depuis le tableau de bord.'}
        </p>
      </div>
    );
  }
);

ClassesStep.displayName = 'ClassesStep';

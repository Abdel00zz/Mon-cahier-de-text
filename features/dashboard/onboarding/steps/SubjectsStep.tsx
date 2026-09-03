import { memo, useMemo, useState } from 'react';
import { Check } from '@/components/ui/icons';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import type { ModalLang, OnboardingCopy } from '../types';

interface SubjectsStepProps {
  subjects: string[];
  selectedSubjects: string[];
  teacherName: string;
  lang: ModalLang;
  copy: OnboardingCopy;
  onToggle: (subject: string) => void;
}

const normalizeSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u065f]/g, '')
    .toLocaleLowerCase();

export const SubjectsStep = memo<SubjectsStepProps>(
  ({ subjects, selectedSubjects, teacherName, lang, copy, onToggle }) => {
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);
    const search = normalizeSearch(query.trim());
    const visibleSubjects = useMemo(() => {
      if (search)
        return subjects.filter((subject) =>
          normalizeSearch(
            subject + ' ' + formatLocalizedSubjectDisplayName(subject, lang),
          ).includes(search),
        );
      if (expanded) return subjects;
      return subjects.filter(
        (subject, index) => index < 8 || selectedSubjects.includes(subject),
      );
    }, [subjects, selectedSubjects, search, expanded, lang]);
    const ar = lang === 'ar';
    return (
      <div className="space-y-5">
        <p className="text-start text-sm leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
          {copy.subjectSelectionHint(teacherName)}
        </p>
        <div>
          <label
            htmlFor="onboarding-subject-search"
            className="mb-2 block text-sm font-medium"
          >
            {ar ? 'البحث عن مادة' : 'Rechercher une matière'}
          </label>
          <input
            id="onboarding-subject-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="keep-surface h-11 w-full px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>
        <div
          id="onboarding-subject-options"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          role="group"
          aria-label={copy.sectionSubjects}
        >
          {visibleSubjects.map((subject) => {
            const selected = selectedSubjects.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onToggle(subject)}
                className={cn(
                  'keep-surface keep-interactive keep-choice group flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-start text-sm font-medium sm:text-base',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
                    selected
                      ? 'border-amber-400 bg-[#facc15]'
                      : 'border-[#dadce0] bg-transparent dark:border-[#5f6368]',
                  )}
                >
                  {selected && (
                    <Check className="h-3.5 w-3.5 text-neutral-950 stroke-[3]" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {formatLocalizedSubjectDisplayName(subject, lang)}
                </span>
              </button>
            );
          })}
        </div>
        {visibleSubjects.length === 0 && (
          <p
            role="status"
            className="text-sm text-[#5f6368] dark:text-[#bdc1c6]"
          >
            {ar
              ? 'لم نجد مادة بهذا الاسم. جرّب كلمة أخرى.'
              : 'Aucune matière trouvée. Essayez un autre mot.'}
          </p>
        )}
        {!search && subjects.length > 8 && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="onboarding-subject-options"
            onClick={() => setExpanded((value) => !value)}
            className="min-h-11 rounded-lg px-2 text-sm underline underline-offset-4 focus-visible:outline-2"
          >
            {expanded
              ? ar
                ? 'عرض قائمة مختصرة'
                : 'Réduire la liste'
              : ar
                ? `عرض جميع المواد (${subjects.length})`
                : `Voir toutes les matières (${subjects.length})`}
          </button>
        )}
      </div>
    );
  },
);

SubjectsStep.displayName = 'SubjectsStep';

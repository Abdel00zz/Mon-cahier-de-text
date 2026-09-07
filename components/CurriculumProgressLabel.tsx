import { useLocale } from '@/i18n/LocaleProvider';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import type { AppConfig, ClassInfo, LessonsData } from '@/types';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';

/** Only a short result reaches the UI; sources, windows and hour calculations stay in the engine. */
export function CurriculumProgressLabel({ classInfo, config, lessonsData }: { classInfo: ClassInfo; config: AppConfig; lessonsData: LessonsData }) {
  const { locale } = useLocale();
  const today = useMoroccoToday();
  const progress = useCurriculumProgress(classInfo, config, lessonsData);
  if (!progress || !progress.rows.some(row => row.indices.length)) return null;
  const started = progress.rows.filter(row => row.startDate && row.startDate <= today && row.indices.length).length;
  return <p className="mt-2 text-xs text-foreground/80">{locale === 'ar' ? 'التقدم في البرنامج' : locale === 'en' ? 'Curriculum progress' : 'Avancement dans le programme'} : {started}/{progress.rows.length} {locale === 'ar' ? 'دروس بدأت' : locale === 'en' ? 'chapters started' : 'chapitres commencés'}{progress.completionRate !== null ? ` · ≈ ${progress.completionRate}%` : ''}</p>;
}

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
  return <div className="mt-2 space-y-1 text-xs text-muted-foreground">
    <p>{locale === 'ar' ? 'التقدم في البرنامج' : locale === 'en' ? 'Curriculum progress' : 'Avancement dans le programme'} : {started}/{progress.rows.length} {locale === 'ar' ? 'دروس بدأت' : locale === 'en' ? 'chapters started' : 'chapitres commencés'}{progress.completionRate !== null ? ` · ≈ ${progress.completionRate}%` : ''}</p>
    {progress.expectedRate !== null && <p>{locale === 'ar' ? 'الوتيرة المتوقعة حتى أمس' : locale === 'en' ? 'Expected pace through yesterday' : 'Rythme prévu jusqu’à hier'} : {progress.expectedRate}%</p>}
    {!progress.projectionAvailable && <p>{locale === 'ar' ? 'أضف تاريخًا لعنوان الدرس الأول في الجدول وتحقق من استعمال الزمن.' : locale === 'en' ? 'Date the first chapter title in the table and check the timetable.' : 'Datez le titre du premier chapitre dans le tableau et vérifiez l’emploi du temps.'}</p>}
  </div>;
}

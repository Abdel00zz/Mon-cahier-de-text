import type { OfficialCurriculumPlan } from '@/types';
import type { computeOfficialProgression } from '@/domain/curriculum/officialCurriculum';
import { MathTitle } from '@/components/ui/math-title';
import { useLocale } from '@/i18n/LocaleProvider';
import { CurriculumChapterProgress } from './CurriculumChapterProgress';

type Progress = NonNullable<ReturnType<typeof computeOfficialProgression>>;

/** Vue « Programme officiel » : tous les chapitres du programme, avec avancement et rythme prévu. */
export function CurriculumProgramView({ plan, progress }: { plan: OfficialCurriculumPlan; progress: Progress }) {
  const { t, isRtl } = useLocale();
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-2">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t('analysis.program.estimate')}
        {plan.authority !== 'ministerial' && <> {t('analysis.program.nonMinisterial')}</>}
      </p>
      <ol className="divide-y divide-border/60">
        {progress.rows.map(row => (
          <li key={row.officialChapter.id} className="space-y-1.5 py-2.5">
            <p className="text-xs font-medium" dir="auto">
              <span className="me-2 text-muted-foreground">{row.officialChapter.order}.</span>
              <MathTitle text={row.officialChapter.title} />
            </p>
            <CurriculumChapterProgress row={row} />
          </li>
        ))}
      </ol>
    </div>
  );
}

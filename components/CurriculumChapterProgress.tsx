import { useLocale } from '@/i18n/LocaleProvider';
import type { computeOfficialProgression } from '@/utils/officialCurriculum';

type Row = ReturnType<typeof computeOfficialProgression>['rows'][number];

/** Two aligned lanes remain readable even when the two values are identical. */
export function CurriculumChapterProgress({ row }: { row: Row }) {
  const { locale } = useLocale();
  const l = (fr: string, ar: string, en: string) => locale === 'ar' ? ar : locale === 'en' ? en : fr;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const actual = row.completionRate === null ? null : Math.round(row.completionRate * 100);
  const expected = row.expectedRate === null ? null : Math.round(row.expectedRate * 100);
  const label = l('Avancement estimé', 'التقدم التقديري', 'Estimated progress');
  const target = l('Rythme prévu', 'الوتيرة المتوقعة', 'Expected pace');
  const date = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  return <div className="space-y-1.5" data-curriculum-progress={row.officialChapter.id}>
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>{row.status === 'completed' ? l('Terminé', 'مكتمل', 'Completed') : label} <span className="font-medium text-foreground">{actual === null ? '—' : `${row.status === 'completed' ? '' : '≈ '}${number.format(actual)}%`}</span></span>
      <span>{target} {expected === null ? '—' : `${number.format(expected)}%`}</span>
    </div>
    {(row.startDate || row.endDate) && <p className="text-[11px] text-muted-foreground">
      {row.startDate && `${l('Début', 'البداية', 'Start')} · ${date(row.startDate)}`}
      {row.endDate && ` · ${l('Fin', 'النهاية', 'End')} · ${date(row.endDate)}`}
    </p>}
    {row.issue && <p className="text-[11px] text-amber-700 dark:text-amber-400">{row.issue === 'missing_start'
      ? l('Datez le titre du chapitre dans le tableau.', 'أضف تاريخًا لعنوان الدرس في الجدول.', 'Date the chapter title in the table.')
      : l('Dates du chapitre à vérifier.', 'يرجى مراجعة تواريخ الدرس.', 'Check the chapter dates.')}</p>}
    <div className="space-y-1" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {[{ value: actual, label, color: 'bg-primary' }, { value: expected, label: target, color: 'bg-slate-400 dark:bg-slate-500' }].map(lane => <div key={lane.label} role="progressbar" aria-label={`${row.officialChapter.title} · ${lane.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={lane.value ?? undefined} aria-valuetext={lane.value === null ? l('Indisponible', 'غير متاح', 'Unavailable') : `${lane.value}%`} className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${lane.color}`} style={{ width: `${lane.value ?? 0}%` }} />
      </div>)}
    </div>
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>{row.officialChapter.allocatedHours === null ? l('Durée non renseignée', 'المدة غير محددة', 'Duration unavailable') : `${number.format(row.officialChapter.allocatedHours)} ${l('h prévues', 'ساعات مبرمجة', 'planned h')}`}</span>
      {row.estimatedEnd && <span>{l('Fin visée', 'النهاية المتوقعة', 'Target end')} · {date(row.estimatedEnd)}</span>}
    </div>
  </div>;
}

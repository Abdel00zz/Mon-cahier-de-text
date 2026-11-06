import { useLocale } from '@/i18n/LocaleProvider';

/** The notebook owns dates. The tracking sheet only displays them. */
export function EvaluationDate({ date, endDate }: { date?: string; endDate?: string }) {
  const { t } = useLocale();
  const format = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso;
  return <span className="ev-date-text">
    {date ? <>
      <time dateTime={date}><bdi dir="ltr">{format(date)}</bdi></time>
      {endDate && endDate !== date && <><span aria-hidden="true"> – </span><time dateTime={endDate}><bdi dir="ltr">{format(endDate)}</bdi></time></>}
    </> : t('evaluations.noDateYet')}
  </span>;
}

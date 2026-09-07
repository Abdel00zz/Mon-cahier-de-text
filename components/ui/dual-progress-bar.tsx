import { useLocale } from '@/i18n/LocaleProvider';

interface DualProgressBarProps {
  value: number | null;
  target?: number | null;
  label: string;
}

const percentage = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value)
  ? Math.min(100, Math.max(0, value)) : null;

/** One track: theme accent = current progress, lighter accent = remaining goal. */
export function DualProgressBar({ value, target, label }: DualProgressBarProps) {
  const { locale, isRtl } = useLocale();
  const actual = percentage(value);
  const expected = percentage(target);
  const l = (fr: string, ar: string, en: string) => locale === 'ar' ? ar : locale === 'en' ? en : fr;
  const detail = actual === null ? l('Progression non renseignée', 'التقدم غير محدد', 'Progress not available')
    : `${Math.round(actual)}%${expected === null ? '' : ` · ${l('Repère du programme', 'مرجع البرنامج', 'Curriculum target')} ${Math.round(expected)}%`}`;
  return <div role="progressbar" aria-label={label || l('Progression', 'التقدم', 'Progress')} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={actual ?? undefined} aria-valuetext={detail} title={actual === null ? undefined : detail}
    dir={isRtl ? 'rtl' : 'ltr'}
    className={`relative h-2 w-full overflow-hidden rounded-full ${actual === null ? 'bg-muted' : 'bg-primary/10'}`}>
    {actual !== null && <>
      <div aria-hidden="true" data-progress-fill className="absolute inset-0 rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${actual / 100})`, transformOrigin: isRtl ? 'right' : 'left' }} />
      {expected !== null && expected > 0 && expected < 100 && <span aria-hidden="true" data-progress-target
        className="absolute inset-y-0 w-px bg-foreground/60"
        style={{ insetInlineStart: `${expected}%` }} />}
    </>}
  </div>;
}

import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat, dateTimeFormat } from '@/lib/formatters';
import { summarizeClassStudentReviews } from '@/domain/evaluations/pedagogicalReview';
import type { AppConfig } from '@/types';

export function ClassPedagogicalSummary({ config, classId, onOpen }: { config: AppConfig; classId: string; onOpen: () => void }) {
    const { t, locale } = useLocale();
    const reviews = summarizeClassStudentReviews(config, classId);
    const number = numberFormat(locale);
    if (!reviews.notebook && !reviews.oral) return null;
    return <div className="space-y-2 pb-4" data-pedagogical-review-summary>
        {(['notebook', 'oral'] as const).map(mode => {
            const review = reviews[mode];
            if (!review) return null;
            const date = new Date(`${review.date}T12:00:00`);
            return <details key={mode} className="rounded-lg border border-border/70 bg-muted/15 text-xs">
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="font-semibold">{t(`evaluations.${mode}.title`)}</span>
                    <span className="text-muted-foreground">{!Number.isNaN(date.getTime()) && dateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)}</span>
                    <span className="ms-auto text-muted-foreground">{t('notifications.review.observed', { reviewed: number.format(review.reviewed), total: number.format(review.total) })}</span>
                    <span className="basis-full text-muted-foreground">{review.priorityNames.length || review.pending
                        ? [review.priorityNames.length ? t('notifications.review.support', { count: number.format(review.priorityNames.length) }) : '', review.pending ? t('notifications.review.pending', { count: number.format(review.pending) }) : ''].filter(Boolean).join(' · ')
                        : t('notifications.review.complete')}</span>
                </summary>
                <div className="space-y-2 px-3 pb-3">
                    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                        {(mode === 'notebook' ? ['good', 'average', 'needs_work', 'missing'] : ['mastered', 'developing', 'needs_support']).map(state => <div key={state} className="flex gap-1"><dt>{t(`evaluations.${mode}.${state}`)}</dt><dd className="font-semibold text-foreground">{number.format(review.counts[state] ?? 0)}</dd></div>)}
                    </dl>
                    {review.priorityNames.length > 0 && <p dir="auto" className="break-words text-foreground">{review.priorityNames.slice(0, 4).join(locale === 'ar' ? '، ' : ', ')}{review.priorityNames.length > 4 ? '…' : ''}</p>}
                    <button type="button" onClick={onOpen} className="min-h-11 rounded-lg px-2 font-semibold text-primary underline underline-offset-4">{t('notifications.review.open')}</button>
                </div>
            </details>;
        })}
    </div>;
}

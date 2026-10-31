import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Users } from '@/components/ui/icons';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';

export function ClassRosterFields({ value, onChange, names, invalid, changed, suggestedNames = [] }: {
    value: string; onChange: (value: string) => void; names: string[]; invalid: boolean;
    changed: boolean; suggestedNames?: string[];
}) {
    const { t, locale } = useLocale();
    const id = useId();
    return <section className="space-y-4" aria-label={t('classRoster.title')}>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('classRoster.help')}</p>
        {changed && <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">{t('classRoster.changed')}</p>}
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-semibold">{t('classRoster.label')}</label>
            <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={5} dir="auto" spellCheck={false}
                aria-describedby={`${id}-help`} aria-invalid={invalid} placeholder={t('classRoster.placeholder')}
                className="min-h-32 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-base leading-7 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
            <p id={`${id}-help`} className="text-xs leading-relaxed text-muted-foreground">{t('classRoster.format')}</p>
        </div>
        {invalid ? <p role="alert" className="text-sm text-destructive">{t('evaluations.students.limit')}</p>
            : <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" aria-hidden="true"/>{t('classRoster.count', { count: numberFormat(locale).format(names.length) })}</p>}
        {!!names.length && <ol className="grid max-h-44 grid-cols-1 gap-x-4 overflow-y-auto rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
            {names.map((name, index) => <li key={name} className="flex min-w-0 gap-2 py-1.5 text-sm"><span className="text-muted-foreground tabular-nums">{numberFormat(locale).format(index + 1)}.</span><bdi className="break-words">{name}</bdi></li>)}
        </ol>}
        {!value.trim() && !!suggestedNames.length && <Button type="button" variant="outline" onClick={() => onChange(suggestedNames.join(' ؛ '))}
            className="min-h-11 rounded-lg border border-border px-3 text-start text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
            {t('classRoster.import')} · {t('classRoster.history')} ({numberFormat(locale).format(suggestedNames.length)})
        </Button>}
    </section>;
}

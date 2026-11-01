import { useId, useState } from 'react';
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
    const [viewMode, setViewMode] = useState<'edit' | 'list'>('edit');
    const maxStudents = 60;
    const progressPct = Math.min(100, Math.round((names.length / maxStudents) * 100));
    const listLabel = locale === 'ar' ? 'قائمة' : locale === 'en' ? 'List' : 'Liste';
    const editLabel = locale === 'ar' ? 'تحرير' : locale === 'en' ? 'Edit' : 'Édition';

    return <section className="space-y-3.5" aria-label={t('classRoster.title')}>
        <p className="text-xs leading-relaxed text-[#7a7169] dark:text-muted-foreground">{t('classRoster.help')}</p>
        {changed && <p role="status" className="rounded-xl border border-border bg-muted p-3 text-sm">{t('classRoster.changed')}</p>}

        <div className="class-roster-cap">
            <span aria-live="polite" className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#7a5a49] dark:text-primary" aria-hidden="true" />
                <b>{t('classRoster.count', { count: numberFormat(locale).format(names.length) })}</b>
            </span>
            <div className="class-roster-mode" role="group" aria-label={t('classRoster.title')}>
                <button type="button" data-on={viewMode === 'list' ? '1' : '0'} onClick={() => setViewMode('list')}>{listLabel}</button>
                <button type="button" data-on={viewMode === 'edit' ? '1' : '0'} onClick={() => setViewMode('edit')}>{editLabel}</button>
            </div>
        </div>
        <div className="class-roster-bar" aria-hidden="true">
            <i style={{ width: `${progressPct}%` }} />
        </div>

        <div className="space-y-2" hidden={viewMode === 'list' && names.length > 0}>
            <label htmlFor={id} className="block text-[0.86rem] font-medium text-[#7a7169] dark:text-muted-foreground">{t('classRoster.label')}</label>
            <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={5} dir="auto" spellCheck={false}
                aria-describedby={`${id}-help`} aria-invalid={invalid} placeholder={t('classRoster.placeholder')}
                className="class-roster-textarea min-h-32 w-full resize-y rounded-[1rem] border-0 bg-[#ffffffd9] px-4 py-3.5 text-base leading-[1.95] text-[#2f2822] shadow-none focus-visible:bg-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#7a5a49]/22 dark:bg-card dark:text-foreground" />
            <p id={`${id}-help`} className="text-xs leading-relaxed text-[#7a7169] dark:text-muted-foreground">{t('classRoster.format')}</p>
        </div>

        {invalid && <p role="alert" className="text-sm text-destructive">{t('evaluations.students.limit')}</p>}

        {!!names.length && <ol className="class-roster-names">
            {names.map((name, index) => <li key={name} className="class-roster-name-item"><i>{numberFormat(locale).format(index + 1)}</i><bdi className="break-words">{name}</bdi></li>)}
        </ol>}

        {!value.trim() && !!suggestedNames.length && <Button type="button" variant="outline" onClick={() => onChange(suggestedNames.join(' ؛ '))}
            className="min-h-11 rounded-xl border border-[#ebe5dc] bg-white px-3.5 text-start text-sm hover:bg-[#f0ebe3] focus-visible:ring-2 focus-visible:ring-primary dark:border-border dark:bg-card">
            {t('classRoster.import')} · {t('classRoster.history')} ({numberFormat(locale).format(suggestedNames.length)})
        </Button>}
    </section>;
}

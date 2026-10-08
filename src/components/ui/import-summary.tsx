import { useLocale } from '@/i18n/LocaleProvider';

/** File metadata only: never guesses a version or a creation date. */
export function ImportSummary({ fileName, format, version, date, classes, blocks }: {
    fileName: string; format: string; version?: number | string; date?: string | null; classes?: number; blocks: number;
}) {
    const { t, locale } = useLocale();
    const number = new Intl.NumberFormat(locale);
    const dateText = date && Number.isFinite(Date.parse(date))
        ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(date))
        : t('transfer.preview.unknown');
    return <section className="space-y-2 rounded-xl border border-border p-3 text-sm" aria-label={t('transfer.preview.title')}>
        <h3 className="font-semibold">{t('transfer.preview.title')}</h3>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-muted-foreground">
            <dt>{t('transfer.preview.file')}</dt><dd className="break-words"><bdi>{fileName || t('transfer.preview.pasted')}</bdi></dd>
            <dt>{t('transfer.preview.format')}</dt><dd><bdi dir="ltr">{format}{version !== undefined ? ` · v${version}` : ''}</bdi></dd>
            <dt>{t('transfer.preview.date')}</dt><dd>{dateText}</dd>
            {classes !== undefined && <><dt>{t('transfer.preview.classes')}</dt><dd>{number.format(classes)}</dd></>}
            <dt>{t('transfer.preview.blocks')}</dt><dd>{number.format(blocks)}</dd>
        </dl>
    </section>;
}

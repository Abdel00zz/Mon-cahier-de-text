import { useLocale } from '@/i18n/LocaleProvider';
import type { NotebookAdvice } from '@/domain/intelligence/notebookAdvisor';

/** Libellé localisé par conseil : des littéraux, jamais construits dynamiquement. */
const ADVICE_KEYS: Record<NotebookAdvice['code'], string> = {
    unclosedFormula: 'advice.unclosedFormula',
    outOfOrderSessions: 'advice.outOfOrderSessions',
    duplicateBlocks: 'advice.duplicateBlocks',
    emptyStructure: 'advice.emptyStructure',
    undatedContent: 'advice.undatedContent',
    controlCharacters: 'advice.controlCharacters',
};

/** File metadata only: never guesses a version or a creation date. */
export function ImportSummary({ fileName, format, version, date, classes, blocks, advice }: {
    fileName: string; format: string; version?: number | string; date?: string | null; classes?: number; blocks: number;
    advice?: readonly NotebookAdvice[];
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
        {advice && advice.length > 0 && <div className="space-y-1.5 border-t border-border/70 pt-2.5" data-import-advice>
            <p className="text-xs font-semibold text-foreground">{t('transfer.preview.adviceTitle')}</p>
            <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                {advice.map(item => <li key={item.code} className="flex gap-2" data-advice={item.code} data-severity={item.severity}>
                    <span aria-hidden="true" className={item.severity === 'warning' ? 'text-alert-strong' : 'text-muted-foreground/70'}>•</span>
                    <span>{t(ADVICE_KEYS[item.code], { count: number.format(item.count) })}</span>
                </li>)}
            </ul>
        </div>}
    </section>;
}

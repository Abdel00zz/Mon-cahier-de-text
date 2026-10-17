import { useLocale } from '@/i18n/LocaleProvider';
import { dateTimeFormat, numberFormat } from '@/lib/formatters';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { homeworkDeadlines } from '@/domain/evaluations/studentFollowUp';
import './studentFollowUp.css';

export function HomeworkDeadlines({ items, onOpen, embedded = false }: { embedded?: boolean; items: ReturnType<typeof homeworkDeadlines>; onOpen: (classId: string) => void }) {
    const { t, locale } = useLocale();
    const number = numberFormat(locale);
    if (!items.length) return null;
    return <section className="homework-deadlines" aria-label={t('followUp.homeworkDeadlines')}>
        {!embedded && <h3>{t('followUp.homeworkDeadlines')}</h3>}
        <div className="homework-deadlines__list">{items.map(item => {
            const complete = item.total > 0 && item.given === item.total;
            const status = complete ? 'complete' : item.inDays < 0 ? 'past' : item.inDays === 0 ? 'today' : 'upcoming';
            return <article key={`${item.classInfo.id}:${item.assessmentId}`} className="homework-deadlines__item" data-status={status}>
                <div className="homework-deadlines__identity">
                    <p dir="auto">{formatLocalizedClassDisplayName(item.classInfo.name, locale)}</p>
                    <h4>{t('evaluations.homework.title')} {number.format(item.num)}</h4>
                </div>
                {!embedded && <div className="homework-deadlines__date"><time dateTime={item.dueDate}>{dateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${item.dueDate}T12:00:00`))}</time><span>{t(`followUp.due.${status}`)}</span></div>}
                <p className="homework-deadlines__summary">{item.total ? t('followUp.submissionSummary', { given: number.format(item.given), total: number.format(item.total), pending: number.format(item.pending), missing: number.format(item.missing) }) : t('followUp.noSubmissions')}</p>
                {item.total > 0 && <div className="homework-deadlines__progress" aria-hidden="true"><span style={{ width: `${item.given / item.total * 100}%` }} /></div>}
                {(item.missingNames.length > 0 || item.pendingNames.length > 0) && <details className="homework-deadlines__pupils" onClick={e => e.stopPropagation()}><summary>{t('followUp.submissionDetails')}</summary>
                    {item.missingNames.length > 0 && <p>{t('evaluations.homework.missing')}<span dir="auto">{item.missingNames.join(locale === 'ar' ? '، ' : ', ')}</span></p>}
                    {item.pendingNames.length > 0 && <p>{t('followUp.toCheck')}<span dir="auto">{item.pendingNames.join(locale === 'ar' ? '، ' : ', ')}</span></p>}
                </details>}
                {!embedded && <button type="button" onClick={() => onOpen(item.classInfo.id)}>{t('notifications.action.openClass')}</button>}
            </article>;
        })}</div>
    </section>;
}

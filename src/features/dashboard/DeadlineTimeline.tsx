import { useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { dateTimeFormat, numberFormat } from '@/lib/formatters';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { ClassInfo } from '@/types';
import { deadlineState, type FollowUpDeadline } from '@/domain/evaluations/followUpDeadlines';
import { HomeworkDeadlines } from './HomeworkDeadlines';
import './deadlineTimeline.css';

export function DeadlineTimeline({ items, classes, today, onOpen }: {
  items: readonly FollowUpDeadline[]; classes: readonly ClassInfo[]; today: string; onOpen: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const root = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Reveal once; content is readable by default, including before hydration.
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.entered = 'true';
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    root.current.querySelectorAll('.deadline-timeline__item').forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [items]);
  const number = numberFormat(locale);
  const dateFormat = dateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T12:00:00`));
  const names = new Map(classes.map(item => [item.id, formatLocalizedClassDisplayName(item.name, locale)]));
  return <ol ref={root} className="deadline-timeline" aria-label={t('notifications.deadlines')}>
    {items.map(item => {
      const title = item.kind === 'assessment' ? `${t(`evaluations.type.${item.value.type}`)} ${number.format(item.value.num)}`
        : item.kind === 'homework' ? '' : item.value.event.title;
      const end = item.endDate;
      const status = deadlineState(item, today);
      const indicative = item.kind === 'assessment' ? item.value.predictionStatus === 'derived'
        : item.kind === 'official' && item.value.event.dateKind === 'indicative';
      return <li key={`${item.id}:${item.date}:${status}`} className="deadline-timeline__item" data-kind={item.kind} data-status={status}>
        <div className="deadline-timeline__when">
          <time dateTime={item.date}>{formatDate(item.date)}</time>
          {end && end > item.date && <time dateTime={end}>– {formatDate(end)}</time>}
          <span>{t(item.kind === 'official' ? 'notifications.officialEvent' : item.kind === 'homework' ? `followUp.due.${status}` : `followUp.when.${status}`)}</span>
        </div>
        <div className="deadline-timeline__body">
          {item.kind === 'homework' ? <HomeworkDeadlines items={[item.value]} embedded onOpen={onOpen} /> : <>
            <p className="deadline-timeline__context" dir="auto">{item.classIds.map(id => names.get(id)).filter(Boolean).join(locale === 'ar' ? '، ' : ' · ')}</p>
            <h3>{title}</h3>
            {indicative && <p className="deadline-timeline__context">{t('followUp.indicativeDate')}</p>}
            {item.kind === 'official' && <p className="deadline-timeline__context">{item.value.event.studentAction}</p>}
            {item.kind !== 'official' && <button type="button" onClick={() => onOpen(item.classIds[0])}>{t('notifications.action.openClass')}</button>}
          </>}
        </div>
      </li>;
    })}
  </ol>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { dateTimeFormat, numberFormat } from '@/lib/formatters';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { ClassInfo } from '@/types';
import { localizedActivityTitle } from '@/domain/evaluations/activityTitle';
import { activeDeadlineState, type FollowUpDeadline } from '@/domain/evaluations/followUpDeadlines';
import { HomeworkDeadlines } from './HomeworkDeadlines';
import './deadlineTimeline.css';

export function DeadlineTimeline({ items, classes, today, onOpen }: {
  items: readonly FollowUpDeadline[]; classes: readonly ClassInfo[]; today: string; onOpen: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Inverser du bas vers le haut : le haut contient les dernières mises à jour (plus récentes en premier)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [items]);

  const states = useMemo(() => sortedItems.map(item => activeDeadlineState(item, today)), [sortedItems, today]);

  // Synchronize CSS custom properties for 60/120fps GPU compositor animation
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const measureAndApply = () => {
      const spineEl = rootEl.querySelector<HTMLElement>('.deadline-timeline__spine');
      const nodeEls = Array.from(rootEl.querySelectorAll<HTMLElement>('.deadline-timeline__node'));
      const articleEls = Array.from(rootEl.querySelectorAll<HTMLElement>('.deadline-timeline__article'));
      if (!spineEl || !nodeEls.length) return;

      const spineRect = spineEl.getBoundingClientRect();
      const nodeYs = nodeEls.map(nodeEl => {
        const nodeRect = nodeEl.getBoundingClientRect();
        const relativeY = (nodeRect.top + nodeRect.height * 0.5) - spineRect.top;
        return Math.max(0, Math.min(spineRect.height, relativeY));
      });

      // Le haut (index 0) représente les dernières mises à jour
      const activeIdx = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < nodeYs.length
        ? hoveredIndex
        : 0;

      const targetY = nodeYs[activeIdx] ?? 0;

      rootEl.style.setProperty('--timeline-fill-height', `${targetY.toFixed(1)}px`);
      rootEl.style.setProperty('--traveler-y', `${targetY.toFixed(1)}px`);

      for (let i = 0; i < articleEls.length; i++) {
        const nodeY = nodeYs[i] ?? 0;
        const reached = targetY + 6 >= nodeY;
        if (reached) {
          if (articleEls[i].dataset.reached !== 'true') articleEls[i].dataset.reached = 'true';
        } else if (articleEls[i].dataset.reached) {
          delete articleEls[i].dataset.reached;
        }
        if (hoveredIndex === i) {
          if (articleEls[i].dataset.active !== 'true') articleEls[i].dataset.active = 'true';
        } else if (articleEls[i].dataset.active) {
          delete articleEls[i].dataset.active;
        }
      }
    };

    const initialTimer = window.setTimeout(() => {
      const articles = rootEl.querySelectorAll<HTMLElement>('.deadline-timeline__article');
      articles.forEach(el => { el.dataset.entered = 'true'; });
      measureAndApply();
    }, 50);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => measureAndApply())
      : null;
    resizeObserver?.observe(rootEl);

    window.addEventListener('resize', measureAndApply, { passive: true });

    return () => {
      window.clearTimeout(initialTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureAndApply);
    };
  }, [sortedItems, states, hoveredIndex]);

  const number = numberFormat(locale);
  const dateFormat = dateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T12:00:00`));
  const names = new Map(classes.map(item => [item.id, formatLocalizedClassDisplayName(item.name, locale)]));

  return (
    <div
      ref={root}
      className="deadline-timeline"
      aria-label={t('notifications.deadlines')}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      {/* ── Start Terminal Badge (Le haut contient les dernières mises à jour) ── */}
      <div className="deadline-timeline__start" aria-hidden="true">
        <span className="deadline-timeline__start-badge">
          <svg viewBox="0 0 16 16" fill="none" className="deadline-timeline__start-icon">
            <path d="M8 13.25V3.75M4.75 7 8 3.75 11.25 7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{locale === 'ar' ? 'أحدث المحطات' : 'Dernières échéances'}</span>
        </span>
      </div>

      {/* ── Central Spine (Track + Animated Fill + Traveling Marker) ── */}
      <div className="deadline-timeline__spine" aria-hidden="true">
        <span className="deadline-timeline__spine-track" />
        <span className="deadline-timeline__spine-fill" />
        <span className="deadline-timeline__traveler">
          <svg viewBox="0 0 16 16" fill="none" className="deadline-timeline__traveler-icon">
            <path d="M8 2.75v9.5M4.75 9 8 12.25 11.25 9" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* ── Alternating Milestone Articles ── */}
      {sortedItems.map((item, index) => {
        const title = item.kind === 'assessment' ? `${t(`evaluations.type.${item.value.type}`)} ${number.format(item.value.num)}`
          : item.kind === 'homework' ? ''
          : item.kind === 'activity' ? localizedActivityTitle(item.value.event.title, item.value.event.type, locale)
          : item.value.event.title;
        const end = item.endDate;
        const status = states[index];
        const side = index % 2 === 0 ? 'start' : 'end';
        const dayNumber = parseInt(item.date.slice(8, 10), 10);

        const activityStudents = item.kind === 'activity' ? item.value.event.students : undefined;
        const activityTotal = activityStudents?.names.length ?? 0;
        const activityReviewed = activityTotal > 0
          ? activityStudents!.names.filter(name =>
              Boolean(activityStudents?.notebookConditions?.[name] || activityStudents?.oralOutcomes?.[name] || activityStudents?.oralGrades?.[name])
            ).length
          : 0;

        return (
          <article
            key={`${item.id}:${item.date}:${status}`}
            className="deadline-timeline__article"
            data-kind={item.kind}
            data-status={status}
            data-side={side}
            style={{ '--stagger-index': Math.min(index, 8) } as React.CSSProperties}
            onPointerEnter={() => setHoveredIndex(index)}
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
          >
            {/* ── Milestone Node (on the spine) ── */}
            <div
              className="deadline-timeline__node"
              aria-hidden="true"
              onClick={() => setHoveredIndex(index)}
            >
              {status === 'complete' ? (
                <svg viewBox="0 0 16 16" fill="none" className="deadline-timeline__node-check">
                  <path d="M3.5 8.25 6.5 11.25 12.5 5.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="deadline-timeline__node-day">{number.format(dayNumber)}</span>
              )}
            </div>

            {/* ── Card with Directional Speech-Bubble Arrow ── */}
            <div className="deadline-timeline__card-wrapper">
              <span className="deadline-timeline__card-arrow" aria-hidden="true" />
              <div
                className="deadline-timeline__card"
                role="button"
                tabIndex={0}
                onClick={() => onOpen(item.classIds[0])}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(item.classIds[0]);
                  }
                }}
              >
                <div className="deadline-timeline__meta">
                  <p className="deadline-timeline__context" dir="auto">
                    {item.classIds.map(id => names.get(id)).filter(Boolean).join(locale === 'ar' ? '، ' : ' · ')}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <time className="deadline-timeline__date" dateTime={item.date}>
                      {formatDate(item.date)}
                      {end && end > item.date && ` – ${formatDate(end)}`}
                    </time>
                    {status === 'complete' && (
                      <span className="deadline-timeline__status-badge">
                        <svg viewBox="0 0 16 16" fill="none" className="deadline-timeline__status-badge-icon">
                          <path d="M3.5 8.25 6.5 11.25 12.5 5.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t('followUp.when.complete')}
                      </span>
                    )}
                    {status === 'today' && (
                      <span className="deadline-timeline__status-badge">
                        {t('followUp.when.today')}
                      </span>
                    )}
                  </div>
                </div>

                {item.kind === 'homework' ? (
                  <HomeworkDeadlines items={[item.value]} embedded onOpen={onOpen} />
                ) : (
                  <>
                    <h3>{title}</h3>
                    {activityTotal > 0 && (
                      <div className="deadline-timeline__activity-progress">
                        <div className="deadline-timeline__activity-progress-meta">
                          <span>{t('notifications.review.observed', { reviewed: number.format(activityReviewed), total: number.format(activityTotal) })}</span>
                          <strong>{number.format(Math.round((activityReviewed / activityTotal) * 100))}%</strong>
                        </div>
                        <div className="deadline-timeline__activity-progress-bar" aria-hidden="true">
                          <span style={{ width: `${(activityReviewed / activityTotal) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {/* ── Bottom Terminal Dot ── */}
      <div className="deadline-timeline__end" aria-hidden="true">
        <span className="deadline-timeline__end-dot" />
      </div>
    </div>
  );
}

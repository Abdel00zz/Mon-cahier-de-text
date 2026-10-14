import { useMemo } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useClassAssessments } from '@/hooks/useAssessments';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { numberFormat } from '@/lib/formatters';
import { summarizeContinuousStudents } from '@/domain/evaluations/studentFollowUp';
import type { AppConfig, ClassInfo } from '@/types';
import './studentFollowUp.css';

export function ContinuousAssessmentStats({ config, classInfo }: {
    config: AppConfig; classInfo: ClassInfo;
}) {
    const { t, locale } = useLocale();
    const today = useMoroccoToday();
    const { assessments } = useClassAssessments(classInfo, config);
    const stats = useMemo(() => summarizeContinuousStudents(config, classInfo.id, assessments, today), [config, classInfo.id, assessments, today]);
    const number = numberFormat(locale, { maximumFractionDigits: 1 });
    const coverage = stats.total ? stats.observed / stats.total * 100 : 0;
    const observedOutcomes = stats.outcomes.reduce((sum, item) => sum + item.count, 0);
    return <section className="student-stats" aria-label={t('followUp.continuous')}>
        <header className="student-stats__header">
            <h4>{t('followUp.continuous')}</h4>
            <span className="student-stats__sessions">{t('followUp.sessions', { count: number.format(stats.sessions) })}</span>
        </header>
        {stats.observed === 0 ? <p className="student-stats__empty">{t('followUp.noObservations')}</p> : <>
            <div className="student-stats__overview">
                <div className="student-stats__coverage">
                    <svg viewBox="0 0 64 64" aria-hidden="true"><circle className="student-stats__ring-track" cx="32" cy="32" r="26" /><circle className="student-stats__ring" cx="32" cy="32" r="26" pathLength="100" strokeDasharray={`${coverage} 100`} /></svg>
                    <span><strong dir="ltr">{number.format(stats.observed)} / {number.format(stats.total)}</strong>{t('followUp.pupilsObserved')}</span>
                </div>
                <div className="student-stats__average"><strong dir="ltr">{stats.average === null ? '—' : number.format(stats.average)}<small> /20</small></strong><span>{t('followUp.latestAverage', { count: number.format(stats.graded) })}</span></div>
            </div>
            <p className="student-stats__caption">{t('followUp.latestOnly')}</p>
            <div className="student-stats__insights" aria-label={t('followUp.priorities')}>
                {stats.support.length > 0 && <details>
                    <summary>{t('followUp.support', { count: number.format(stats.support.length) })}</summary>
                    <ul>{stats.support.map(pupil => <li key={pupil.name}><span dir="auto">{pupil.name}</span><span>{pupil.grade !== null ? `${number.format(pupil.grade)} /20` : t('evaluations.oral.needs_support')}</span></li>)}</ul>
                </details>}
                {stats.pending.length > 0 && <details><summary>{t('followUp.pending', { count: number.format(stats.pending.length) })}</summary><p dir="auto">{stats.pending.join(locale === 'ar' ? '، ' : ', ')}</p></details>}
                {(stats.progressing.length > 0 || stats.declining.length > 0) && <details><summary>{t('followUp.evolution')}</summary>
                    {stats.progressing.length > 0 && <p>{t('followUp.progressing', { count: number.format(stats.progressing.length) })}<span dir="auto">{stats.progressing.join(locale === 'ar' ? '، ' : ', ')}</span></p>}
                    {stats.declining.length > 0 && <p>{t('followUp.declining', { count: number.format(stats.declining.length) })}<span dir="auto">{stats.declining.join(locale === 'ar' ? '، ' : ', ')}</span></p>}
                    <p className="student-stats__caption">{t('followUp.evolutionBasis')}</p>
                </details>}
            </div>
            {stats.graded > 0 && <figure className="student-stats__distribution">
                <figcaption>{t('followUp.gradeDistribution')}</figcaption>
                <div className="student-stats__bins">
                    {stats.bins.map((count, index) => <div key={index} className="student-stats__bin">
                        <strong>{number.format(count)}</strong>
                        <span className="student-stats__bar-track" aria-hidden="true"><span style={{ height: `${count / Math.max(...stats.bins, 1) * 100}%` }} /></span>
                        <span dir="ltr">{['0–<5', '5–<10', '10–<15', '15–20'][index]}</span>
                    </div>)}
                </div>
            </figure>}
            {observedOutcomes > 0 && <dl className="student-stats__outcomes">
                {stats.outcomes.map(({ state, count }) => <div key={state}>
                    <dt>{t(`evaluations.oral.${state}`)}</dt><dd>{number.format(count)}</dd>
                    <span className="student-stats__outcome-track" aria-hidden="true"><span style={{ width: `${count / observedOutcomes * 100}%` }} /></span>
                </div>)}
            </dl>}
        </>}
    </section>;
}

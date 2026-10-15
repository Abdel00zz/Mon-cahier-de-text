import { useId } from 'react';
import { ChevronDown, GraduationCap, SlidersHorizontal } from 'lucide-react';
import type { ClassInfo } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { DeadlineScope } from '@/domain/evaluations/followUpDeadlines';

export function DeadlineFilters({ classes, classId, scope, onClassChange, onScopeChange }: {
  classes: readonly ClassInfo[]; classId: string; scope: DeadlineScope;
  onClassChange: (value: string) => void; onScopeChange: (value: DeadlineScope) => void;
}) {
  const { t, locale } = useLocale();
  const id = useId();

  return (
    <div className="deadline-filters" role="search" aria-label={t('notifications.deadlines')}>
      {classes.length > 1 && (
        <div className="deadline-filter-item">
          <label htmlFor={`${id}-class`} className="deadline-filter-label">
            <GraduationCap className="deadline-filter-label-icon" aria-hidden="true" />
            <span>{t('followUp.classFilter')}</span>
            <span aria-hidden="true" className="deadline-filter-colon">:</span>
          </label>
          <div className="deadline-filter-control">
            <select
              id={`${id}-class`}
              className="deadline-filter-select"
              value={classId}
              onChange={event => onClassChange(event.target.value)}
            >
              <option value="">{t('followUp.allClasses')}</option>
              {classes.map(item => (
                <option key={item.id} value={item.id}>
                  {formatLocalizedClassDisplayName(item.name, locale)}
                </option>
              ))}
            </select>
            <ChevronDown className="deadline-filter-chevron" aria-hidden="true" />
          </div>
        </div>
      )}
      <div className="deadline-filter-item">
        <label htmlFor={`${id}-scope`} className="deadline-filter-label">
          <SlidersHorizontal className="deadline-filter-label-icon" aria-hidden="true" />
          <span>{t('followUp.scopeFilter')}</span>
          <span aria-hidden="true" className="deadline-filter-colon">:</span>
        </label>
        <div className="deadline-filter-control">
          <select
            id={`${id}-scope`}
            className="deadline-filter-select"
            value={scope}
            onChange={event => onScopeChange(event.target.value as DeadlineScope)}
          >
            {(['pending', 'complete', 'all'] as const).map(value => (
              <option key={value} value={value}>
                {t(`followUp.scope.${value}`)}
              </option>
            ))}
          </select>
          <ChevronDown className="deadline-filter-chevron" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

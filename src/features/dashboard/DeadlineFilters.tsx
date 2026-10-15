import { useId } from 'react';
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
  return <div className="deadline-filters">
    {classes.length > 1 && <div>
      <label htmlFor={`${id}-class`}>{t('followUp.classFilter')}</label>
      <select id={`${id}-class`} value={classId} onChange={event => onClassChange(event.target.value)}>
        <option value="">{t('followUp.allClasses')}</option>
        {classes.map(item => <option key={item.id} value={item.id}>{formatLocalizedClassDisplayName(item.name, locale)}</option>)}
      </select>
    </div>}
    <div>
      <label htmlFor={`${id}-scope`}>{t('followUp.scopeFilter')}</label>
      <select id={`${id}-scope`} value={scope} onChange={event => onScopeChange(event.target.value as DeadlineScope)}>
        {(['pending', 'complete', 'all'] as const).map(value => <option key={value} value={value}>{t(`followUp.scope.${value}`)}</option>)}
      </select>
    </div>
  </div>;
}

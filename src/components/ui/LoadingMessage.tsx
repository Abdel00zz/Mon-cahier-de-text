import type { CSSProperties } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import './loading-message.css';

const MESSAGE_KEYS = ['loading.lessTyping', 'loading.moreTeaching', 'loading.everyLesson', 'loading.valueTime'] as const;

/** CSS cycles the short copy; assistive technology receives one stable status. */
export function LoadingMessage({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  return <p className={`loading-message ${className}`}>
    <span className="sr-only">{t('common.loading')}</span>
    {MESSAGE_KEYS.map((key, index) => <span key={key} aria-hidden="true"
      style={{ '--message-delay': `${index * 3 - 12}s` } as CSSProperties}>
      {t(key)}
    </span>)}
  </p>;
}

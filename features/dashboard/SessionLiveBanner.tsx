import type { ClassInfo } from '@/types';
import { ArrowRight } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { classColorAttributes } from '@/utils/classColors';
import './sessionLiveBanner.css';
import './sessionEffects.css';

interface SessionLiveBannerProps {
  classInfo: ClassInfo;
  detail: string;
  onOpen: () => void;
}

/** The same live-session surface is used in the dashboard and visual preview. */
export function SessionLiveBanner({ classInfo, detail, onOpen }: SessionLiveBannerProps) {
  const { t, isRtl } = useLocale();
  return <button
    type="button"
    {...classColorAttributes(classInfo)}
    data-session-banner
    dir={isRtl ? 'rtl' : 'ltr'}
    className="session-live-banner"
    onClick={onOpen}
  >
    <span className="session-live-banner__content">
      <span className="session-live-banner__title session-live-text">{t('dashboard.welcome.nowTitle')}</span>
      <span className="session-live-banner__detail">{detail}</span>
    </span>
    <span className="session-live-banner__action">
      <span className="session-live-banner__action-label">{t('notifications.action.openClass')}</span>
      <span className="session-live-banner__arrow"><ArrowRight aria-hidden="true" /></span>
    </span>
  </button>;
}

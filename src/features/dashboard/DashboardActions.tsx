import { memo, type ReactNode } from 'react';
import { Columns2, Columns3, Square, Rows3 } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { nextClassDisplayMode, type ClassDisplayMode } from './classDisplayMode';
import './dashboardActions.css';

interface DashboardActionsProps {
    mode: ClassDisplayMode;
    onModeChange: (mode: ClassDisplayMode) => void;
    showDisplayModes?: boolean;
    children?: ReactNode;
}

const DISPLAY_ICONS = { triple: Columns3, double: Columns2, single: Square, list: Rows3 };

export const DashboardActions = memo(({ mode, onModeChange, showDisplayModes = true, children }: DashboardActionsProps) => {
    const { t, locale } = useLocale();
    const { impact } = useHapticFeedback();
    const nextMode = nextClassDisplayMode(mode);
    const switchLabel = t('dashboard.displaySwitch', { current: t(`dashboard.display.${mode}`), next: t(`dashboard.display.${nextMode}`) });
    const DisplayIcon = DISPLAY_ICONS[mode];

    if (!showDisplayModes && !children) return null;

    return (
        <div className="dashboard-actions-bar" dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={t('dashboard.actions')}>
            {children}
            {showDisplayModes && (
                <button
                    type="button"
                    className="dashboard-actions-bar__mode"
                    data-mode={mode}
                    aria-label={switchLabel}
                    title={switchLabel}
                    onClick={() => {
                        impact('light');
                        onModeChange(nextMode);
                    }}
                >
                    <span key={mode} className="dashboard-actions-bar__mode-glyph" aria-hidden="true">
                        <DisplayIcon size={19} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                </button>
            )}
            {showDisplayModes && <span className="sr-only" role="status" aria-live="polite">{t('dashboard.display')} : {t(`dashboard.display.${mode}`)}</span>}


        </div>
    );
});

DashboardActions.displayName = 'DashboardActions';

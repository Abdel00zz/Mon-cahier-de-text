import { memo } from 'react';
import { Columns2, Columns3, Square, Rows3 } from 'lucide-react';
import { CircleHelp } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { nextClassDisplayMode, type ClassDisplayMode } from './classDisplayMode';
import './dashboardActions.css';

interface DashboardActionsProps {
    mode: ClassDisplayMode;
    onModeChange: (mode: ClassDisplayMode) => void;
    onCreateClass?: () => void;
    onOpenGuide?: () => void;
    showDisplayModes?: boolean;
}

const DISPLAY_ICONS = { triple: Columns3, double: Columns2, single: Square, list: Rows3 };

export const DashboardActions = memo(({ mode, onModeChange, onOpenGuide, showDisplayModes = true }: DashboardActionsProps) => {
    const { t } = useLocale();
    const { impact } = useHapticFeedback();
    const nextMode = nextClassDisplayMode(mode);
    const switchLabel = t('dashboard.displaySwitch', { current: t(`dashboard.display.${mode}`), next: t(`dashboard.display.${nextMode}`) });
    const DisplayIcon = DISPLAY_ICONS[mode];

    return (
        <div className="dashboard-actions-bar" aria-label={t('dashboard.actions')}>
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

            {onOpenGuide && (
                <button
                    type="button"
                    className="dashboard-actions-bar__icon dashboard-actions-bar__help"
                    aria-label={t('toolbar.help')}
                    title={t('toolbar.help')}
                    onClick={() => { impact('light'); onOpenGuide(); }}
                >
                    <CircleHelp size={19} strokeWidth={1.8} aria-hidden="true" />
                </button>
            )}
        </div>
    );
});

DashboardActions.displayName = 'DashboardActions';

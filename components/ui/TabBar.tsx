import { BookOpen, Home, Settings } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export type MobileTabKey = 'dashboard' | 'editor' | 'settings';

interface TabBarProps {
    active: MobileTabKey;
    hasActiveClass?: boolean;
    onDashboard: () => void;
    onEditor?: () => void;
    onSettings: () => void;
}

const tabs = [
    { key: 'dashboard' as const, label: 'Accueil', icon: Home },
    { key: 'editor' as const, label: 'Cahier', icon: BookOpen },
    { key: 'settings' as const, label: 'Réglages', icon: Settings },
] as const;

export function TabBar({ active, hasActiveClass, onDashboard, onEditor, onSettings }: TabBarProps) {
    const handlers: Record<MobileTabKey, (() => void) | undefined> = {
        dashboard: onDashboard,
        editor: onEditor,
        settings: onSettings,
    };

    return (
        <nav className="m-tabbar" aria-label="Navigation principale mobile">
            {tabs.map(({ key, label, icon: Icon }) => {
                const disabled = key === 'editor' && !hasActiveClass;
                const isActive = active === key;
                return (
                    <button
                        key={key}
                        type="button"
                        className={cn('m-tab m-pressable', isActive && 'is-active')}
                        aria-current={isActive ? 'page' : undefined}
                        disabled={disabled}
                        onClick={handlers[key]}
                    >
                        <Icon aria-hidden className="h-5 w-5" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

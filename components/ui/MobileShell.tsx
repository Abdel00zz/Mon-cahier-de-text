import { PropsWithChildren } from 'react';
import { TabBar, type MobileTabKey } from './TabBar';

interface MobileShellProps extends PropsWithChildren {
    title: string;
    subtitle?: string;
    activeTab: MobileTabKey;
    hasActiveClass?: boolean;
    onDashboard: () => void;
    onEditor?: () => void;
    onSettings: () => void;
}

export function MobileShell({
    title,
    subtitle,
    activeTab,
    hasActiveClass,
    onDashboard,
    onEditor,
    onSettings,
    children,
}: MobileShellProps) {
    return (
        <div className="m-shell">
            <header className="m-appbar">
                <div className="m-appbar__row">
                    <div className="m-appbar__titles">
                        <h1>{title}</h1>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                </div>
            </header>
            <main className="m-main" id="m-scroll">{children}</main>
            <TabBar
                active={activeTab}
                hasActiveClass={hasActiveClass}
                onDashboard={onDashboard}
                onEditor={onEditor}
                onSettings={onSettings}
            />
        </div>
    );
}

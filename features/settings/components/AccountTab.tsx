import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';

const timeAgo = (iso: string, locale: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '—';
    const minutes = Math.floor((Date.now() - then) / 60_000);
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    if (minutes < 60) return formatter.format(-Math.max(1, minutes), 'minute');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return formatter.format(-hours, 'hour');
    return new Date(iso).toLocaleDateString(locale);
};

export const AccountTab: React.FC = () => {
    const { locale, t } = useLocale();
    const { user, logout } = useAuth();
    const { syncStatus, lastSyncAt, syncNow } = useSync();

    return (
        <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{t('account.title')}</h4>
                <p className="mt-2 text-lg font-bold text-foreground font-display">
                    {user ? `${user.prenom} ${user.nom}` : t('account.notSignedIn')}
                </p>
                {user && <p className="text-sm text-muted-foreground font-sans">{user.phone}</p>}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{t('account.sync')}</h4>
                        <p className="mt-1 text-sm font-semibold text-foreground font-sans">{t(`account.status.${syncStatus}`)}</p>
                        {lastSyncAt && (
                            <p className="text-[11px] text-muted-foreground/60 font-mono">{t('account.lastSync', { time: timeAgo(lastSyncAt, locale) })}</p>
                        )}
                    </div>
                    <Button type="button" variant="outline" onClick={syncNow} className="h-9 text-xs border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        {t('account.syncNow')}
                    </Button>
                </div>
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={() => logout()}
                className="h-10 w-full text-sm font-semibold text-destructive hover:bg-destructive/10 border-border/40"
            >
                {t('account.signOut')}
            </Button>
        </div>
    );
};

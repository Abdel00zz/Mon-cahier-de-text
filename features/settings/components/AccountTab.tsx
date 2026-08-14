import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { User, RefreshCw, LogOut, ShieldCheck } from '@/components/ui/icons';

const timeAgo = (iso: string, locale: string, unknownDate: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return unknownDate;
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
        <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5 shadow-2xs">
                <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <User className="h-5 w-5 stroke-[2.2]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('account.title')}</span>
                            {user && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <ShieldCheck className="h-3 w-3" />
                                    {t('settings.support.connected')}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-base font-bold text-foreground sm:text-lg">
                            {user ? `${user.prenom} ${user.nom}` : t('account.notSignedIn')}
                        </p>
                        {user && <p className="text-xs text-muted-foreground font-medium mt-0.5">{user.phone}</p>}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <RefreshCw className="h-5 w-5 stroke-[2.2]" />
                        </span>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('account.sync')}</span>
                            <p className="mt-0.5 text-sm font-bold text-foreground">{t(`account.status.${syncStatus}`)}</p>
                            {lastSyncAt && (
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                    {t('account.lastSync', { time: timeAgo(lastSyncAt, locale, t('account.unknownDate')) })}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={syncNow}
                        className="h-9.5 rounded-xl text-xs font-bold border-border/80 text-foreground hover:bg-accent/60 cursor-pointer shadow-2xs sm:shrink-0"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t('account.syncNow')}
                    </Button>
                </div>
            </div>

            <div className="pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => logout()}
                    className="h-10 w-full rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50 transition-all cursor-pointer shadow-2xs"
                >
                    <LogOut className="h-4 w-4" />
                    {t('account.signOut')}
                </Button>
            </div>
        </div>
    );
};

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { User, RefreshCw, ShieldCheck } from '@/components/ui/icons';

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
    const { user } = useAuth();
    const { syncStatus, lastSyncAt, syncNow } = useSync();

    return (
        <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-4 sm:p-5 shadow-xs backdrop-blur-xl">
                <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                        <User className="h-5 w-5 stroke-[2]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('account.title')}</span>
                            {user && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                                    <ShieldCheck className="h-3 w-3" />
                                    {t('settings.support.connected')}
                                </span>
                            )}
                        </div>
                        <p className={`mt-1 text-base font-bold sm:text-lg ${user ? 'font-itim text-[#0056D2] dark:text-[#38bdf8] text-lg sm:text-xl' : 'text-foreground'}`}>
                            {user ? `${user.prenom} ${user.nom}` : t('account.notSignedIn')}
                        </p>
                        {user && <p className="text-xs text-muted-foreground font-medium mt-0.5 font-mono">{user.phone}</p>}
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-4 sm:p-5 shadow-xs backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                            <RefreshCw className="h-5 w-5 stroke-[2]" />
                        </span>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('account.sync')}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <p className="text-sm font-bold text-foreground">{t(`account.status.${syncStatus}`)}</p>
                            </div>
                            {lastSyncAt && (
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                    {t('account.lastSync', { time: timeAgo(lastSyncAt, locale, t('account.unknownDate')) })}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        type="button"
                        onClick={syncNow}
                        className="h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-[0_4px_14px_rgba(99,102,241,0.3)] transition-all cursor-pointer sm:shrink-0 gap-1.5"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t('account.syncNow')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

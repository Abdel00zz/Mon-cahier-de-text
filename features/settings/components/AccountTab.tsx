import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/LocaleProvider';
import { RefreshCw, TriangleAlert, CircleCheck, Clock, CircleAlert, LogOut, User } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error(t('account.localBackupFailed'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-300/80 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
            <TriangleAlert className="h-3 w-3 stroke-[2.5]" />
            <span>{t('account.status.error')}</span>
          </span>
        );
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CircleCheck className="h-3 w-3 stroke-[2.5]" />
            <span>{t('account.status.synced')}</span>
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-300/80 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
            <RefreshCw className="h-3 w-3 animate-spin stroke-[2.5]" />
            <span>{t('account.status.syncing')}</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
            <Clock className="h-3 w-3 stroke-[2.5]" />
            <span>{t('account.status.pending')}</span>
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <CircleAlert className="h-3 w-3 stroke-[2.5]" />
            <span>{t('account.status.offline')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-bold text-muted-foreground">
            <span>{t(`account.status.${syncStatus}`)}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* 1. Zone principale encadrée : Synchronisation */}
      <section className="rounded-xl border border-border/80 bg-card/70 p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30">
                <RefreshCw className={cn('h-3.5 w-3.5 stroke-[2.2]', (isSyncing || syncStatus === 'syncing') && 'animate-spin')} />
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">{t('account.sync')}</h3>
              {getStatusBadge()}
            </div>
            {lastSyncAt && (
              <p className="text-[11px] text-muted-foreground font-medium ps-8.5">
                {t('account.lastSync', { time: timeAgo(lastSyncAt, locale, t('account.unknownDate')) })}
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || syncStatus === 'syncing'}
            className="min-h-11 px-3 gap-1.5 rounded-lg bg-[#feefc3] text-[#202124] hover:bg-amber-200 dark:bg-[#41331c] dark:text-amber-100 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-500/40 text-xs font-bold shadow-xs transition-colors active:scale-95 cursor-pointer sm:shrink-0"
          >
            <RefreshCw className={cn('h-3 w-3', (isSyncing || syncStatus === 'syncing') && 'animate-spin')} />
            <span>{t('account.syncNow')}</span>
          </Button>
        </div>
      </section>

      {/* 2. Session utilisateur & Déconnexion (compact et encadré) */}
      {user && (
        <section className="rounded-xl border border-border/70 bg-card/50 p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <User className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate font-mono">{user.phone}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.prenom} {user.nom}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-rose-200/80 bg-rose-50/70 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              <span>{t('account.signOut')}</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

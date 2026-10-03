import React, { useState } from 'react';
import type { AppConfig } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { teacherDisplayName } from '@/domain/classes/teacherIdentity';
import { RefreshCw, TriangleAlert, CircleCheck, Clock, CircleAlert, LogOut, User } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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

interface AccountTabProps {
  /** Configuration enregistrée : le nom d'usage affiché vient du profil. */
  config: AppConfig;
}

export const AccountTab: React.FC<AccountTabProps> = ({ config }) => {
  const { locale, t } = useLocale();
  const { user, logout } = useAuth();
  const { impact } = useHapticFeedback();
  const reducedMotion = useReducedMotion();
  const { syncStatus, lastSyncAt, syncNow } = useSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSync = async () => {
    impact('medium');
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
      <section className="rounded-lg border border-border/70 p-2.5 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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

          <motion.button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || syncStatus === 'syncing'}
            whileTap={reducedMotion ? undefined : { scale: 0.94 }}
            whileHover={reducedMotion ? undefined : { scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary border border-primary/30 px-3.5 text-xs font-bold shadow-xs transition-colors cursor-pointer sm:shrink-0 select-none disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 stroke-[2.2]', (isSyncing || syncStatus === 'syncing') && 'animate-spin')} />
            <span>{t('account.syncNow')}</span>
          </motion.button>
        </div>
      </section>

      {/* 2. Session utilisateur & Déconnexion (compact et encadré) */}
      {user && (
        <section className="rounded-xl border border-border/70 p-3 sm:p-3.5 bg-card/60">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground border border-border/60">
                <User className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground break-words">{teacherDisplayName(config.defaultTeacherName, user)}</p>
                {(user.email || user.phone) && <p dir="auto" className="mt-0.5 text-xs leading-relaxed text-muted-foreground break-all">{user.email || user.phone}</p>}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => {
                impact('medium');
                handleLogout();
              }}
              disabled={isLoggingOut}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 transition-colors cursor-pointer select-none disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>{t('account.signOut')}</span>
            </motion.button>
          </div>
        </section>
      )}
    </div>
  );
};

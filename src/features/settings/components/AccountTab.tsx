import React, { useState } from 'react';
import type { AppConfig } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { teacherDisplayName } from '@/domain/classes/teacherIdentity';
import { RefreshCw, TriangleAlert, CircleCheck, Clock, CircleAlert, LogOut } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { SettingsRow, SettingsSection, settingsButtonClass } from './SettingsPrimitives';

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

type StatusTone = 'success' | 'warning' | 'destructive' | 'muted';
const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning-strong',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

interface AccountTabProps {
  /** Configuration enregistrée : le nom d'usage affiché vient du profil. */
  config: AppConfig;
}

/** Compte : session (nom, identifiant, déconnexion) et synchronisation, en lignes légères. */
export const AccountTab: React.FC<AccountTabProps> = ({ config }) => {
  const { locale, t } = useLocale();
  const { user, logout } = useAuth();
  const { impact } = useHapticFeedback();
  const { syncStatus, lastSyncAt, syncNow } = useSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const busy = isSyncing || syncStatus === 'syncing';

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
    impact('medium');
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error(t('account.localBackupFailed'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const status: { tone: StatusTone; icon?: React.ComponentType<{ className?: string }> } =
    syncStatus === 'error' ? { tone: 'destructive', icon: TriangleAlert }
      : syncStatus === 'synced' ? { tone: 'success', icon: CircleCheck }
        : syncStatus === 'syncing' ? { tone: 'muted', icon: RefreshCw }
          : syncStatus === 'pending' ? { tone: 'warning', icon: Clock }
            : syncStatus === 'offline' ? { tone: 'muted', icon: CircleAlert }
              : { tone: 'muted' };
  const StatusIcon = status.icon;

  return (
    <SettingsSection title={t('account.title')}>
      {user && (
        <SettingsRow
          label={teacherDisplayName(config.defaultTeacherName, user)}
          hint={(user.email || user.phone) ? <span dir="auto" className="break-all">{user.email || user.phone}</span> : undefined}
        >
          <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={settingsButtonClass}>
            <LogOut className="h-[18px] w-[18px] stroke-[1.5]" />
            <span>{t('account.signOut')}</span>
          </button>
        </SettingsRow>
      )}

      <SettingsRow
        label={
          <span className="flex flex-wrap items-center gap-2">
            {t('account.sync')}
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASS[status.tone])}>
              {StatusIcon && <StatusIcon className={cn('h-3 w-3 stroke-[2]', syncStatus === 'syncing' && 'animate-spin motion-reduce:animate-none')} />}
              {t(`account.status.${syncStatus}`)}
            </span>
          </span>
        }
        hint={lastSyncAt ? t('account.lastSync', { time: timeAgo(lastSyncAt, locale, t('account.unknownDate')) }) : undefined}
      >
        <button type="button" onClick={handleSync} disabled={busy} className={settingsButtonClass}>
          <RefreshCw className={cn('h-[18px] w-[18px] stroke-[1.5]', busy && 'animate-spin motion-reduce:animate-none')} />
          <span>{t('account.syncNow')}</span>
        </button>
      </SettingsRow>
    </SettingsSection>
  );
};

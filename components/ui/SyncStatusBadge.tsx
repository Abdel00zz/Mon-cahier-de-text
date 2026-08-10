import React from 'react';
import { useSync, SyncStatus } from '../../contexts/SyncContext';
import { Button } from './button';
import { useLocale } from '@/i18n/LocaleProvider';

const STATUS_CONFIG: Record<SyncStatus, { labelKey: string; dotClass: string; glowClass: string; pulse?: boolean }> = {
    idle: { labelKey: '', dotClass: '', glowClass: '' },
    synced: { labelKey: 'sync.synced', dotClass: 'bg-success', glowClass: 'shadow-[0_0_0_2px_rgba(16,185,129,0.12),0_0_5px_rgba(16,185,129,0.35)]' },
    syncing: { labelKey: 'sync.syncing', dotClass: 'bg-warning', glowClass: 'shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_0_10px_rgba(245,158,11,0.55)]', pulse: true },
    pending: { labelKey: 'sync.pending', dotClass: 'bg-warning', glowClass: 'shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_0_10px_rgba(245,158,11,0.45)]', pulse: true },
    offline: { labelKey: 'sync.offline', dotClass: 'bg-muted-foreground', glowClass: 'shadow-[0_0_0_3px_rgba(100,116,139,0.12)]' },
    error: { labelKey: 'sync.error', dotClass: 'bg-destructive', glowClass: 'shadow-[0_0_0_3px_rgba(239,68,68,0.12),0_0_10px_rgba(239,68,68,0.5)]' },
};

export const SyncStatusBadge: React.FC = () => {
    const { syncStatus, syncNow } = useSync();
    const { t } = useLocale();
    const config = STATUS_CONFIG[syncStatus];
    if (!config.labelKey) return null;
    const label = t(config.labelKey);

    return (
        <Button
            type="button"
            onClick={syncNow}
            variant="ghost"
            className="group/sync h-6 cursor-pointer flex-row-reverse gap-1 rounded-md bg-transparent px-1 text-muted-foreground/65 shadow-none transition-colors hover:bg-slate-50 hover:text-primary"
            title={t('sync.syncNow')}
            aria-label={t('sync.statusAria', { status: label })}
        >
            <span className="relative -mt-1 flex h-2.5 w-2.5 shrink-0 self-start items-center justify-center" aria-hidden>
                {config.pulse && <span className={`absolute inset-0 rounded-full opacity-45 ${config.dotClass} animate-ping`} />}
                <span className={`relative h-1.5 w-1.5 rounded-full ${config.dotClass} ${config.glowClass}`} />
            </span>
            <span className="max-w-28 truncate font-mono text-[8px] font-bold tracking-[0.035em] opacity-75 sm:max-w-36 sm:text-[9px]" aria-live="polite">{label}</span>
        </Button>
    );
};

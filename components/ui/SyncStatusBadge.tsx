import React from 'react';
import { useSync, SyncStatus } from '../../contexts/SyncContext';
import { Button } from './button';

const STATUS_CONFIG: Record<SyncStatus, { label: string; dotClass: string; glowClass: string; pulse?: boolean }> = {
    idle: { label: '', dotClass: '', glowClass: '' },
    synced: { label: 'Synchronisé', dotClass: 'bg-success', glowClass: 'shadow-[0_0_0_2px_rgba(16,185,129,0.12),0_0_5px_rgba(16,185,129,0.35)]' },
    syncing: { label: 'Synchronisation', dotClass: 'bg-warning', glowClass: 'shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_0_10px_rgba(245,158,11,0.55)]', pulse: true },
    pending: { label: 'Attente', dotClass: 'bg-warning', glowClass: 'shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_0_10px_rgba(245,158,11,0.45)]', pulse: true },
    offline: { label: 'Déconnecté', dotClass: 'bg-muted-foreground', glowClass: 'shadow-[0_0_0_3px_rgba(100,116,139,0.12)]' },
    error: { label: 'Erreur', dotClass: 'bg-destructive', glowClass: 'shadow-[0_0_0_3px_rgba(239,68,68,0.12),0_0_10px_rgba(239,68,68,0.5)]' },
};

export const SyncStatusBadge: React.FC = () => {
    const { syncStatus, syncNow } = useSync();
    const config = STATUS_CONFIG[syncStatus];
    if (!config.label) return null;

    return (
        <Button
            type="button"
            onClick={syncNow}
            variant="ghost"
            className="group/sync h-6 cursor-pointer flex-row-reverse gap-1 rounded-md bg-transparent px-1 text-muted-foreground/65 shadow-none transition-colors hover:bg-slate-50 hover:text-primary"
            title="Cliquer pour synchroniser maintenant"
            aria-label={`État de synchronisation : ${config.label}`}
        >
            <span className="relative -mt-1 flex h-2.5 w-2.5 shrink-0 self-start items-center justify-center" aria-hidden>
                {config.pulse && <span className={`absolute inset-0 rounded-full opacity-45 ${config.dotClass} animate-ping`} />}
                <span className={`relative h-1.5 w-1.5 rounded-full ${config.dotClass} ${config.glowClass}`} />
            </span>
            <span className="max-w-28 truncate font-mono text-[8px] font-bold tracking-[0.035em] opacity-75 sm:max-w-36 sm:text-[9px]" aria-live="polite">{config.label}</span>
        </Button>
    );
};

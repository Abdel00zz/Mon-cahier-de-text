import React from 'react';
import { useSync, SyncStatus } from '../../contexts/SyncContext';
import { Button } from './button';

const STATUS_CONFIG: Record<SyncStatus, { label: string; dotClass: string; glowClass: string; pulse?: boolean }> = {
    idle: { label: '', dotClass: '', glowClass: '' },
    synced: { label: 'Synchronisé', dotClass: 'bg-success', glowClass: 'shadow-[0_0_0_3px_rgba(16,185,129,0.12),0_0_10px_rgba(16,185,129,0.55)]', pulse: true },
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
            className="group/sync h-8 cursor-pointer gap-2 rounded-none bg-transparent px-0 text-foreground shadow-none transition-colors hover:bg-transparent hover:text-primary"
            title="Cliquer pour synchroniser maintenant"
            aria-label={`État de synchronisation : ${config.label}`}
        >
            <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden>
                {config.pulse && <span className={`absolute inset-0 rounded-full opacity-45 ${config.dotClass} animate-ping`} />}
                <span className={`relative h-2 w-2 rounded-full ${config.dotClass} ${config.glowClass}`} />
            </span>
            <span className="max-w-28 truncate font-mono text-[9px] font-extrabold uppercase tracking-[0.065em] sm:max-w-36 sm:text-[10px]" aria-live="polite">{config.label}</span>
        </Button>
    );
};

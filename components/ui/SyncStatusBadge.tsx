import React from 'react';
import { useSync, SyncStatus } from '../../contexts/SyncContext';

const STATUS_CONFIG: Record<SyncStatus, { label: string; dotClass: string; pulse?: boolean }> = {
    idle: { label: '', dotClass: '' },
    synced: { label: 'Synchronisé', dotClass: 'bg-emerald-500' },
    syncing: { label: 'Synchronisation…', dotClass: 'bg-amber-500', pulse: true },
    pending: { label: 'En attente', dotClass: 'bg-amber-400' },
    offline: { label: 'Hors ligne', dotClass: 'bg-slate-400' },
    error: { label: 'Erreur de synchro', dotClass: 'bg-red-500' },
};

export const SyncStatusBadge: React.FC = () => {
    const { syncStatus, syncNow } = useSync();
    const config = STATUS_CONFIG[syncStatus];
    if (!config.label) return null;

    return (
        <button
            type="button"
            onClick={syncNow}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent"
            title="Cliquer pour synchroniser maintenant"
            aria-label={`État de synchronisation : ${config.label}`}
        >
            <span className={`h-2 w-2 rounded-full ${config.dotClass} ${config.pulse ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{config.label}</span>
        </button>
    );
};

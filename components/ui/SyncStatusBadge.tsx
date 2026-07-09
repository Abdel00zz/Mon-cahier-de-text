import React from 'react';
import { useSync, SyncStatus } from '../../contexts/SyncContext';
import { Button } from './button';

const STATUS_CONFIG: Record<SyncStatus, { label: string; dotClass: string; pulse?: boolean }> = {
    idle: { label: '', dotClass: '' },
    synced: { label: 'Synchronisé', dotClass: 'bg-success' },
    syncing: { label: 'Synchronisation…', dotClass: 'bg-warning', pulse: true },
    pending: { label: 'En attente', dotClass: 'bg-warning' },
    offline: { label: 'Hors ligne', dotClass: 'bg-muted-foreground' },
    error: { label: 'Erreur de synchro', dotClass: 'bg-destructive' },
};

export const SyncStatusBadge: React.FC = () => {
    const { syncStatus, syncNow } = useSync();
    const config = STATUS_CONFIG[syncStatus];
    if (!config.label) return null;

    return (
        <Button
            type="button"
            onClick={syncNow}
            variant="outline"
            className="h-8 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent flex items-center gap-1.5 cursor-pointer shadow-sm border border-border"
            title="Cliquer pour synchroniser maintenant"
            aria-label={`État de synchronisation : ${config.label}`}
        >
            <span className={`h-2 w-2 rounded-full ${config.dotClass} ${config.pulse ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{config.label}</span>
        </Button>
    );
};

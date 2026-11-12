import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { syncStatusLabel } from '@/domain/sync/syncStatusLabel';
import { useLocale } from '@/i18n/LocaleProvider';
import './sync-strip.css';

/**
 * Surface de continuité : le travail local reste immédiat, mais l'état cloud
 * est lisible et relançable sans interrompre la saisie.
 */
export const SyncStrip: React.FC = () => {
    const { syncStatus, lastSyncAt } = useSync();
    const progress = useSyncProgress();
    const { t } = useLocale();
    const label = syncStatusLabel({ status: syncStatus, lastSyncAt, progress });
    const text = t(label.key, label.values);

    return (
        <>
            <div className="sync-strip print:hidden" data-state={syncStatus} aria-hidden="true" />
            <span className="sr-only" role="status">{text}</span>
        </>
    );
};

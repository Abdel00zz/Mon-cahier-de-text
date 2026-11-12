import React from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    const { syncStatus, lastSyncAt, syncNow } = useSync();
    const progress = useSyncProgress();
    const { t } = useLocale();
    const visible = syncStatus !== 'idle' && syncStatus !== 'synced';
    const label = syncStatusLabel({ status: syncStatus, lastSyncAt, progress });
    const text = t(label.key, label.values);
    const canRetry = syncStatus === 'error' || syncStatus === 'offline' || syncStatus === 'pending';

    return (
        <>
            <div className="sync-strip" data-state={syncStatus} aria-hidden="true" />
            <div className="sync-status" data-visible={visible ? 'true' : 'false'} data-state={syncStatus} role="status" aria-live="polite">
                <Cloud size={15} aria-hidden="true" />
                <span>{text}</span>
                {canRetry && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="sync-status__action"
                        onClick={() => void syncNow()}
                        aria-label={t('sync.syncNow')}
                    >
                        <RefreshCw aria-hidden="true" />
                    </Button>
                )}
            </div>
        </>
    );
};

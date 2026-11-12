import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSync } from '@/contexts/SyncContext';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { syncStatusLabel } from '@/domain/sync/syncStatusLabel';
import { useLocale } from '@/i18n/LocaleProvider';
import { toast } from 'sonner';
import './editor-sync-fab.css';

export function EditorSyncFab() {
  const { syncStatus, lastSyncAt, syncNow } = useSync();
  const progress = useSyncProgress();
  const { t } = useLocale();
  const label = syncStatusLabel({ status: syncStatus, lastSyncAt, progress });
  const isBusy = syncStatus === 'syncing';
  const needsAttention = syncStatus === 'pending' || syncStatus === 'offline' || syncStatus === 'error';

  const handleSync = async () => {
    try {
      await syncNow();
      window.dispatchEvent(new CustomEvent('companion:sync-alert', { detail: { status: 'synced' } }));
    } catch {
      toast.error(t('sync.status.error'));
      window.dispatchEvent(new CustomEvent('companion:sync-alert', { detail: { status: 'error' } }));
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="editor-sync-fab"
      data-state={syncStatus}
      data-attention={needsAttention ? 'true' : 'false'}
      onClick={() => void handleSync()}
      disabled={isBusy}
      aria-label={t(label.key, label.values)}
      title={t(label.key, label.values)}
    >
      <RefreshCw aria-hidden="true" className={isBusy ? 'editor-sync-fab__spin' : undefined} />
      {needsAttention && <span className="editor-sync-fab__dot" aria-hidden="true" />}
    </Button>
  );
}

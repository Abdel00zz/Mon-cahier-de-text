import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { editorSyncTone } from '@/domain/sync/editorSyncTone';
import './editor-save.css';

export const EditorSaveControl: React.FC<{
    status: 'saved' | 'saving' | 'unsaved';
    onSync?: () => void;
}> = ({ status, onSync }) => {
    const { syncStatus } = useSync();
    const { t } = useLocale();
    const tone = editorSyncTone(status, syncStatus);
    const local = t(status === 'unsaved' ? 'toolbar.localChanges' : `toolbar.${status}`);
    const cloud = syncStatus === 'idle' ? t('toolbar.localOnly') : t(`sync.${syncStatus}`);
    const actionable = !!onSync && status !== 'saving' && (syncStatus === 'pending' || syncStatus === 'error' || (status === 'unsaved' && syncStatus !== 'offline' && syncStatus !== 'syncing'));
    const action = syncStatus === 'error' ? 'toolbar.retrySync' : 'toolbar.syncChanges';
    const caption = actionable ? t(action) : status === 'saving' ? local : cloud;
    const description = [...new Set([caption, local, cloud])].join('. ');
    return (
        <button type="button" disabled={!actionable} onClick={onSync} className="editor-sync-status" data-save-state={status} data-cloud-state={syncStatus}
            data-sync-tone={tone} aria-live="polite" aria-atomic="true"
            title={description} aria-label={description}>
            <span className="editor-sync-label" aria-hidden="true">{caption}</span>
            <span className="editor-sync-dot" aria-hidden="true" />
        </button>
    );
};

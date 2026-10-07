import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { editorSyncTone } from '@/domain/sync/editorSyncTone';
import './editor-save.css';

export const EditorSaveControl: React.FC<{
    status: 'saved' | 'saving' | 'unsaved';
}> = ({ status }) => {
    const { syncStatus } = useSync();
    const { t } = useLocale();
    const tone = editorSyncTone(status, syncStatus);
    const local = t(status === 'unsaved' ? 'toolbar.localChanges' : `toolbar.${status}`);
    const cloud = syncStatus === 'idle' ? t('toolbar.localOnly') : t(`sync.${syncStatus}`);
    const description = `${local}. ${cloud}`;
    return (
        <span className="editor-sync-status" data-save-state={status} data-cloud-state={syncStatus}
            data-sync-tone={tone} role="status" aria-live="polite" aria-atomic="true"
            title={description} aria-label={description}>
            <span className="editor-sync-dot" aria-hidden="true" />
            <span className="editor-sync-label" aria-hidden="true">{cloud}</span>
        </span>
    );
};

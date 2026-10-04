import React from 'react';
import { Check, Loader2, Save } from '@/components/ui/icons';
import { useSync } from '@/contexts/SyncContext';
import { useLocale } from '@/i18n/LocaleProvider';
import './editor-save.css';

export const EditorSaveControl: React.FC<{
    status: 'saved' | 'saving' | 'unsaved';
    onSave: () => void;
}> = ({ status, onSave }) => {
    const { syncStatus } = useSync();
    const { t } = useLocale();
    const label = t(status === 'unsaved' ? 'toolbar.save' : `toolbar.${status}`);
    // A cloud acknowledgement describes the last persisted version, never an unsaved edit.
    const detail = status !== 'saved' ? t('toolbar.localChanges')
        : syncStatus === 'idle' ? t('toolbar.localOnly') : t(`sync.${syncStatus}`);
    const Icon = status === 'saving' ? Loader2 : status === 'saved' ? Check : Save;
    return (
        <button type="button" onClick={onSave} disabled={status === 'saving'}
            data-save-state={status} data-cloud-state={syncStatus}
            className="editor-save-control" title={t('toolbar.manualSave')}
            aria-label={`${t('toolbar.saveNow')} — ${label}. ${detail}`}
            aria-busy={status === 'saving'}>
            <span className="editor-save-surface" aria-hidden="true">
                <Icon className={status === 'saving' ? 'editor-save-spinner' : undefined} size={21} />
            </span>
            <span className="editor-save-copy" role="status" aria-live="polite" aria-atomic="true">
                <span className="editor-save-label">{label}</span>
                <span className="editor-save-detail">{detail}</span>
            </span>
        </button>
    );
};

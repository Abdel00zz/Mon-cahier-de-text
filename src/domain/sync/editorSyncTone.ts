/** Local persistence alone cannot confirm that the cloud has received an edit. */
export const editorSyncTone = (
  save: 'saved' | 'saving' | 'unsaved',
  cloud: 'idle' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error',
): 'red' | 'green' | 'orange' => cloud === 'error' ? 'red'
  : save === 'saved' && cloud === 'synced' ? 'green' : 'orange';

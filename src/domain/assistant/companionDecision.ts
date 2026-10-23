import type { AdminMessage } from '../../types';
import type { ClassGuidance } from './classGuidance';
import { pendingAdminMessages } from '../messages/conversation';

interface CompanionSignals {
  guidance: ClassGuidance;
  authenticated: boolean;
  online: boolean;
  syncStatus: 'idle' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error';
  transfer: 'idle' | 'pulling' | 'ready' | 'notebooks' | 'failed';
  inboxLoaded: boolean;
  inboxFailed: boolean;
  messages: readonly AdminMessage[];
  hasNotebookReader: boolean;
  hasContentSuggestion?: boolean;
}

export type CompanionDecision =
  | { kind: 'reply'; reply: AdminMessage }
  | { kind: 'guidance' | 'offer' | 'sync-error' | 'offline' | 'syncing' | 'checking' | 'inbox-error' };

/** One deterministic arbitration point. Unknown or failed checks never become a success offer. */
export function decideCompanion(signals: CompanionSignals): CompanionDecision {
  const { guidance, authenticated, syncStatus, transfer } = signals;
  if (authenticated && signals.online && (syncStatus === 'error' || transfer === 'failed')) return { kind: 'sync-error' };
  if (authenticated && signals.online && signals.inboxFailed) return { kind: 'inbox-error' };
  // With no service failure to recover, a real lesson remains actionable offline.
  if (guidance.step === 'active-session') return { kind: 'guidance' };
  if (authenticated && !signals.online && (syncStatus !== 'synced' || transfer === 'failed')) return { kind: 'offline' };
  if (authenticated && (transfer === 'pulling' || transfer === 'notebooks')) return { kind: 'syncing' };

  const reply = pendingAdminMessages(signals.messages)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
  if (authenticated && reply) return { kind: 'reply', reply };
  const canSuggestContent = signals.hasNotebookReader && signals.hasContentSuggestion
    && guidance.step === 'ready';
  if (!canSuggestContent && guidance.step !== 'ready') return { kind: 'guidance' };
  if (authenticated) {
    if (!signals.online || syncStatus === 'offline') return { kind: 'offline' };
    if (syncStatus === 'pending' || syncStatus === 'syncing') return { kind: 'syncing' };
    if (!signals.inboxLoaded || syncStatus === 'idle') return { kind: 'checking' };
  }
  return { kind: canSuggestContent && signals.online ? 'offer' : 'guidance' };
}

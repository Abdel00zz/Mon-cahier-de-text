import assert from 'node:assert/strict';
import test from 'node:test';
import { decideCompanion, resolveNotificationPrompt } from '../src/domain/assistant/companionDecision';
import type { AdminMessage } from '../src/types';

const signals: Parameters<typeof decideCompanion>[0] = {
  guidance: { step: 'ready', classId: 'a', className: 'Classe A' },
  authenticated: true, online: true, syncStatus: 'synced', transfer: 'ready',
  inboxLoaded: true, inboxFailed: false, messages: [], hasNotebookReader: true, hasContentSuggestion: true,
};
const reply: AdminMessage = { id: 'admin-first', sender: 'admin', title: 'Réponse', body: 'Bonjour',
  createdAt: '2026-10-20T12:00:00Z', replyTo: 'teacher-question' };

test('an active lesson remains actionable offline with incoming replies', () => {
  assert.equal(decideCompanion({ ...signals, online: false, syncStatus: 'offline', transfer: 'ready',
    messages: [reply], guidance: { step: 'active-session', classId: 'a', className: 'A' } }).kind, 'guidance');
});

test('unknown, pending and failed services never produce a personalization offer', () => {
  for (const [patch, expected] of [
    [{ syncStatus: 'error' }, 'sync-error'], [{ transfer: 'failed' }, 'sync-error'],
    [{ online: false }, 'offline'], [{ syncStatus: 'offline' }, 'offline'],
    [{ syncStatus: 'pending' }, 'syncing'], [{ syncStatus: 'syncing' }, 'syncing'], [{ syncStatus: 'idle' }, 'checking'],
    [{ transfer: 'notebooks' }, 'syncing'], [{ inboxLoaded: false }, 'checking'],
    [{ inboxFailed: true }, 'inbox-error'], [{ hasNotebookReader: false }, 'guidance'], [{ hasContentSuggestion: false }, 'guidance'],
  ] as const) assert.equal(decideCompanion({ ...signals, ...patch }).kind, expected);
  assert.equal(decideCompanion(signals).kind, 'offer');
});

test('loading the class list is not interpreted as a request to create the first class', () => {
  assert.equal(decideCompanion({ ...signals, transfer: 'pulling', guidance: { step: 'create' } }).kind, 'syncing');
  assert.equal(decideCompanion({ ...signals, guidance: { step: 'create' } }).kind, 'guidance');
});

test('oldest unread team reply is actionable; events and answered messages do not impersonate replies', () => {
  const messages: AdminMessage[] = [
    { ...reply, id: 'admin-new', createdAt: '2026-10-21T12:00:00Z' },
    { ...reply, id: 'teacher-contact', sender: 'teacher', event: 'whatsapp-contact' },
    { ...reply, id: 'admin-read', acknowledgedAt: '2026-10-21T12:00:00Z', createdAt: '2026-10-19T12:00:00Z' }, reply,
  ];
  const before = JSON.stringify(messages);
  const result = decideCompanion({ ...signals, messages });
  assert.equal(result.kind, 'reply');
  assert.equal(result.kind === 'reply' && result.reply.id, reply.id);
  assert.equal(JSON.stringify(messages), before, 'selection never mutates the shared inbox');
  assert.equal(decideCompanion({ ...signals, messages: messages.map(item => ({ ...item, acknowledgedAt: '2026-10-22T12:00:00Z' })) }).kind, 'offer');
});

test('local guests ignore stale authenticated cloud failures and replies', () => {
  const local = { ...signals, authenticated: false, syncStatus: 'error' as const, transfer: 'failed' as const, messages: [reply] };
  assert.equal(decideCompanion({ ...local, guidance: { step: 'create' } }).kind, 'guidance');
  assert.equal(decideCompanion(local).kind, 'offer');
});


test('service recovery takes priority over the current lesson when an online failure is confirmed', () => {
  const active = { ...signals, guidance: { step: 'active-session' as const, classId: 'a', className: 'A' } };
  assert.equal(decideCompanion({ ...active, syncStatus: 'error' }).kind, 'sync-error');
  assert.equal(decideCompanion({ ...active, inboxFailed: true }).kind, 'inbox-error');
});

test('an unread message initiated by the team is not lost just because it has no replyTo', () => {
  const notice: AdminMessage = { id: 'admin-notice', title: 'Contenu disponible', body: 'Votre contenu est disponible.', createdAt: '2026-10-22T10:00:00Z' };
  const decision = decideCompanion({ ...signals, messages: [notice] });
  assert.equal(decision.kind, 'reply');
  assert.equal(decision.kind === 'reply' && decision.reply.id, notice.id);
  assert.equal(decideCompanion({ ...signals, messages: [{ ...notice, acknowledgedAt: notice.createdAt }] }).kind, 'offer');
});

test('notification activation prompt comes strictly after PWA install and follows targeted device/config rules', () => {
  assert.equal(
    decideCompanion({ ...signals, pwaInstallRequired: true, notificationPrompt: 'activate' }).kind,
    'install-app',
  );
  assert.deepEqual(
    decideCompanion({ ...signals, pwaInstallRequired: false, notificationPrompt: 'activate' }),
    { kind: 'enable-notifications', mode: 'activate' },
  );
  assert.deepEqual(
    decideCompanion({ ...signals, pwaInstallRequired: false, notificationPrompt: 'settings' }),
    { kind: 'enable-notifications', mode: 'settings' },
  );

  assert.equal(
    resolveNotificationPrompt({
      supported: true,
      pwaInstallRequired: true,
      permission: 'default',
      notificationSettings: { enabled: true, pushEnabled: false },
    }),
    undefined,
    'never ask for notifications while PWA install is still pending',
  );
  assert.equal(
    resolveNotificationPrompt({
      supported: false,
      pwaInstallRequired: false,
      permission: 'default',
      notificationSettings: { enabled: true, pushEnabled: false },
    }),
    undefined,
  );
  assert.equal(
    resolveNotificationPrompt({
      supported: true,
      checking: true,
      pwaInstallRequired: false,
      permission: 'default',
      notificationSettings: { enabled: true, pushEnabled: false },
    }),
    undefined,
  );
  assert.equal(
    resolveNotificationPrompt({
      supported: true,
      pwaInstallRequired: false,
      permission: 'default',
      notificationSettings: { enabled: true, pushEnabled: false },
    }),
    'activate',
  );
  assert.equal(
    resolveNotificationPrompt({
      supported: true,
      pwaInstallRequired: false,
      permission: 'granted',
      notificationSettings: { enabled: true, pushEnabled: false },
    }),
    'activate',
  );
  assert.equal(
    resolveNotificationPrompt({
      supported: true,
      pwaInstallRequired: false,
      permission: 'denied',
      notificationSettings: { enabled: true, pushEnabled: false },
    }),
    'settings',
  );
  assert.equal(
    resolveNotificationPrompt({
      supported: true,
      pwaInstallRequired: false,
      permission: 'granted',
      delivery: 'local',
      subscribed: true,
      notificationSettings: { enabled: true, pushEnabled: true },
    }),
    undefined,
    'silent once native notifications and preferences are active',
  );
});

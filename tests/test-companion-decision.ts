import assert from 'node:assert/strict';
import test from 'node:test';
import { decideCompanion } from '../src/domain/assistant/companionDecision';
import type { AdminMessage } from '../src/types';

const signals: Parameters<typeof decideCompanion>[0] = {
  guidance: { step: 'ready', classId: 'a', className: 'Classe A' },
  authenticated: true, online: true, syncStatus: 'synced', transfer: 'ready',
  inboxLoaded: true, inboxFailed: false, messages: [], hasNotebookReader: true,
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
    [{ inboxFailed: true }, 'inbox-error'], [{ hasNotebookReader: false }, 'guidance'],
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

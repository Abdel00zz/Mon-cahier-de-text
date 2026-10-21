import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseTeacherRequest } from '../api/_lib/teacherMessages';
import { appendConversationMessage } from '../api/_lib/adminMessages';
import { pendingAdminMessages, pendingTeacherRequests, conversationSignature } from '../src/domain/messages/conversation';
import { buildSupportWhatsAppUrl } from '../src/constants/support';
import { AdminConversation } from '../src/admin/components/AdminConversation';
import type { AdminMessage } from '../src/types';

const request: AdminMessage = { id: 'teacher-10000000-0000-4000-8000-000000000001', sender: 'teacher', requestKind: 'custom-content', title: 'Cours', body: 'Les ondes', createdAt: '2026-10-21T10:00:00Z' };
const reply: AdminMessage = { id: 'admin-12345678', title: 'Réponse', body: 'Quel chapitre ?', createdAt: '2026-10-21T11:00:00Z', replyTo: request.id };

test('conversation distinguishes teacher requests, legacy admin messages and read/answered state', () => {
    const messages = [reply, request];
    assert.deepEqual(pendingAdminMessages(messages), [reply]);
    assert.deepEqual(pendingTeacherRequests(messages), [request]);
    const completed = [{ ...reply, acknowledgedAt: reply.createdAt }, { ...request, answeredAt: reply.createdAt }];
    assert.equal(pendingAdminMessages(completed).length, 0);
    assert.equal(pendingTeacherRequests(completed).length, 0);
    assert.notEqual(conversationSignature(messages), conversationSignature(completed));
});

test('bounded history retains all unanswered requests and unread admin messages', () => {
    const history = Array.from({ length: 60 }, (_, i) => ({ ...request, id: `request-${i}` }));
    assert.throws(() => appendConversationMessage(history, reply), /pleine/);
    history[40] = { ...history[40], answeredAt: reply.createdAt };
    const next = appendConversationMessage(history, reply);
    assert.equal(next.length, 60);
    assert.equal(next[0].id, reply.id);
    assert.equal(next.some(item => item.id === 'request-40'), false);
    assert.equal(history.length, 60, 'no input mutation');
});

test('request validation strips client identity and privileged fields, rejects empty, overlong and forged references', () => {
    const draft = { requestId: request.id, kind: 'custom-content', body: '  مرحباً  ', phone: 'victim', sender: 'admin', answeredAt: 'fake' };
    assert.deepEqual(parseTeacherRequest(draft), { requestId: request.id, kind: 'custom-content', body: 'مرحباً' });
    for (const invalid of [null, { ...draft, body: ' ' }, { ...draft, body: 'x'.repeat(1201) }, { ...draft, requestId: 'admin-12345678' }, { ...draft, kind: 'privileged' }, { ...draft, classId: {} }, { ...draft, replyTo: request.id }]) {
        assert.throws(() => parseTeacherRequest(invalid));
    }
});

test('WhatsApp carries only explicitly supplied display context with safe URL encoding', () => {
    for (const locale of ['fr', 'ar', 'en'] as const) {
        const url = new URL(buildSupportWhatsAppUrl(locale, { teacherName: 'أمينة & Sami', className: '1AC & 2', requestId: request.id }));
        assert.equal(url.origin, 'https://wa.me');
        assert.equal([...url.searchParams.keys()].length, 1);
        assert.ok(url.searchParams.get('text')?.includes('أمينة & Sami'));
        assert.ok(url.searchParams.get('text')?.includes(request.id));
    }
});

test('admin conversation renders bilingual user content as text and exposes a reply action', () => {
    const html = renderToStaticMarkup(createElement(AdminConversation, { messages: [{ ...request, body: '<script>bad()</script> محتوى' }], onReply: () => {} }));
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /Répondre/);
    assert.match(html, /À traiter/);
});

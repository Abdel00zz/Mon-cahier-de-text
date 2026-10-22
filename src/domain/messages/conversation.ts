import type { AdminMessage } from '../../types';

export const pendingAdminMessages = (messages: readonly AdminMessage[]) =>
  messages.filter(message => message.sender !== 'teacher' && !message.acknowledgedAt);
export const pendingTeacherRequests = (messages: readonly AdminMessage[]) =>
  messages.filter(message => message.sender === 'teacher' && !message.event && !message.answeredAt);

/** Includes reply state so another device observes answers and acknowledgements. */
export const conversationSignature = (messages: readonly AdminMessage[]): string =>
  messages.map(message => `${message.id}:${message.acknowledgedAt ?? ''}:${message.answeredAt ?? ''}`).join('|');

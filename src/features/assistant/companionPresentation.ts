import type { AppLocale } from '../../types';
import type { CompanionBrainSnapshot } from '../../domain/assistant/companionBrain';
import { classGuidanceMessage, companionInstallAppMessage, type CompanionMessage } from './companionCopy';
import { companionServiceMessage } from './companionServiceCopy';
import { contentSuggestionMessage } from './contentSuggestionCopy';
import { companionCalendarMessage } from './companionCalendarCopy';
import { companionClassName } from './companionClassName';
import { conversationCopy } from '../messages/conversationCopy';

/** Text is a projection of the chosen decision; presentation does not choose another class or action. */
export function companionMessage(snapshot: CompanionBrainSnapshot, locale: AppLocale, today: string, recovering: boolean): CompanionMessage {
  const { decision } = snapshot;
  if (decision.kind === 'install-app') return companionInstallAppMessage(locale);
  if (decision.kind === 'calendar') return companionCalendarMessage(decision.notice, locale, snapshot.target?.name);
  let message: CompanionMessage;
  if (decision.kind === 'guidance') message = classGuidanceMessage(snapshot.guidance, locale, { askReadyContent: snapshot.canContactTeam });
  else if (decision.kind === 'offer' && snapshot.contentSuggestion) message = contentSuggestionMessage(snapshot.contentSuggestion, locale, today);
  else if (decision.kind === 'reply') {
    const reply = decision.reply;
    const name = reply.className && companionClassName(reply.className, locale);
    const copy = conversationCopy(locale);
    message = { id: reply.id, title: reply.replyTo ? copy.reply : locale === 'ar' ? 'رسالة من الفريق' : locale === 'en' ? 'A message from the team' : 'Un message de l’équipe',
      detail: `${name ? `${name} : ` : ''}${reply.body.length > 150 ? `${reply.body.slice(0, 147)}…` : reply.body}`,
      detailEmphasis: name, action: copy.read };
  } else if (decision.kind !== 'offer') message = companionServiceMessage(decision.kind, locale, recovering);
  else message = classGuidanceMessage(snapshot.guidance, locale, { askReadyContent: snapshot.canContactTeam });
  return message;
}

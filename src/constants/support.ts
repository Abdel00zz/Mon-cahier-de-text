/**
 * Contact du service de création de cahiers de textes.
 *
 * Le numéro est stocké en chiffres internationaux SANS « + » : c'est le format
 * attendu par le lien wa.me (ex. « 212674680119 » pour +212 674 680 119).
 * Le laisser vide masque entièrement la section WhatsApp de l'interface.
 * C'est le SEUL endroit à modifier pour changer le contact du service.
 */
const SUPPORT_WHATSAPP_NUMBER = '212674680119';

type SupportLocale = 'fr' | 'ar' | 'en';
export interface SupportContext {
  teacherName?: string;
  className?: string;
  requestId?: string;
  intent?: 'create' | 'adapt' | 'enrich';
}

const REQUEST_MESSAGE = {
  fr: { create: 'Bonjour, je souhaite un contenu personnalisé pour ma classe.', adapt: 'Bonjour, je souhaite adapter le contenu prédéfini à ma progression.', enrich: 'Bonjour, je souhaite enrichir le contenu de ma classe avec votre aide.' },
  ar: { create: 'السلام عليكم، أرغب في إعداد محتوى مخصّص لقسمي.', adapt: 'السلام عليكم، أرغب في تكييف المحتوى الجاهز مع تدرّجي في التدريس.', enrich: 'السلام عليكم، أرغب في إثراء محتوى قسمي بمساعدتكم.' },
  en: { create: 'Hello, I would like tailored content for my class.', adapt: 'Hello, I would like to adapt the predefined content to my progression.', enrich: 'Hello, I would like help enriching the content for my class.' },
} as const;

/** Message d'accroche prérempli, adapté à la langue de l'interface. */
const PREFILLED_MESSAGE: Record<SupportLocale, string> = {
  fr: 'Bonjour, je souhaite créer mes cahiers de textes avec votre aide.',
  ar: 'السلام عليكم، أرغب في إعداد دفاتر النصوص بمساعدتكم.',
  en: 'Hello, I would like help creating my lesson notebooks.',
};

/** Vrai si un numéro exploitable est renseigné (8 à 15 chiffres). */
export const hasSupportWhatsApp = (): boolean => /^\d{8,15}$/.test(SUPPORT_WHATSAPP_NUMBER);

/** Lien wa.me avec message d'accroche localisé. */
export const buildSupportWhatsAppUrl = (locale: SupportLocale = 'fr', context?: SupportContext): string => {
  const clean = (value?: string) => value?.replace(/[\r\n\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, ' ').trim().slice(0, 140);
  const labels = locale === 'ar' ? ['الاسم', 'القسم', 'الطلب'] : locale === 'en' ? ['Name', 'Class', 'Request'] : ['Nom', 'Classe', 'Demande'];
  const details = [context?.teacherName, context?.className, context?.requestId].map((value, index) => clean(value) ? `${labels[index]} : ${clean(value)}` : '').filter(Boolean);
  const opening = context?.intent ? REQUEST_MESSAGE[locale][context.intent] : PREFILLED_MESSAGE[locale];
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent([opening, ...details].join('\n'))}`;
};

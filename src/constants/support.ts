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

/** Message d'accroche prérempli, adapté à la langue de l'interface. */
const PREFILLED_MESSAGE: Record<SupportLocale, string> = {
  fr: 'Bonjour, je souhaite créer mes cahiers de textes avec votre aide.',
  ar: 'السلام عليكم، أرغب في إعداد دفاتر النصوص بمساعدتكم.',
  en: 'Hello, I would like help creating my lesson notebooks.',
};

/** Vrai si un numéro exploitable est renseigné (8 à 15 chiffres). */
export const hasSupportWhatsApp = (): boolean => /^\d{8,15}$/.test(SUPPORT_WHATSAPP_NUMBER);

/** Lien wa.me avec message d'accroche localisé. */
export const buildSupportWhatsAppUrl = (locale: SupportLocale = 'fr'): string =>
  `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_MESSAGE[locale] ?? PREFILLED_MESSAGE.fr)}`;

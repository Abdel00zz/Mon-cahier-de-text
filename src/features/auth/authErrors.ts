/** Provider codes are localized without exposing internal Firebase diagnostics. */
const MESSAGES: Record<string, readonly [string, string]> = {
  GOOGLE_TIMEOUT: ['Google n’a pas répondu. Fermez le sélecteur de compte puis réessayez.', 'لم يستجب Google. أغلق نافذة اختيار الحساب ثم أعد المحاولة.'],
  AUTH_NETWORK_TIMEOUT: ['Le serveur de connexion ne répond pas. Vérifiez Internet puis réessayez.', 'خادم تسجيل الدخول لا يستجيب. تحقق من الإنترنت ثم أعد المحاولة.'],
  INVALID_CREDENTIALS: ['Vérifiez votre e-mail et votre mot de passe.', 'تحقق من بريدك الإلكتروني وكلمة المرور.'],
  ACCOUNT_EXISTS: ['Ce compte existe déjà. Connectez-vous ou réinitialisez votre mot de passe.', 'هذا الحساب موجود. سجّل الدخول أو أعد تعيين كلمة المرور.'],
  ACCOUNT_BLOCKED: ['Accès suspendu. Contactez votre établissement.', 'تم إيقاف الولوج. تواصل مع إدارتك.'],
  PROVIDER_GOOGLE: ['Ce compte se connecte avec Google. Continuez avec Google.', 'هذا الحساب يُسجّل الدخول عبر Google. تابع باستعمال Google.'],
  TOO_MANY_ATTEMPTS: ['Réessayez dans quelques minutes.', 'أعد المحاولة بعد بضع دقائق.'],
  'auth/popup-blocked': ['Autorisez la fenêtre Google, puis réessayez.', 'اسمح بنافذة Google ثم أعد المحاولة.'],
  'auth/account-exists-with-different-credential': ['Connectez-vous avec votre méthode habituelle pour retrouver ce compte.', 'استعمل طريقة تسجيل دخولك المعتادة لهذا الحساب.'],
  'auth/unauthorized-domain': ['Connexion Google en cours de configuration. Utilisez votre e-mail.', 'جارٍ إعداد Google. استعمل بريدك الإلكتروني.'],
  GOOGLE_NOT_CONFIGURED: ['Connexion Google indisponible sur cette version de l’application. Utilisez votre e-mail.', 'تسجيل Google غير متاح في هذه النسخة من التطبيق. استعمل بريدك الإلكتروني.'],
  GOOGLE_UNAVAILABLE: ['Ajoutez un compte Google dans les réglages du téléphone ou utilisez votre e-mail.', 'أضف حساب Google من إعدادات الهاتف أو استعمل بريدك الإلكتروني.'],
  GOOGLE_REAUTH_REQUIRED: ['Sélectionnez à nouveau votre compte Google.', 'اختر حساب Google من جديد.'],
};

/** Texte générique : jamais le message brut du navigateur (« Failed to fetch »…). */
const GENERIC: readonly [string, string] = [
  'Connexion impossible. Vérifiez Internet puis réessayez.',
  'تعذّر الاتصال. تحقق من اتصال الإنترنت ثم أعد المحاولة.',
];

const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'AUTH_CANCELLED']);

export function authErrorMessage(error: unknown, locale: 'fr' | 'ar'): string | null {
  const index = locale === 'ar' ? 1 : 0;
  const rawCode = (error as { code?: unknown } | null)?.code;
  // Les DOMException (AbortSignal.timeout, annulations natives) exposent un code
  // numérique : seuls les codes textuels sont interprétables.
  const code = typeof rawCode === 'string' ? rawCode : undefined;
  if (code && CANCELLED_CODES.has(code)) return null;
  if (code && MESSAGES[code]) return MESSAGES[code][index];
  return GENERIC[index];
}

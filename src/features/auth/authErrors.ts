/** Provider codes are localized without exposing internal Firebase diagnostics. */
export function authErrorMessage(error: unknown, locale: 'fr' | 'ar'): string | null {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'AUTH_CANCELLED') return null;
  const messages: Record<string, readonly [string, string]> = {
    INVALID_CREDENTIALS: ['Vérifiez votre e-mail et votre mot de passe.', 'تحقق من بريدك الإلكتروني وكلمة المرور.'],
    ACCOUNT_EXISTS: ['Ce compte existe déjà. Connectez-vous ou réinitialisez votre mot de passe.', 'هذا الحساب موجود. سجّل الدخول أو أعد تعيين كلمة المرور.'],
    ACCOUNT_BLOCKED: ['Accès suspendu. Contactez votre établissement.', 'تم إيقاف الولوج. تواصل مع إدارتك.'],
    TOO_MANY_ATTEMPTS: ['Réessayez dans quelques minutes.', 'أعد المحاولة بعد بضع دقائق.'],
    'auth/popup-blocked': ['Autorisez la fenêtre Google, puis réessayez.', 'اسمح بنافذة Google ثم أعد المحاولة.'],
    'auth/account-exists-with-different-credential': ['Connectez-vous avec votre méthode habituelle pour retrouver ce compte.', 'استعمل طريقة تسجيل دخولك المعتادة لهذا الحساب.'],
    'auth/unauthorized-domain': ['Connexion Google en cours de configuration. Utilisez votre e-mail.', 'جارٍ إعداد Google. استعمل بريدك الإلكتروني.'],
    GOOGLE_NOT_CONFIGURED: ['Google Android doit être configuré. Utilisez votre e-mail.', 'يلزم إعداد Google على أندرويد. استعمل بريدك الإلكتروني.'],
    GOOGLE_UNAVAILABLE: ['Ajoutez un compte Google dans les réglages du téléphone ou utilisez votre e-mail.', 'أضف حساب Google من إعدادات الهاتف أو استعمل بريدك الإلكتروني.'],
    GOOGLE_REAUTH_REQUIRED: ['Sélectionnez à nouveau votre compte Google.', 'اختر حساب Google من جديد.'],
  };
  if (code && messages[code]) return messages[code][locale === 'ar' ? 1 : 0];
  return locale === 'fr' && error instanceof Error && !code?.startsWith('auth/') ? error.message :
    locale === 'ar' ? 'تعذّر الاتصال. تحقق من اتصال الإنترنت ثم أعد المحاولة.' : 'Connexion impossible. Vérifiez Internet puis réessayez.';
}

/** Le compte initialise seulement un champ encore absent.
 * Une chaîne vide représente un effacement explicite et doit être conservée.
 * L'identifiant propriétaire du compte ne sert jamais de numéro de contact. */
export function accountPhoneForEmptyProfile(profilePhone: unknown, accountPhone: unknown): string | undefined {
  if (typeof profilePhone === 'string' || typeof accountPhone !== 'string') return undefined;
  const phone = accountPhone.trim();
  if (phone.length > 64) return undefined;
  if (!/^\+?[\d\s().-]+$/.test(phone)) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? phone : undefined;
}

/** Migration après le premier pull : publier uniquement un contact encore absent du cloud. */
export const needsProfilePhoneSync = (localPhone: unknown, remotePhone: unknown): boolean =>
  typeof localPhone === 'string' && remotePhone === undefined;

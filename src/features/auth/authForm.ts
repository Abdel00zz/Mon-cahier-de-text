/** Local, international and Arabic-digit input, normalized to a local number. */
const phoneDigits = (raw: string): string => {
  let digits = raw.replace(/[٠-٩۰-۹]/g, char => String(char.charCodeAt(0) - (char <= '٩' ? 0x660 : 0x6f0))).replace(/\D/g, '');
  if (digits.startsWith('00212')) digits = `0${digits.slice(5)}`;
  else if (digits.startsWith('212')) digits = `0${digits.slice(3)}`;
  return digits;
};
export const formatMoroccanPhone = (raw: string): string => phoneDigits(raw).slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
export const isCompleteMoroccanPhone = (raw: string): boolean => /^0[567]\d{8}$/.test(phoneDigits(raw));

/** Validation légère côté client ; la politique définitive reste côté serveur. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TRIVIAL_SEGMENTS = [
  'password', 'passw0rd', 'motdepasse', 'mot2passe', '123456', '654321',
  'qwerty', 'azerty', 'iloveyou', 'admin', 'salam',
];
const TRIVIAL_SEQUENCE = /(?:012|123|234|345|456|567|678|789|abcd|bcde|cdef|qwer|wert|azer|zert|erty|sdfg){2,}/;

/**
 * Indicative only; never replaces the server's password policy.
 * Les motifs triviaux (chiffres seuls, répétitions, suites, mots courants)
 * restent à « Faible » quelle que soit leur longueur.
 */
export const passwordScore = (password: string): number => {
  if (!password) return 0;
  if (password.length < 8) return 1;
  const lowered = password.toLowerCase();
  const digitsOnly = /^\p{N}+$/u.test(password);
  const repeated = /^(.)\1+$/u.test(password);
  const trivial = TRIVIAL_SEGMENTS.some((segment) => lowered.includes(segment));
  if (digitsOnly || repeated || trivial || TRIVIAL_SEQUENCE.test(lowered)) return 1;
  let score = 2;
  if (password.length >= 12) score++;
  const hasLetter = /\p{L}/u.test(password);
  const hasNumber = /\p{N}/u.test(password);
  const hasSpecial = /[^\p{L}\p{N}\s]/u.test(password);
  if (hasLetter && hasNumber && hasSpecial) score++;
  return Math.min(score, 4);
};

/** Local, international and Arabic-digit input, normalized to a local number. */
export const phoneDigits = (raw: string): string => {
  let digits = raw.replace(/[٠-٩۰-۹]/g, char => String(char.charCodeAt(0) - (char <= '٩' ? 0x660 : 0x6f0))).replace(/\D/g, '');
  if (digits.startsWith('00212')) digits = `0${digits.slice(5)}`;
  else if (digits.startsWith('212')) digits = `0${digits.slice(3)}`;
  return digits;
};
export const formatMoroccanPhone = (raw: string): string => phoneDigits(raw).slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
export const isCompleteMoroccanPhone = (raw: string): boolean => /^0[567]\d{8}$/.test(phoneDigits(raw));

/** Indicative only; never replaces the server's password policy. */
export const passwordScore = (password: string): number => {
  if (!password) return 0;
  if (password.length < 8) return 1;
  let score = 2;
  if (password.length >= 12) score++;
  if (/\p{L}/u.test(password) && /\p{N}/u.test(password) && /[^\p{L}\p{N}\s]/u.test(password)) score++;
  return score;
};

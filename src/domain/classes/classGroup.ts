/** Convertit les chiffres arabes et persans vers leur forme ASCII. */
const toAsciiDigits = (value: string): string => value.replace(/[٠-٩۰-۹]/g, digit => {
  const codePoint = digit.charCodeAt(0);
  const zeroCodePoint = codePoint >= 0x06F0 ? 0x06F0 : 0x0660;
  return String(codePoint - zeroCodePoint);
});

/** Normalise une saisie de groupe pour la conserver sous forme de numéro. */
export const sanitizeGroupNumberInput = (value: string): string =>
  toAsciiDigits(value).replace(/\D/g, '').slice(0, 2);

/** Un groupe est un entier de 1 à 99 ; les zéros initiaux sont ignorés. */
export const normalizeGroupNumber = (value: string): string | null => {
  const compact = toAsciiDigits(value.trim());
  if (!/^\d{1,2}$/.test(compact)) return null;

  const number = Number(compact);
  return number >= 1 && number <= 99 ? String(number) : null;
};

export const classNameForLevelAndGroup = (level: string, group: string): string =>
  `${level.trim()} ${group}`.trim();

const normalizeLevel = (value: string): string =>
  toAsciiDigits(value.trim()).toLocaleLowerCase('fr').replace(/\s+/g, ' ');

const escapeForRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Compare un niveau et un numéro, même si une ancienne classe a été saisie
 * sans espace ou avec un zéro initial (ex. « 1AC01 » / « 1AC 1 »).
 */
export const isSameClassGroup = (className: string, level: string, group: string): boolean => {
  const normalizedGroup = normalizeGroupNumber(group);
  if (!normalizedGroup || !level.trim()) return false;

  const levelPattern = escapeForRegex(normalizeLevel(level)).replace(/\s+/g, '\\s*');
  const pattern = new RegExp(`^${levelPattern}\\s*0*${normalizedGroup}$`, 'iu');
  return pattern.test(normalizeLevel(className));
};

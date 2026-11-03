/** Shared by the guide and workspace search; importing it does not load the guide chapters. */
export const normalizeGuideSearch = (text: string): string => text.normalize('NFD')
  .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ـ/g, '').toLowerCase();

/** Android accepts hex colors; the browser resolves the actual surface to RGB. */
export function rgbToHex(value: string): string | null {
  const match = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*1(?:\.0+)?)?\s*\)$/.exec(value);
  if (!match) return null;
  const channels = match.slice(1).map(Number);
  if (channels.some(channel => channel < 0 || channel > 255)) return null;
  return `#${channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function readThemeBackground(): string {
  return rgbToHex(getComputedStyle(document.body).backgroundColor)
    ?? (document.documentElement.classList.contains('dark') ? '#262625' : '#faf9f5');
}

type ClassValue = string | number | null | false | undefined | ClassDictionary | ClassArray;
interface ClassDictionary { [id: string]: boolean | null | undefined; }
interface ClassArray extends Array<ClassValue> {}

function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const append = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    Object.entries(value).forEach(([key, enabled]) => {
      if (enabled) classes.push(key);
    });
  };

  inputs.forEach(append);
  return classes.join(' ');
}

/**
 * shadcn/ui-compatible class combiner.
 * The upstream template uses `clsx` + `tailwind-merge`; this local equivalent
 * keeps the project buildable when the package registry blocks installs.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}

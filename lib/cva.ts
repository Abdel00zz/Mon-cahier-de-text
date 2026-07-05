import { cn } from './utils';

type VariantDefinitions = Record<string, Record<string, string>>;
type DefaultVariants<T extends VariantDefinitions> = Partial<{ [K in keyof T]: keyof T[K] }>;

type VariantSelection<T extends VariantDefinitions> = Partial<{
  [K in keyof T]: keyof T[K] | null | undefined;
}> & { className?: string };

export type VariantProps<T extends (...args: any) => any> = NonNullable<Parameters<T>[0]>;

export function cva<T extends VariantDefinitions>(
  base: string,
  config: { variants?: T; defaultVariants?: DefaultVariants<T> } = {}
) {
  return (props: VariantSelection<T> = {}) => {
    const { variants, defaultVariants } = config;
    const selectedClasses: string[] = [];

    if (variants) {
      (Object.keys(variants) as Array<keyof T>).forEach((variantName) => {
        const value = props[variantName] ?? defaultVariants?.[variantName];
        if (value && variants[variantName][String(value)]) {
          selectedClasses.push(variants[variantName][String(value)]);
        }
      });
    }

    return cn(base, ...selectedClasses, props.className);
  };
}

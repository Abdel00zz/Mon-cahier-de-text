import React from 'react';
import { CAHIER_TOKENS, FeltColorName } from '@/constants/cahierTokens';
import { cn } from '@/lib/utils';

// Feutre helper to retrieve color codes
export const getFeltColor = (nameOrCycle?: string, index: number = 0) => {
  const feltKeys: FeltColorName[] = ['bleu', 'vert', 'cerise', 'violet', 'ambre'];
  if (!nameOrCycle) {
    const key = feltKeys[index % feltKeys.length];
    return { name: key, ...CAHIER_TOKENS.colors.felt[key] };
  }
  const normalized = nameOrCycle.toLowerCase();
  if (normalized.includes('math') || normalized.includes('scient') || normalized.includes('lycee') || normalized.includes('lycée')) {
    return { name: 'bleu' as const, ...CAHIER_TOKENS.colors.felt.bleu };
  }
  if (normalized.includes('svt') || normalized.includes('bio') || normalized.includes('college') || normalized.includes('collège')) {
    return { name: 'vert' as const, ...CAHIER_TOKENS.colors.felt.vert };
  }
  if (normalized.includes('franc') || normalized.includes('litt') || normalized.includes('prim')) {
    return { name: 'cerise' as const, ...CAHIER_TOKENS.colors.felt.cerise };
  }
  if (normalized.includes('phys') || normalized.includes('chim') || normalized.includes('hist')) {
    return { name: 'violet' as const, ...CAHIER_TOKENS.colors.felt.violet };
  }
  if (normalized.includes('ar') || normalized.includes('ang') || normalized.includes('islam') || normalized.includes('sport')) {
    return { name: 'ambre' as const, ...CAHIER_TOKENS.colors.felt.ambre };
  }
  const key = feltKeys[Math.abs(hashString(nameOrCycle)) % feltKeys.length];
  return { name: key, ...CAHIER_TOKENS.colors.felt[key] };
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * ClassTag : Pastille / onglet de feutre de classe (sans carte complète)
 */
export interface ClassTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  colorName?: FeltColorName;
  subjectOrCycle?: string;
  index?: number;
  hasPunchHole?: boolean;
}

export const ClassTag: React.FC<ClassTagProps> = ({
  label,
  colorName,
  subjectOrCycle,
  index = 0,
  hasPunchHole = false,
  className,
  ...props
}) => {
  const felt = colorName ? { name: colorName, ...CAHIER_TOKENS.colors.felt[colorName] } : getFeltColor(subjectOrCycle, index);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-0.5 text-[12px] font-medium font-sans tracking-tight select-none border transition-colors',
        className
      )}
      style={{
        backgroundColor: felt.tint,
        borderColor: `${felt.base}33`,
        color: felt.base,
      }}
      {...props}
    >
      {hasPunchHole && (
        <span
          className="h-2 w-2 rounded-full border border-black/15 bg-white dark:bg-[#202124] shadow-inner"
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};

import React, { memo } from 'react';
import { FeltColorName } from '@/constants/cahierTokens';

interface IntercalaireCardFrameProps {
  feltColor: { name: FeltColorName; base: string; tint: string };
  tabLabel?: string;
  isRtl?: boolean;
}

/**
 * IntercalaireCardFrame : Onglet intercalaire d'écolier supérieur qui s'intègre harmonieusement sans double cadre
 */
export const IntercalaireCardFrame: React.FC<IntercalaireCardFrameProps> = memo(({
  feltColor,
  tabLabel = 'Cahier',
  isRtl = false,
}) => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-3.5 z-0 h-4 overflow-visible select-none"
    >
      {/* Onglet d'intercalaire écolier dépassant au-dessus de la carte */}
      <div
        className="flex items-center gap-1.5 px-3 py-0.5 rounded-t-[8px] text-[10px] font-bold font-sans tracking-wide text-white uppercase shadow-2xs transition-transform duration-200"
        style={{
          backgroundColor: feltColor.base,
          marginLeft: isRtl ? 'auto' : '18px',
          marginRight: isRtl ? '18px' : 'auto',
          width: 'fit-content',
          maxWidth: '120px',
        }}
      >
        {/* Perforation ronde discrète */}
        <span className="h-2 w-2 rounded-full bg-white dark:bg-[#202124] border border-transparent shadow-inner shrink-0" />
        <span className="truncate">{tabLabel.slice(0, 14)}</span>
      </div>
    </div>
  );
});


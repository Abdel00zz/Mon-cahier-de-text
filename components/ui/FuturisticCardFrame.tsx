import React, { memo } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { ClassScheduleColorTheme, CLASS_COLOR_PALETTE } from '@/utils/scheduleColors';

interface FuturisticCardFrameProps {
  className?: string;
  badgeLabel?: string;
  colorTheme?: ClassScheduleColorTheme;
}

export const FuturisticCardFrame: React.FC<FuturisticCardFrameProps> = memo(({
  className = '',
  badgeLabel,
  colorTheme = CLASS_COLOR_PALETTE[0],
}) => {
  const { locale } = useLocale();
  const isAr = locale === 'ar';

  const defaultBadgeText = isAr ? 'دفتر النصوص' : 'Cahier de textes';
  const label = badgeLabel || defaultBadgeText;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full select-none overflow-visible will-change-transform ${className}`}
    >
      <svg
        viewBox="0 0 460 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full overflow-visible transition-all duration-300 ease-out"
        preserveAspectRatio="none"
      >
        {/* Surface sobre : seule la couleur de matière garde un rôle de repère. */}
        <rect
          x="4"
          y="12"
          width="452"
          height="232"
          rx="16"
          stroke={colorTheme.primaryHex}
          strokeOpacity="0.48"
          strokeWidth="1.5"
          className="fill-white dark:fill-zinc-900 transition-all duration-300 ease-out group-hover:stroke-opacity-70"
        />

        {/* Le repère est rectangulaire, aligné avec le système de rayons de l'interface. */}
        <rect
          x="142"
          y="9"
          width="176"
          height="7"
          className="fill-white dark:fill-zinc-900"
        />

        {/* ── TOP LABEL ───────────────────────────────────────────────── */}
        <rect
          x="144"
          y="0"
          width="172"
          height="28"
          rx="8"
          fill={colorTheme.primaryHex}
          className="transition-opacity duration-300 ease-out group-hover:opacity-90"
          style={{ transformOrigin: 'center' }}
        />

        {/* Bord fin, sans effet de brillance. */}
        <rect
          x="145"
          y="1"
          width="170"
          height="26"
          rx="7"
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1"
        />

        {/* Typography: Lateef pour l'arabe, Plus Jakarta Sans pour le français. */}
        <text
          x="230"
          y={isAr ? '14' : '14.5'}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          className="select-none drop-shadow-2xs"
          style={{
            fontSize: isAr ? '23px' : '11px',
            fontFamily: isAr ? "'Lateef', cursive, serif" : "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: isAr ? 700 : 800,
            letterSpacing: isAr ? '0.01em' : '0.06em',
          }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
});

FuturisticCardFrame.displayName = 'FuturisticCardFrame';

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

  const idSuffix = React.useId().replace(/[:]/g, '');

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
        <defs>
          {/* Badge Dynamic Schedule Theme Gradient */}
          <linearGradient id={`badgeGrad_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorTheme.primaryHex} />
            <stop offset="100%" stopColor={colorTheme.glowHex} />
          </linearGradient>

          {/* Solid Vibrant Border Matching Badge Color */}
          <linearGradient id={`cardBorderGrad_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorTheme.primaryHex} />
            <stop offset="100%" stopColor={colorTheme.glowHex} />
          </linearGradient>

          {/* Badge Soft Glow Aura on hover */}
          <radialGradient id={`badgeAura_${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colorTheme.glowHex} stopOpacity="0.4" />
            <stop offset="100%" stopColor={colorTheme.glowHex} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── CARD SINGLE SOLID BASE & THICK PROMINENT CONTOUR IN BADGE COLOR ── */}
        <rect
          x="4"
          y="14"
          width="452"
          height="230"
          rx="24"
          stroke={`url(#cardBorderGrad_${idSuffix})`}
          strokeWidth="2.75"
          className="fill-white dark:fill-zinc-900 transition-all duration-300 ease-out group-hover:stroke-width-[3.25]"
        />

        {/* ── CLEAN TOP CUTOUT NOTCH (Breaks the top stroke so it connects cleanly into badge) ── */}
        <rect
          x="142"
          y="11"
          width="176"
          height="7"
          className="fill-white dark:fill-zinc-900"
        />

        {/* ── TOP BADGE "CAHIER DE TEXTES" / "دفتر النصوص" ─────────────── */}
        {/* Soft Aura on hover */}
        <ellipse
          cx="230"
          cy="14"
          rx="96"
          ry="16"
          fill={`url(#badgeAura_${idSuffix})`}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"
        />

        {/* Clean Modern Badge Pill */}
        <rect
          x="144"
          y="0"
          width="172"
          height="28"
          rx="14"
          fill={`url(#badgeGrad_${idSuffix})`}
          className="shadow-sm transition-all duration-300 ease-out group-hover:scale-[1.02] group-hover:shadow-md"
          style={{ transformOrigin: 'center' }}
        />

        {/* Badge Soft Bevel Highlight */}
        <rect
          x="145"
          y="1"
          width="170"
          height="26"
          rx="13"
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1"
        />

        {/* Left & Right Accent Dots */}
        <circle cx="156" cy="14" r="2.2" fill="#FFFFFF" fillOpacity="0.95" />
        <circle cx="304" cy="14" r="2.2" fill="#FFFFFF" fillOpacity="0.95" />

        {/* Badge Typography: Lateef font for Arabic title, Plus Jakarta Sans for French */}
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

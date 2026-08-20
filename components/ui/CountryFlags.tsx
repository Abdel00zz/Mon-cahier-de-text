import React from 'react';

interface FlagProps {
  className?: string;
  size?: number | string;
}

/**
 * Real authentic SVG flag for Morocco 🇲🇦
 */
const FlagMorocco: React.FC<FlagProps> = ({ className = 'w-6 h-4', size }) => (
  <svg
    viewBox="0 0 900 600"
    width={size}
    height={size}
    className={`inline-block rounded-xs shadow-2xs shrink-0 overflow-hidden ${className}`}
    aria-hidden="true"
  >
    <rect width="900" height="600" fill="#c1272d" />
    <path
      d="M450,195 L491.7,323.3 L382.4,244 L517.6,244 L408.3,323.3 Z"
      fill="none"
      stroke="#006233"
      strokeWidth="15"
      strokeLinejoin="round"
      strokeMiterlimit="10"
    />
  </svg>
);

/**
 * Real authentic SVG flag for France 🇫🇷
 */
const FlagFrance: React.FC<FlagProps> = ({ className = 'w-6 h-4', size }) => (
  <svg
    viewBox="0 0 900 600"
    width={size}
    height={size}
    className={`inline-block rounded-xs shadow-2xs shrink-0 overflow-hidden ${className}`}
    aria-hidden="true"
  >
    <rect width="300" height="600" fill="#002654" />
    <rect x="300" width="300" height="600" fill="#FFFFFF" />
    <rect x="600" width="300" height="600" fill="#CE1126" />
  </svg>
);

/**
 * Real authentic SVG flag for the United Kingdom 🇬🇧
 */
const FlagUK: React.FC<FlagProps> = ({ className = 'w-6 h-4', size }) => (
  <svg
    viewBox="0 0 60 30"
    width={size}
    height={size}
    className={`inline-block rounded-xs shadow-2xs shrink-0 overflow-hidden ${className}`}
    aria-hidden="true"
  >
    <clipPath id="uk-clip">
      <rect width="60" height="30" />
    </clipPath>
    <g clipPath="url(#uk-clip)">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#uk-diagonals)" />
      <path d="M0,0 L30,15 L0,15 Z M60,30 L30,15 L60,15 Z M0,30 L30,15 L15,30 Z M60,0 L30,15 L45,0 Z" fill="#C8102E" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

export const CountryFlag: React.FC<{ code: 'fr' | 'ar' | 'en'; className?: string; size?: number | string }> = ({
  code,
  className = 'w-7 h-5',
  size,
}) => {
  switch (code) {
    case 'ar':
      return <FlagMorocco className={className} size={size} />;
    case 'fr':
      return <FlagFrance className={className} size={size} />;
    case 'en':
      return <FlagUK className={className} size={size} />;
    default:
      return null;
  }
};

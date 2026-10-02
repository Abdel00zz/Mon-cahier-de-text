import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import './activeSessionGlass.css';
import './sessionEffects.css';

// Open ribbons inspired by the liquid reflections in
// Fernando Cohen's Marquee Glass Bubble: https://codepen.io/designfenix/pen/QwdoddG
const contours = [
  'M2 27 C34 8 57 35 96 22 C132 7 162 31 198 15',
  'M2 21 C34 34 66 7 98 23 C132 37 169 10 198 23',
  'M2 27 C35 36 60 15 96 24 C137 12 162 37 198 15',
];

/** Mounted only by active class cards. Essential content never moves with the glass. */
export function ActiveSessionGlass({ label }: { label: string }) {
  const id = useId().replace(/:/g, '');
  const reduceMotion = useReducedMotion();
  const pathId = `session-glass-path-${id}`;
  const edgeId = `session-glass-edge-${id}`;
  return <span className="active-session-glass">
    <span className="active-session-glass__label session-live-text">{label}</span>
    <svg className="active-session-glass__scene" viewBox="0 0 200 42" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <path id={pathId} d={contours[0]}>
          {!reduceMotion && <animate attributeName="d" dur="14s" repeatCount="indefinite"
            values={[...contours, contours[0]].join(';')} keyTimes="0;.33;.66;1"
            calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" />}
        </path>
        <linearGradient id={edgeId} x1="0" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="var(--session-glass-light)" stopOpacity=".95" />
          <stop offset=".42" stopColor="var(--class-accent)" stopOpacity=".1" />
          <stop offset=".78" stopColor="var(--session-glass-light)" stopOpacity=".8" />
          <stop offset="1" stopColor="var(--class-accent)" stopOpacity=".24" />
        </linearGradient>
      </defs>
      <use href={`#${pathId}`} fill="none" stroke={`url(#${edgeId})`} strokeWidth="5" />
      <use className="active-session-glass__glint" href={`#${pathId}`} fill="none" stroke="var(--session-glass-light)" strokeWidth="2" strokeDasharray="24 340" />
    </svg>
  </span>;
}

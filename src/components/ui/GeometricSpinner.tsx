import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import './geometric-spinner.css';

// Matching curve segments let every contour morph smoothly into the next.
const square = 'M12 4 C20 4 20 4 20 12 C20 20 20 20 12 20 C4 20 4 20 4 12 C4 4 4 4 12 4 Z';
const circle = 'M12 4 C16.42 4 20 7.58 20 12 C20 16.42 16.42 20 12 20 C7.58 20 4 16.42 4 12 C4 7.58 7.58 4 12 4 Z';
// A pointed crest with a gently recessed base keeps the triangular silhouette light.
const triangle = 'M12 3 C13.8 8 15.8 13.8 20 18.5 C17.3 18 14.7 16.7 12 15.5 C9.3 16.7 6.7 18 4 18.5 C8.2 13.8 10.2 8 12 3 Z';
const diamond = 'M12 3 C15 6 18 9 21 12 C18 15 15 18 12 21 C9 18 6 15 3 12 C6 9 9 6 12 3 Z';
const contours = [triangle, triangle, diamond, square, square, circle, circle, triangle].join(';');
const keyTimes = '0;0.1;0.26;0.42;0.5;0.7;0.8;1';
const keySplines = Array(7).fill('0.45 0 0.2 1').join(';');

/** Decorative geometry; the surrounding loading region supplies the status label. */
export function GeometricSpinner({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const reflectionId = `spinner-reflection-${useId().replace(/:/g, '')}`;
  return <span
    aria-hidden="true"
    className={`geometric-spinner${compact ? ' geometric-spinner--compact' : ''}`}
  >
    <svg viewBox="0 0 24 24" focusable="false">
      <defs>
        <linearGradient id={reflectionId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity=".45" />
          <stop offset=".5" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".65" />
        </linearGradient>
      </defs>
      <g className="geometric-spinner__rotation">
        {['contour', 'reflection'].map(layer => <path
          key={layer}
          className={`geometric-spinner__shape geometric-spinner__${layer}`}
          d={triangle}
          pathLength={100}
          stroke={layer === 'reflection' ? `url(#${reflectionId})` : undefined}
        >
          {!reduceMotion && <animate
            attributeName="d"
            dur="6.03s"
            repeatCount="indefinite"
            values={contours}
            keyTimes={keyTimes}
            calcMode="spline"
            keySplines={keySplines}
          />}
        </path>)}
      </g>
    </svg>
  </span>;
}

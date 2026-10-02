import { useReducedMotion } from 'framer-motion';
import './geometric-spinner.css';

// Matching curve segments let every contour morph smoothly into the next.
const square = 'M12 4 C20 4 20 4 20 12 C20 20 20 20 12 20 C4 20 4 20 4 12 C4 4 4 4 12 4 Z';
const circle = 'M12 4 C16.42 4 20 7.58 20 12 C20 16.42 16.42 20 12 20 C7.58 20 4 16.42 4 12 C4 7.58 7.58 4 12 4 Z';
// A pointed crest with a gently recessed base keeps the triangular silhouette light.
const triangle = 'M12 3 C13.8 8 15.8 13.8 20 18.5 C17.3 18 14.7 16.7 12 15.5 C9.3 16.7 6.7 18 4 18.5 C8.2 13.8 10.2 8 12 3 Z';

/** Decorative geometry; the surrounding loading region supplies the status label. */
export function GeometricSpinner({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  return <span
    aria-hidden="true"
    className={`geometric-spinner${compact ? ' geometric-spinner--compact' : ''}`}
  >
    <svg viewBox="0 0 24 24" focusable="false">
      <path className="geometric-spinner__shape" d={triangle}>
        {!reduceMotion && <animate
          attributeName="d"
          dur="6s"
          repeatCount="indefinite"
          values={[triangle, triangle, square, square, circle, circle, triangle].join(';')}
          keyTimes="0;0.12;0.33;0.45;0.66;0.78;1"
          calcMode="spline"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
        />}
      </path>
    </svg>
  </span>;
}

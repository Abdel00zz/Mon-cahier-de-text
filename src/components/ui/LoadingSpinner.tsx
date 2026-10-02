import './loading-spinner.css';

/** The surrounding loading region supplies the accessible status message. */
export function LoadingSpinner({ compact = false }: { compact?: boolean }) {
  return <span aria-hidden="true" className={`loading-spinner${compact ? ' loading-spinner--compact' : ''}`}>
    <svg viewBox="0 0 48 48" focusable="false">
      <circle className="loading-spinner__track" cx="24" cy="24" r="20" />
      <circle className="loading-spinner__arc" cx="24" cy="24" r="20" pathLength="100" />
    </svg>
  </span>;
}

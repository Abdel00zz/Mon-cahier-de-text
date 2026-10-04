import './loading-spinner.css';

/** The surrounding loading region supplies the accessible status message. */
export function LoadingSpinner({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`loading-spinner${compact ? ' loading-spinner--compact' : ''}`}
    >
      <span className="loading-spinner__dot" />
      <span className="loading-spinner__dot" />
      <span className="loading-spinner__dot" />
      <span className="loading-spinner__dot" />
    </span>
  );
}

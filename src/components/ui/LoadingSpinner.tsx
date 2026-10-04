import './loading-spinner.css';

/**
 * Quatre pastilles qui parcourent un carré, décalées d'un quart de tour :
 * l'indicateur des écrans de chargement (démarrage, changement de vue,
 * tableau de bord). Les pastilles sont des `span` et non des `hr` : dans un
 * conteneur `span` décoratif, un `hr` serait du flux interdit en HTML (et son
 * rôle implicite `separator` n'aurait aucun sens ici).
 *
 * Le composant reste purement décoratif : la région qui l'accueille porte le
 * message accessible (`role="status"`, `aria-live`).
 */
export function LoadingSpinner({ compact = false }: { compact?: boolean }) {
  return <span aria-hidden="true" className={`loading-spinner${compact ? ' loading-spinner--compact' : ''}`}>
    <span className="loading-spinner__dot" />
    <span className="loading-spinner__dot" />
    <span className="loading-spinner__dot" />
    <span className="loading-spinner__dot" />
  </span>;
}

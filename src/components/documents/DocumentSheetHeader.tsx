import './documentSheet.css';

export interface DocumentSheetHeaderProps {
  /** Titre de l'élément (« Devoir surveillé 2 ») ; absent quand le document le dit déjà. */
  title?: string;
  /** Classe, portée à l'autre bord de la page. */
  classLabel?: string;
  /** Sens d'écriture du document : le titre s'ancre à son bord de départ. */
  dir?: 'ltr' | 'rtl';
  className?: string;
}

/**
 * L'en-tête de la feuille : titre d'un côté, classe de l'autre, un filet dessous.
 * Même composant pour l'aperçu, la relecture de la direction et l'impression A5
 * (voir `documentSheet.css` pour les mesures). Sans titre ni classe, rien ne
 * s'affiche : la feuille commence directement sur son texte.
 */
export function DocumentSheetHeader({ title, classLabel, dir, className }: DocumentSheetHeaderProps) {
  const heading = title?.trim();
  const group = classLabel?.trim();
  if (!heading && !group) return null;
  return (
    <header className={className ? `doc-sheet-header ${className}` : 'doc-sheet-header'} dir={dir}>
      {heading && <p className="doc-sheet-header__title" dir="auto">{heading}</p>}
      {group && <p className="doc-sheet-header__class" dir="auto">{group}</p>}
    </header>
  );
}

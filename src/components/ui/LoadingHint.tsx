import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import './loading-hint.css';

/**
 * Le mot d'attente sous le spinner. Il vient APRÈS le chargement : rien ne le déclenche, rien ne le retarde.
 *  - il n'apparaît qu'après un court délai (une attente brève ne montre aucun texte, donc aucun clignotement) ;
 *  - il se dépose en fondu, sans décalage de mise en page (hauteur réservée) ;
 *  - si l'attente se prolonge, la phrase change en douceur pour rassurer.
 * Décoratif pour les lecteurs d'écran : le conteneur de l'écran d'attente annonce déjà l'état.
 */
const SLOW_AFTER_MS = 6000;

export function LoadingHint() {
  const { t } = useLocale();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <p className="loading-hint" aria-hidden="true">
      <span key={slow ? 'slow' : 'first'} className="loading-hint__text" data-late={slow ? '' : undefined}>{t(slow ? 'loading.hintSlow' : 'loading.hint')}</span>
    </p>
  );
}

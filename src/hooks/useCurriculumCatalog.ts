import { useEffect, useRef, useState } from 'react';
import { bundledCurricula, loadCurriculumCatalog, type CurriculumCatalog } from '@/domain/curriculum/officialCurriculum';

/**
 * Catalogue des programmes : l'embarqué s'affiche tout de suite, la version publiée le remplace
 * en arrière-plan. Une fois `locked`, un catalogue arrivé plus tard est ignoré : les choix de
 * l'enseignant ne doivent jamais changer de référentiel en cours de saisie.
 */
export function useCurriculumCatalog(enabled: boolean, locked: boolean): CurriculumCatalog {
  const [catalog, setCatalog] = useState<CurriculumCatalog>(bundledCurricula);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void loadCurriculumCatalog(controller.signal)
      .then(value => { if (!lockedRef.current) setCatalog(value); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [enabled]);
  return catalog;
}

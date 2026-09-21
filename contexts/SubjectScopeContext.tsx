import { createContext, useContext, type ReactNode } from 'react';

/**
 * Visibilité des libellés et badges de matière dans TOUTE l'application.
 *
 * Une seule matière ne se distingue de rien : ses libellés sont donc masqués
 * (emploi du temps, liste des classes, évaluations, devoirs, filtre du tableau
 * de bord). La décision est calculée une fois, dans `App`, par
 * `teachesSeveralSubjects` (`utils/subjectScope.ts`), puis lue partout.
 *
 * Valeur par défaut : `true`. Hors provider (rendu isolé, test, aperçu), on
 * affiche comme avant, sans jamais cacher une information par accident.
 */
const SubjectScopeContext = createContext(true);

export const SubjectScopeProvider = ({ showsSubjectLabels, children }: {
    showsSubjectLabels: boolean;
    children: ReactNode;
}) => (
    <SubjectScopeContext.Provider value={showsSubjectLabels}>
        {children}
    </SubjectScopeContext.Provider>
);

/** L'interface doit-elle afficher les libellés de matière ? */
export const useShowsSubjectLabels = (): boolean => useContext(SubjectScopeContext);

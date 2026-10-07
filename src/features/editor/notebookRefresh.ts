import type { ContentDirection, LessonsData } from '@/types';
import { readStoredContentDirection } from '@/domain/notebook/contentDirection';
import { migrateLessonsData } from '@/domain/notebook/dataUtils';

/**
 * Le cahier du DISQUE a-t-il changé sous les pieds de l'éditeur ?
 *
 * Le cahier peut être réécrit ailleurs pendant que l'éditeur reste monté :
 *  - un **pull cloud** (`pull-applied`), déjà géré ;
 *  - une **écriture locale venue d'un autre écran** — l'onglet « Absences et
 *    certificats » pose la ligne « Certificat de maladie » dans le cahier des
 *    classes qui ont une séance pendant l'absence, alors que l'éditeur est
 *    toujours monté derrière les Réglages (`key={routeKey}` ne le démonte pas :
 *    on revient dans la classe par l'historique, pas par un remontage).
 *
 * Sans cette relecture, la ligne n'apparaîtrait pas au retour ET le premier
 * enregistrement automatique la recouvrirait, puisque l'éditeur écrit son
 * cahier EN ENTIER depuis sa mémoire.
 *
 * La décision est isolée ici, hors de React, pour être mesurable : c'est un
 * simple constat sur deux instantanés, pas un effet de bord. Rendre `false`
 * signifie « rien à faire » — un événement `dirty` peut venir d'une autre
 * classe, de la liste des classes ou de notre propre enregistrement.
 */
export interface NotebookInMemory {
    lessons: LessonsData;
    direction: ContentDirection;
}

export const storedNotebookChanged = (raw: string | null, memory: NotebookInMemory): boolean => {
    if (!raw) return false;
    try {
        const stored = JSON.parse(raw);
        const incoming = migrateLessonsData(Array.isArray(stored) ? stored : (stored.lessonsData ?? []));
        const incomingDirection = readStoredContentDirection(stored);
        if (JSON.stringify(incoming) !== JSON.stringify(memory.lessons)) return true;
        // Le contenu est identique : seul le SENS d'écriture a pu être décidé
        // ailleurs (détection persistée), et le tableau doit le suivre.
        return Boolean(incomingDirection) && incomingDirection !== memory.direction;
    } catch {
        // Cahier illisible : recharger ne ferait que perdre ce qui est à l'écran.
        return false;
    }
};

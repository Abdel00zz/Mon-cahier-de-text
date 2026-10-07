import type { ContentDirection, LessonsData } from '@/types';
import { readStoredContentDirection } from '@/domain/notebook/contentDirection';
import { migrateLessonsData } from '@/domain/notebook/dataUtils';

/** Compare le contenu pédagogique du disque à la saisie en mémoire,
 * après migration. Une copie administrative historique ne déclenche pas
 * une relecture ; une modification du cours ou de sa direction le fait.
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

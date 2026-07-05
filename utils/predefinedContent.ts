import { ClassInfo, LessonsData } from '../types';
import { prepareImportedLessons } from './importPipeline';

/**
 * Bibliothèque de contenus prédéfinis (public/contenus/) : pour chaque
 * niveau × matière, un JSON de programme officiel que le prof peut charger
 * dans un cahier vide, puis modifier librement — ou ignorer et créer le sien.
 */

export interface PredefinedEntry {
    niveau: string;
    matiere: string;
    titre: string;
    fichier: string;
}

interface Manifest {
    version: number;
    contenus: PredefinedEntry[];
}

let manifestCache: Manifest | null = null;

const loadManifest = async (): Promise<Manifest | null> => {
    if (manifestCache) return manifestCache;
    try {
        const response = await fetch('/contenus/manifest.json', { cache: 'no-cache' });
        if (!response.ok) return null;
        manifestCache = (await response.json()) as Manifest;
        return manifestCache;
    } catch {
        return null;
    }
};

const normalize = (value: string): string =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Contenu prédéfini correspondant à la classe (niveau préfixe du nom + matière). */
export const findPredefinedFor = async (classInfo: ClassInfo): Promise<PredefinedEntry | null> => {
    const manifest = await loadManifest();
    if (!manifest) return null;
    const className = normalize(classInfo.name);
    const subject = normalize(classInfo.subject);
    return (
        manifest.contenus.find(
            entry => className.startsWith(normalize(entry.niveau)) && subject === normalize(entry.matiere)
        ) ?? null
    );
};

/** Charge et normalise le contenu (même pipeline que l'import JSON manuel). */
export const loadPredefinedContent = async (entry: PredefinedEntry): Promise<LessonsData> => {
    const response = await fetch(`/contenus/${entry.fichier}`, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Contenu prédéfini introuvable.');
    const raw = await response.json();
    const { lessonsData } = prepareImportedLessons(raw);
    return lessonsData;
};

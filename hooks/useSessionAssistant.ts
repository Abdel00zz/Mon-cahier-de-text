import { useEffect, useState } from 'react';
import { AppConfig, ClassInfo } from '../types';
import {
    SessionAssistantSuggestion,
    findSessionAssistantSuggestion,
} from '../utils/sessionAssistant';
import { subscribe } from '../utils/syncBus';

/**
 * Suggestion de séance « vivante » pour le tableau de bord — le prof qui ouvre
 * l'application autour d'une séance voit immédiatement la classe concernée et
 * le contenu à dater (même moteur que les rappels de fin de séance).
 *
 * Fenêtre « à venir » élargie (45 min par défaut) : l'enseignant prépare sa
 * séance avant d'entrer en classe. Rafraîchi chaque minute et à chaque
 * modification de données (syncBus), pour suivre l'heure ET le cahier.
 */
export const useSessionAssistant = (
    classes: ClassInfo[],
    config: AppConfig,
    upcomingWindowMin = 45
): SessionAssistantSuggestion | null => {
    const [suggestion, setSuggestion] = useState<SessionAssistantSuggestion | null>(null);

    useEffect(() => {
        let cancelled = false;

        const refresh = () => {
            void findSessionAssistantSuggestion(config, new Date(), classes, { upcomingWindowMin })
                .then(next => {
                    if (!cancelled) setSuggestion(next);
                })
                .catch(() => {
                    if (!cancelled) setSuggestion(null);
                });
        };

        refresh();
        const interval = window.setInterval(refresh, 60_000);
        const unsubDirty = subscribe('dirty', refresh);
        const unsubPull = subscribe('pull-applied', refresh);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
            unsubDirty();
            unsubPull();
        };
    }, [classes, config, upcomingWindowMin]);

    return suggestion;
};

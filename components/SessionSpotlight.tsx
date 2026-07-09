import React from 'react';
import { ClassInfo } from '../types';
import {
    SessionAssistantSuggestion,
    buildSessionFocusPayload,
    writeSessionFocusPayload,
} from '../utils/sessionAssistant';
import { formatHourLabel } from '../utils/timetable';
import { MathText } from './ui/math-text';
import { ArrowRight, CalendarCheck, CircleCheck, Pencil } from './ui/icons';

interface SessionSpotlightProps {
    suggestion: SessionAssistantSuggestion;
    onOpenClass: (classInfo: ClassInfo) => void;
}

const PHASE_LABEL: Record<SessionAssistantSuggestion['phase'], string> = {
    active: 'Séance en cours',
    upcoming: 'Séance imminente',
    'recently-ended': 'Séance terminée',
};

/**
 * Carte « séance du moment » — le prof ouvre l'app autour d'une séance et voit
 * immédiatement la classe concernée + le contenu à traiter. Un tap ouvre le
 * cahier ET surligne l'élément proposé (payload de focus consommé par
 * l'éditeur, même mécanisme que les notifications de fin de séance).
 */
export const SessionSpotlight: React.FC<SessionSpotlightProps> = ({ suggestion, onOpenClass }) => {
    const period = `${formatHourLabel(suggestion.startMin)}–${formatHourLabel(suggestion.endMin)}`;
    const target = suggestion.target;

    const handleOpen = () => {
        const payload = buildSessionFocusPayload(suggestion);
        if (payload) writeSessionFocusPayload(payload);
        onOpenClass(suggestion.classInfo);
    };

    return (
        <div className="mx-auto mb-4 max-w-5xl px-3 sm:px-4">
            <button
                type="button"
                onClick={handleOpen}
                className="group relative block w-full overflow-hidden rounded-lg border border-primary/20 surface-art p-4 text-left shadow-md shadow-foreground/5 transition-all duration-300 hover:border-primary/35 active:scale-[0.985] animate-slide-in-up"
                aria-label={`${PHASE_LABEL[suggestion.phase]} : ouvrir le cahier de ${suggestion.classInfo.name}`}
            >
                {/* halo vivant */}
                <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[rgb(var(--mint-wash)_/_0.58)] blur-[46px] opacity-70" />

                {/* Phase + horaire */}
                <div className="relative flex items-center gap-2">
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-[rgb(var(--sky-wash)_/_0.58)] px-2.5 py-1 text-[10.5px] font-extrabold uppercase text-primary"
                    >
                        {suggestion.phase === 'active' && (
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                            </span>
                        )}
                        {PHASE_LABEL[suggestion.phase]}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-muted-foreground">{period}</span>
                </div>

                {/* Classe */}
                <h3 className="relative mt-2 font-display text-lg font-extrabold leading-tight text-foreground">
                    {suggestion.classInfo.name}
                </h3>

                {/* Contenu à traiter */}
                <div className="relative mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-muted-foreground">
                    {target?.status === 'missing-date' && (
                        <>
                            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="min-w-0">
                                À dater :{' '}
                                <span className="font-extrabold text-foreground">
                                    <MathText source={target.title} cacheKey={`spot-${target.title}`} inline>{target.title}</MathText>
                                </span>
                            </span>
                        </>
                    )}
                    {target?.status === 'already-dated' && (
                        <>
                            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                            <span className="min-w-0">
                                Déjà daté aujourd'hui :{' '}
                                <span className="font-extrabold text-foreground">
                                    <MathText source={target.title} cacheKey={`spot-${target.title}`} inline>{target.title}</MathText>
                                </span>
                            </span>
                        </>
                    )}
                    {(!target || target.status === 'no-content') && (
                        <>
                            <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>Aucun contenu en attente — le cahier est prêt.</span>
                        </>
                    )}
                </div>

                {/* Appel à l'action */}
                <div className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11.5px] font-extrabold text-primary-foreground transition-all duration-300 group-hover:gap-2">
                    Ouvrir le cahier
                    <ArrowRight className="h-3.5 w-3.5" />
                </div>
            </button>
        </div>
    );
};

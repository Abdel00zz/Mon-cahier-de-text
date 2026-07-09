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
    const accent = suggestion.classInfo.color || 'hsl(var(--primary))';
    const accentInk = `color-mix(in srgb, ${accent} 72%, hsl(var(--foreground)))`;
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
                className="group relative block w-full overflow-hidden rounded-[22px] border-2 p-4 text-left shadow-md transition-all duration-300 active:scale-[0.985] animate-slide-in-up"
                style={{
                    borderColor: `color-mix(in srgb, ${accent} 70%, hsl(var(--border)))`,
                    backgroundColor: `color-mix(in srgb, ${accent} 8%, hsl(var(--card)))`,
                    boxShadow: `0 6px 22px color-mix(in srgb, ${accent} 22%, transparent)`,
                }}
                aria-label={`${PHASE_LABEL[suggestion.phase]} : ouvrir le cahier de ${suggestion.classInfo.name}`}
            >
                {/* halo vivant */}
                <div
                    className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full blur-[46px] opacity-20"
                    style={{ backgroundColor: accent }}
                />

                {/* Phase + horaire */}
                <div className="relative flex items-center gap-2">
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${accent} 16%, hsl(var(--card)))`,
                            color: accentInk,
                        }}
                    >
                        {suggestion.phase === 'active' && (
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: accent }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                            </span>
                        )}
                        {PHASE_LABEL[suggestion.phase]}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-muted-foreground">{period}</span>
                </div>

                {/* Classe */}
                <h3
                    className="relative mt-2 font-display text-lg font-extrabold tracking-tight leading-tight"
                    style={{ color: `color-mix(in srgb, ${accent} 18%, hsl(var(--foreground)))` }}
                >
                    {suggestion.classInfo.name}
                </h3>

                {/* Contenu à traiter */}
                <div className="relative mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-muted-foreground">
                    {target?.status === 'missing-date' && (
                        <>
                            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
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
                <div
                    className="relative mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition-all duration-300 group-hover:gap-2"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${accent} 88%, hsl(var(--foreground)))`,
                        color: 'hsl(var(--primary-foreground))',
                    }}
                >
                    Ouvrir le cahier
                    <ArrowRight className="h-3.5 w-3.5" />
                </div>
            </button>
        </div>
    );
};

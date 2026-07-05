import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Guide d'accueil interactif — au premier accès, un message de bienvenue puis
 * un pointeur qui met en évidence (halo clignotant) les 3-4 démarches
 * élémentaires, une par une. Non intrusif : ignorable à tout moment, affiché
 * une seule fois (mémorisé). Cible les éléments via l'attribut `data-guide`.
 */

interface Step {
    target: string; // valeur de data-guide, ou '' pour l'accueil centré
    title: string;
    body: string;
}

const STEPS: Step[] = [
    {
        target: '',
        title: 'Bienvenue dans votre cahier de textes 👋',
        body: "En 3 étapes, découvrez l'essentiel. Vous pouvez passer ce guide à tout moment.",
    },
    {
        target: 'create-class',
        title: '1. Créez une classe',
        body: 'Choisissez le niveau et la matière — le nom se compose tout seul. Un programme officiel peut même être pré-chargé.',
    },
    {
        target: 'settings',
        title: '2. Renseignez votre emploi du temps',
        body: 'Dans les Paramètres, indiquez vos créneaux : l’application calcule alors votre progression et vous prévient des retards et des devoirs.',
    },
    {
        target: 'help',
        title: '3. Besoin d’aide ?',
        body: "Le guide complet est toujours accessible ici. Bonne rentrée !",
    },
];

const STORAGE_KEY = 'onboardingDone_v1';

interface Rect { top: number; left: number; width: number; height: number }

const readRect = (target: string): Rect | null => {
    if (!target) return null;
    const el = document.querySelector<HTMLElement>(`[data-guide="${target}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
};

export const OnboardingGuide: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);

    // Démarre une seule fois, après le premier rendu du tableau de bord.
    useEffect(() => {
        if (!enabled) return;
        try {
            if (localStorage.getItem(STORAGE_KEY)) return;
        } catch { return; }
        const t = window.setTimeout(() => setActive(true), 900);
        return () => window.clearTimeout(t);
    }, [enabled]);

    // Recalcule la position du halo à chaque étape / resize / scroll.
    useLayoutEffect(() => {
        if (!active) return;
        const update = () => {
            const target = STEPS[step]?.target ?? '';
            const r = readRect(target);
            setRect(r);
            const el = target ? document.querySelector(`[data-guide="${target}"]`) : null;
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [active, step]);

    const finish = () => {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
        setActive(false);
    };

    if (!active) return null;
    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    // Position de la bulle : sous la cible, ou centrée pour l'accueil.
    const tooltipStyle: React.CSSProperties = rect
        ? { top: Math.min(rect.top + rect.height + 12, window.innerHeight - 200), left: Math.max(12, Math.min(rect.left, window.innerWidth - 320)) }
        : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    return createPortal(
        <div className="fixed inset-0 z-[300]">
            {/* Voile sombre + trou lumineux clignotant sur la cible */}
            <div className="absolute inset-0 bg-slate-900/50 transition-opacity" onClick={finish} />
            {rect && (
                <motion.div
                    className="pointer-events-none absolute rounded-2xl"
                    style={{
                        top: rect.top - 8,
                        left: rect.left - 8,
                        width: rect.width + 16,
                        height: rect.height + 16,
                        boxShadow: '0 0 0 9999px rgba(15,23,42,0.5)',
                    }}
                    animate={{ boxShadow: ['0 0 0 4px rgba(201,100,66,0.9), 0 0 0 9999px rgba(15,23,42,0.5)', '0 0 0 10px rgba(201,100,66,0), 0 0 0 9999px rgba(15,23,42,0.5)'] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                />
            )}

            {/* Bulle d'explication */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 shadow-2xl"
                    style={tooltipStyle}
                >
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            {step === 0 ? 'Démarrage' : `Étape ${step} / ${STEPS.length - 1}`}
                        </span>
                        <button onClick={finish} className="text-[11px] font-medium text-slate-400 hover:text-slate-700">
                            Passer
                        </button>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{current.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{current.body}</p>
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-1">
                            {STEPS.map((_, i) => (
                                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300'}`} />
                            ))}
                        </div>
                        <button
                            onClick={() => (isLast ? finish() : setStep(s => s + 1))}
                            className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            {isLast ? 'Terminer' : step === 0 ? "C'est parti" : 'Suivant'}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>,
        document.body
    );
};

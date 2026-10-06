import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import { CLASS_DISPLAY_MODES, nextClassDisplayMode, type ClassDisplayMode } from './classDisplayMode';
import './classDisplayToggle.css';

/*
 * Disposition des classes : UN SEUL bouton.
 *
 * Le menu déroulant disparaît : chaque appui avance d'une disposition
 * (deux colonnes → une colonne → liste → deux colonnes) et rien d'autre n'est
 * demandé à l'enseignant. L'état se lit deux fois, sans effort : le
 * pictogramme ET le libellé, tous deux montés en permanence et animés par
 * ressort (opacité, échelle, léger glissement) — donc aucune mise en page ne
 * bouge, aucune attente, et l'icône « se transforme » au lieu de sauter.
 *
 * Géométrie : le bouton est un `Button` du socle (44 px, rayon 10, filet et
 * fond de carte), exactement comme la commande « Classe » voisine.
 */

interface ClassDisplayToggleProps {
    mode: ClassDisplayMode;
    onChange: (mode: ClassDisplayMode) => void;
    className?: string;
}

/** Miniatures des trois dispositions, avec le même cadre et la même encre. */
const GLYPHS: Record<ClassDisplayMode, React.ReactNode> = {
    list: (
        <>
            <rect x="3" y="3.5" width="18" height="4" rx="1.5" fill="currentColor" fillOpacity=".12" />
            <rect x="3" y="10" width="18" height="4" rx="1.5" fill="currentColor" fillOpacity=".12" />
            <rect x="3" y="16.5" width="18" height="4" rx="1.5" fill="currentColor" fillOpacity=".12" />
            <path d="M7 5.5h.01M7 12h.01M7 18.5h.01" strokeWidth="2.5" />
        </>
    ),
    single: <>
        <rect x="4" y="3" width="16" height="18" rx="2.5" fill="currentColor" fillOpacity=".12" />
        <rect x="7.5" y="6.5" width="9" height="5" rx="1.25" fill="currentColor" fillOpacity=".2" stroke="none" />
        <path d="M8 15h8M8 18h5" />
    </>,
    double: (
        <>
            <rect x="2" y="4" width="8.5" height="16" rx="2.25" fill="currentColor" fillOpacity=".12" />
            <rect x="13.5" y="4" width="8.5" height="16" rx="2.25" fill="currentColor" fillOpacity=".12" />
            <rect x="4.5" y="7" width="3.5" height="4" rx="1" fill="currentColor" fillOpacity=".24" stroke="none" />
            <rect x="16" y="7" width="3.5" height="4" rx="1" fill="currentColor" fillOpacity=".24" stroke="none" />
            <path d="M4.5 15.5H8M16 15.5h3.5" />
        </>
    ),
};

const MORPH = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 } as const;

export const ClassDisplayToggle = memo(({ mode, onChange, className }: ClassDisplayToggleProps) => {
    const { t } = useLocale();
    const reduceMotion = useReducedMotion();
    const { impact } = useHapticFeedback();

    const next = nextClassDisplayMode(mode);
    const labelOf = (value: ClassDisplayMode) => t(`dashboard.display.${value}`);
    const hintOf = (value: ClassDisplayMode) => t(`dashboard.display.${value}Description`);

    const handleClick = () => {
        impact('light');
        onChange(next);
    };

    return (
        <Button asChild variant="outline" size="sm">
            <motion.button
                type="button"
                data-slot="class-display-toggle"
                data-mode={mode}
                onClick={handleClick}
                title={`${labelOf(mode)} — ${hintOf(mode)}`}
                aria-label={t('dashboard.display.switchTo', { current: labelOf(mode), next: labelOf(next) })}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                transition={MORPH}
                className={cn('h-11 min-h-11 shrink-0 gap-2 rounded-md px-3 text-xs sm:text-sm', className)}
            >
                <span className="class-display-toggle__glyph" aria-hidden="true">
                    {CLASS_DISPLAY_MODES.map(value => {
                        const isActive = value === mode;
                        return (
                            <motion.span
                                key={value}
                                animate={reduceMotion
                                    ? { opacity: isActive ? 1 : 0 }
                                    : { opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.68, rotate: isActive ? 0 : -18 }}
                                initial={false}
                                transition={MORPH}
                            >
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    {GLYPHS[value]}
                                </svg>
                            </motion.span>
                        );
                    })}
                </span>
                <span className="class-display-toggle__labels" aria-hidden="true">
                    {CLASS_DISPLAY_MODES.map(value => {
                        const isActive = value === mode;
                        return (
                            <motion.span
                                key={value}
                                animate={reduceMotion
                                    ? { opacity: isActive ? 1 : 0 }
                                    : { opacity: isActive ? 1 : 0, y: isActive ? 0 : 7 }}
                                initial={false}
                                transition={MORPH}
                            >
                                {labelOf(value)}
                            </motion.span>
                        );
                    })}
                </span>
                {/* L'état est aussi ANNONCÉ, pas seulement montré : le libellé du
                    bouton change sans quitter le focus, un lecteur d'écran doit
                    l'entendre. */}
                <span className="sr-only" aria-live="polite">{labelOf(mode)}</span>
            </motion.button>
        </Button>
    );
});

ClassDisplayToggle.displayName = 'ClassDisplayToggle';

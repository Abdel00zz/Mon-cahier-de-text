import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '../types';
import { useUpcomingAssessments } from '../hooks/useAssessments';
import { todayInMorocco } from '../utils/calendar';
import { CalendarCheck, X } from './ui/icons';
import { Button } from './ui/button';

const SNOOZE_KEY = 'assessmentSnooze_v1';

interface AssessmentBannerProps {
    classes: ClassInfo[];
    config: AppConfig;
}

/** Formule le délai en langage naturel. */
const delayLabel = (inDays: number): string => {
    if (inDays === 0) return "aujourd'hui";
    if (inDays === 1) return 'demain';
    if (inDays <= 7) return `dans ${inDays} jours`;
    return `dans ${inDays} jours (semaine prochaine)`;
};

/**
 * Rappel des devoirs officiels proches (planning ministériel). Purement
 * INDICATIF : le prof n'est jamais contraint de respecter ces dates.
 */
export const AssessmentBanner: React.FC<AssessmentBannerProps> = ({ classes, config }) => {
    const upcoming = useUpcomingAssessments(classes, config, 14);
    const [dismissed, setDismissed] = useState(false);

    React.useEffect(() => {
        try {
            const until = localStorage.getItem(SNOOZE_KEY);
            setDismissed(!!until && until >= todayInMorocco());
        } catch {
            setDismissed(false);
        }
    }, [upcoming.length]);

    if (upcoming.length === 0 || dismissed) return null;

    const handleDismiss = () => {
        try {
            localStorage.setItem(SNOOZE_KEY, todayInMorocco());
        } catch { /* stockage plein */ }
        setDismissed(true);
    };

    const soonest = upcoming[0];
    const isUrgent = soonest.inDays <= 3;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mx-auto mb-4 max-w-5xl rounded-xl border p-4 shadow-sm relative overflow-hidden pl-5 ${
                    isUrgent
                        ? 'border-red-200 bg-red-50/80'
                        : 'border-slate-200 bg-slate-50'
                }`}
                role="status"
            >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUrgent ? 'bg-destructive' : 'bg-primary'}`} />

                <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background shadow-sm border border-border/40 ${isUrgent ? 'text-destructive' : 'text-primary'}`}>
                        <CalendarCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-foreground tracking-tight">
                            {upcoming.length === 1
                                ? 'Un devoir approche'
                                : `${upcoming.length} devoirs planifiés bientôt`}
                        </p>
                        <ul className="mt-1.5 space-y-1">
                            {upcoming.slice(0, 3).map(a => (
                                <li key={`${a.classId}-${a.id}`} className="text-xs text-muted-foreground font-medium">
                                    <span className="font-extrabold text-foreground">{a.className}</span> — {a.label.split(' — ')[0]}
                                    {' '}<span className={isUrgent && a.inDays <= 3 ? 'font-black text-destructive' : 'text-muted-foreground/80 font-bold'}>{delayLabel(a.inDays)}</span>
                                    {a.fenetre && <span className="text-muted-foreground/50"> · officiellement {a.fenetre}</span>}
                                </li>
                            ))}
                            {upcoming.length > 3 && (
                                <li className="text-[11px] text-muted-foreground/50 font-bold">+{upcoming.length - 3} autre(s)…</li>
                            )}
                        </ul>
                        <p className="mt-1.5 text-[10px] text-muted-foreground/60 font-semibold">
                            Dates indicatives du planning officiel — ajustez-les dans Configuration ▸ Emploi du temps.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismiss}
                        className="ml-2 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground transition-all duration-200 cursor-pointer border border-transparent hover:border-border/40"
                        aria-label="Masquer jusqu'à demain"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

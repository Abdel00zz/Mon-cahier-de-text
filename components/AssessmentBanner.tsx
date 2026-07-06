import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '../types';
import { useUpcomingAssessments } from '../hooks/useAssessments';
import { todayInMorocco } from '../utils/calendar';
import { CalendarCheck, X } from './ui/icons';

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
                className={`mx-auto mb-4 max-w-5xl rounded-2xl border p-4 shadow-sm ${
                    isUrgent ? 'border-[#C96442]/30 bg-[#FDF2ED]' : 'border-[#B8935A]/30 bg-[#FFFDF7]'
                }`}
                role="status"
            >
                <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${isUrgent ? 'text-[#C96442]' : 'text-[#B8935A]'}`}>
                        <CalendarCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#2B241D]">
                            {upcoming.length === 1
                                ? 'Un devoir approche'
                                : `${upcoming.length} devoirs planifiés bientôt`}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                            {upcoming.slice(0, 3).map(a => (
                                <li key={`${a.classId}-${a.id}`} className="text-xs text-[#69604F]">
                                    <span className="font-semibold text-[#2B241D]">{a.className}</span> — {a.label.split(' — ')[0]}
                                    {' '}<span className={isUrgent && a.inDays <= 3 ? 'font-bold text-[#C96442]' : 'text-[#69604F]/80'}>{delayLabel(a.inDays)}</span>
                                    {a.fenetre && <span className="text-[#A79C87]"> · officiellement {a.fenetre}</span>}
                                </li>
                            ))}
                            {upcoming.length > 3 && (
                                <li className="text-[11px] text-[#A79C87]">+{upcoming.length - 3} autre(s)…</li>
                            )}
                        </ul>
                        <p className="mt-1 text-[10px] text-[#A79C87]">
                            Dates indicatives du planning officiel — ajustez-les dans Configuration ▸ Emploi du temps.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A79C87] transition-all hover:bg-white hover:text-[#2B241D] cursor-pointer"
                        aria-label="Masquer jusqu'à demain"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useUpcomingAssessments } from '@/hooks/useAssessments';
import { useUpcomingOfficialStudentEvents } from '@/hooks/useOfficialStudentEvents';
import { todayInMorocco } from '@/utils/calendar';
import { CalendarCheck, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

const SNOOZE_KEY = 'assessmentSnooze_v1';

interface AssessmentBannerProps {
    classes: ClassInfo[];
    config: AppConfig;
}

const delayLabel = (inDays: number): string => {
    if (inDays === 0) return "aujourd'hui";
    if (inDays === 1) return 'demain';
    return `dans ${inDays} jours`;
};
/** Une seule bannière relie les devoirs indicatifs et les jalons officiels sans confondre leurs sources. */
export const AssessmentBanner: React.FC<AssessmentBannerProps> = ({ classes, config }) => {
    const upcoming = useUpcomingAssessments(classes, config, 14);
    const officialUpcoming = useUpcomingOfficialStudentEvents(classes, 30);
    const [dismissed, setDismissed] = useState(false);

    React.useEffect(() => {
        try {
            const until = localStorage.getItem(SNOOZE_KEY);
            setDismissed(!!until && until >= todayInMorocco());
        } catch {
            setDismissed(false);
        }
    }, [officialUpcoming.length, upcoming.length]);

    if ((upcoming.length === 0 && officialUpcoming.length === 0) || dismissed) return null;

    const handleDismiss = () => {
        try {
            localStorage.setItem(SNOOZE_KEY, todayInMorocco());
        } catch { /* stockage plein */ }
        setDismissed(true);
    };

    const nearestDays = Math.min(
        upcoming[0]?.inDays ?? Number.POSITIVE_INFINITY,
        officialUpcoming[0]?.inDays ?? Number.POSITIVE_INFINITY,
    );
    const isUrgent = nearestDays <= 3;
    const visibleAssessments = upcoming.slice(0, 2);
    const visibleOfficial = officialUpcoming.slice(0, Math.max(1, 3 - visibleAssessments.length));
    const hiddenCount = Math.max(0, upcoming.length + officialUpcoming.length - visibleAssessments.length - visibleOfficial.length);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`relative mx-auto mb-4 max-w-5xl overflow-hidden rounded-xl border p-4 pl-5 shadow-sm ${
                    isUrgent ? 'border-red-200 bg-red-50/80' : 'border-slate-200 bg-slate-50'
                }`}
                role="status"
            >
                <div className={`absolute inset-y-0 left-0 w-1.5 ${isUrgent ? 'bg-destructive' : 'bg-primary'}`} />
                <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background shadow-sm ${isUrgent ? 'text-destructive' : 'text-primary'}`}>
                        <CalendarCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold tracking-tight text-foreground">Évaluations et échéances à préparer</p>
                        <ul className="mt-1.5 space-y-1">
                            {visibleAssessments.map(item => (
                                <li key={`${item.classId}-${item.id}`} className="text-xs font-medium text-muted-foreground">
                                    <span className="font-extrabold text-foreground">{formatClassDisplayName(item.className)}</span> — {item.label.split(' — ')[0]}
                                    {' '}<span className={isUrgent && item.inDays <= 3 ? 'font-black text-destructive' : 'font-bold text-muted-foreground/80'}>{delayLabel(item.inDays)}</span>
                                </li>
                            ))}
                            {visibleOfficial.map(item => (
                                <li key={`official-${item.event.id}`} className="text-xs font-medium text-muted-foreground">
                                    <span className="mr-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">Officiel</span>
                                    <span className="font-extrabold text-foreground">{item.event.title}</span>
                                    {' '}<span className={isUrgent && item.inDays <= 3 ? 'font-black text-destructive' : 'font-bold text-muted-foreground/80'}>{delayLabel(item.inDays)}</span>
                                    <span className="text-muted-foreground/50"> · {item.classNames.slice(0, 3).map(formatClassDisplayName).join(', ')}{item.classNames.length > 3 ? '…' : ''}</span>
                                </li>
                            ))}
                            {hiddenCount > 0 && <li className="text-[11px] font-bold text-muted-foreground/50">+{hiddenCount} autre(s)…</li>}
                        </ul>
                        <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground/60">
                            Les devoirs sont indicatifs et modifiables. Les jalons « Officiel » proviennent du bulletin publié par l'administration.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismiss}
                        className="ml-2 h-8 w-8 shrink-0 rounded-full border border-transparent text-muted-foreground transition-all hover:border-border/40 hover:bg-background hover:text-foreground"
                        aria-label="Masquer jusqu'à demain"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

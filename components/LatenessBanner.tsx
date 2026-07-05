import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '../types';
import { useLateness } from '../hooks/useLateness';
import { todayInMorocco } from '../utils/calendar';
import { Bell, X } from './ui/icons';

const SNOOZE_KEY = 'latenessSnooze_v1';

const SEVERITY_STYLE: Record<string, { bg: string; border: string; icon: string }> = {
    notice: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' },
};

interface LatenessBannerProps {
    classes: ClassInfo[];
    config: AppConfig;
}

export const LatenessBanner: React.FC<LatenessBannerProps> = ({ classes, config }) => {
    const summary = useLateness(classes, config);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // reste masquée jusqu'au prochain jour de classe si l'utilisateur l'a fermée aujourd'hui
        try {
            const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
            const today = todayInMorocco();
            setDismissed(!!snoozeUntil && snoozeUntil >= today);
        } catch {
            setDismissed(false);
        }
    }, [summary]);

    if (!summary || dismissed) return null;

    const style = SEVERITY_STYLE[summary.severity] ?? SEVERITY_STYLE.notice;

    const handleDismiss = () => {
        try {
            localStorage.setItem(SNOOZE_KEY, todayInMorocco());
        } catch {
            // stockage plein : la bannière réapparaîtra, sans gravité
        }
        setDismissed(true);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mx-auto mb-5 flex max-w-5xl items-start gap-3 rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm`}
                role="status"
            >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ${style.icon} shadow-sm`}>
                    <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{summary.title}</p>
                    <p className="text-sm text-slate-600">{summary.body}</p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                    aria-label="Masquer jusqu'au prochain jour de classe"
                >
                    <X className="h-4 w-4" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

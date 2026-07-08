import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '../types';
import { useLateness } from '../hooks/useLateness';
import { todayInMorocco } from '../utils/calendar';
import { Bell, X, TriangleAlert, CircleAlert } from './ui/icons';
import { Button } from './ui/button';

const SNOOZE_KEY = 'latenessSnooze_v1';

/* Échelle unique de sévérité (tokens du design system) :
   notice = primaire (information), warning = --warning, critical = --destructive. */
const SEVERITY_STYLE: Record<string, { bg: string; border: string; iconColor: string; accentColor: string; icon: React.ComponentType<{ className?: string }> }> = {
    notice: {
        bg: 'bg-primary/5',
        border: 'border-primary/20',
        iconColor: 'text-primary',
        accentColor: 'bg-primary',
        icon: Bell
    },
    warning: {
        bg: 'bg-warning/5',
        border: 'border-warning/25',
        iconColor: 'text-warning',
        accentColor: 'bg-warning',
        icon: TriangleAlert
    },
    critical: {
        bg: 'bg-destructive/5',
        border: 'border-destructive/25',
        iconColor: 'text-destructive',
        accentColor: 'bg-destructive',
        icon: CircleAlert
    },
};

interface LatenessBannerProps {
    classes: ClassInfo[];
    config: AppConfig;
}

export const LatenessBanner: React.FC<LatenessBannerProps> = ({ classes, config }) => {
    const summary = useLateness(classes, config);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        try {
            const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
            const today = todayInMorocco();
            setDismissed(!!snoozeUntil && snoozeUntil >= today);
        } catch {
            setDismissed(false);
        }
    }, [summary]);

    if (!summary || summary.severity === 'ok' || dismissed) return null;

    const style = SEVERITY_STYLE[summary.severity] ?? SEVERITY_STYLE.notice;
    const Icon = style.icon;

    const handleDismiss = () => {
        try {
            localStorage.setItem(SNOOZE_KEY, todayInMorocco());
        } catch { /* storage fallback */ }
        setDismissed(true);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mx-auto mb-5 flex max-w-5xl items-start gap-3 rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm relative overflow-hidden pl-5`}
                role="status"
            >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.accentColor}`} />
                
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background ${style.iconColor} shadow-sm border border-border/40`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-foreground tracking-tight">{summary.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-semibold leading-relaxed">{summary.body}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="ml-2 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground transition-all duration-200 cursor-pointer border border-transparent hover:border-border/40"
                    aria-label="Masquer jusqu'au prochain jour de classe"
                >
                    <X className="h-4 w-4" />
                </Button>
            </motion.div>
        </AnimatePresence>
    );
};

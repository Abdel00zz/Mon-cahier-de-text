import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, LayoutDashboard, CalendarCheck, Settings, X, CircleHelp, ArrowLeft, ArrowRight } from './ui/icons';

/** Vues internes du hub : classes (accueil), suivi (indicateurs), devoirs (calendrier DS/DM). */
export type HubView = 'classes' | 'suivi' | 'devoirs';

interface AppSidebarProps {
    view: HubView;
    onViewChange: (view: HubView) => void;
    onOpenSettings: () => void;
    onOpenAccount: () => void;
    onOpenGuide?: () => void;
    teacherName: string;
    /** année scolaire courante (ex. « 2026-2027 ») */
    yearLabel: string;
    /** drawer mobile ouvert ? (ignoré ≥ lg : la sidebar y est fixe) */
    mobileOpen: boolean;
    onMobileClose: () => void;
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
}

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PR';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* Libellés VOLONTAIREMENT courts et ciblés : un mot-clé par destination. */
const NAV_ITEMS: { view: HubView; label: string; hint: string; icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }> }[] = [
    { view: 'classes', label: 'Mes classes', hint: 'Cahiers de textes', icon: BookOpen },
    { view: 'suivi', label: 'Tableau de bord', hint: 'Progression & séances', icon: LayoutDashboard },
    { view: 'devoirs', label: 'Devoirs', hint: 'Calendrier DS & maison', icon: CalendarCheck },
];

/**
 * Sidebar du hub (esprit app mobile) : navigation entre les trois vues du
 * tableau de bord + accès Paramètres. Fixe sur desktop, drawer sur mobile.
 * Chaque entrée est un simple changement de vue — AUCUN rechargement,
 * les données restent montées (performance).
 */
export const AppSidebar: React.FC<AppSidebarProps> = ({
    view,
    onViewChange,
    onOpenSettings,
    onOpenAccount,
    onOpenGuide,
    teacherName,
    yearLabel,
    mobileOpen,
    onMobileClose,
    collapsed,
    onCollapsedChange,
}) => {
    const isCompact = collapsed && !mobileOpen;
    const content = (
        <div className="flex h-full flex-col">
            {/* Identité : avatar + nom + raccourci compte */}
            <button
                type="button"
                onClick={onOpenAccount}
                className={`group flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sidebar-accent ${isCompact ? 'justify-center px-1.5' : ''}`}
                title="Ouvrir mon compte"
            >
                <div className="relative shrink-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-black text-sidebar-primary-foreground shadow-sm">
                        {getInitials(teacherName)}
                    </span>
                    {/* Tiny premium green online badge */}
                    <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
                </div>
                <span className={`min-w-0 ${isCompact ? 'sr-only' : ''}`}>
                    <span className="block truncate text-xs font-semibold text-sidebar-foreground leading-tight">
                        {teacherName || 'Professeur'}
                    </span>
                    <span className="block text-[10px] font-medium text-muted-foreground group-hover:text-primary transition-colors leading-none mt-0.5">
                        Mon compte
                    </span>
                </span>
            </button>

            {/* Navigation principale */}
            <nav className="mt-4 flex-1 space-y-0.5" aria-label="Navigation du tableau de bord">
                {NAV_ITEMS.map(item => {
                    const active = view === item.view;
                    return (
                        <button
                            key={item.view}
                            type="button"
                            onClick={() => { onViewChange(item.view); onMobileClose(); }}
                            aria-current={active ? 'page' : undefined}
                            title={item.hint}
                            className={`group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer ${isCompact ? 'justify-center px-1.5' : ''} ${
                                active
                                    ? 'text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                        >
                            {/* Animated sliding background pill for active state */}
                            {active && (
                                <motion.div
                                    layoutId="active-sidebar-pill"
                                    className="absolute inset-0 rounded-xl bg-sidebar-accent ring-1 ring-primary/15"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}
                            <item.icon 
                                className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                                }`} 
                                strokeWidth={active ? 2.2 : 1.5}
                            />
                            <span className={`relative z-10 truncate ${isCompact ? 'sr-only' : ''}`}>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Pied : année scolaire + Guide + Paramètres */}
            <div className="space-y-0.5 border-t border-sidebar-border pt-3">
                {onOpenGuide && (
                    <button
                        type="button"
                        onClick={() => { onOpenGuide(); onMobileClose(); }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
                    >
                        <CircleHelp className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                        Guide d'utilisation
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => { onOpenSettings(); onMobileClose(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
                >
                    <Settings className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                    Paramètres
                </button>
                <p className="px-2.5 pt-2 text-[10px] font-medium tracking-tight text-muted-foreground font-mono">
                    Année scolaire : {yearLabel}
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop : colonne fixe */}
            <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground shadow-sm transition-[width] duration-300 lg:flex print:hidden ${collapsed ? 'w-[4.5rem]' : 'w-60'}`}>
                <button type="button" onClick={() => onCollapsedChange(!collapsed)} className="mb-3 flex h-8 w-full items-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary" aria-label={collapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'} title={collapsed ? 'Développer' : 'Réduire'}>
                    {collapsed ? <ArrowRight className="mx-auto h-4 w-4" /> : <><ArrowLeft className="h-4 w-4" /><span className="ml-2 text-[10px] font-bold uppercase tracking-wider">Réduire</span></>}
                </button>
                {content}
            </aside>

            {/* Mobile : drawer + voile */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] animate-fade-in" onClick={onMobileClose} />
                    <div className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col bg-sidebar p-3 text-sidebar-foreground shadow-xl animate-slide-in-left">
                        <button
                            type="button"
                            onClick={onMobileClose}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                            aria-label="Fermer le menu"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {content}
                    </div>
                </div>
            )}
        </>
    );
};

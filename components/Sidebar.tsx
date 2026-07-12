import React, { useState } from 'react';
import { Home, Settings, LayoutDashboard, Menu, Search, X, BookOpen, Calendar, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClassInfo } from '../types';

interface SidebarProps {
    view: 'dashboard' | 'parcourir' | 'editor' | 'settings';
    onNavigate: (view: 'dashboard' | 'parcourir' | 'settings') => void;
    activeClass?: ClassInfo | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, onNavigate, activeClass }) => {
    const [collapsed, setCollapsed] = useState(false);
    
    // Si nous ne sommes pas sur le dashboard, on ne l'affiche pas selon la demande,
    // mais on gérera ça au niveau de App.tsx pour ne pas perturber l'arbre de rendu ici.
    // L'instruction dit "le side bar s'affiche seulement dans l'interface principale"

    return (
        <aside 
            className={cn(
                "hidden md:flex flex-col bg-white transition-all duration-300 relative z-20 border-r border-neutral-100",
                collapsed ? "w-[60px]" : "w-[200px]"
            )}
        >
            {/* User Profile */}
            <div className={cn("p-4 flex items-center gap-2.5 border-b border-neutral-50 mb-2", collapsed ? "justify-center px-2" : "")}>
                <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                   <span className="text-neutral-500 font-bold text-xs">PR</span>
                </div>
                {!collapsed && (
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-neutral-900 leading-tight truncate">Professeur</span>
                        <span className="text-[10px] text-neutral-400 hover:text-primary cursor-pointer transition-colors truncate">Mon compte</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2.5 py-1 space-y-1 overflow-y-auto">
                <SidebarItem 
                    icon={<BookOpen className="w-[18px] h-[18px]" strokeWidth={2.5} />}
                    label="Parcourir"
                    active={view === 'parcourir'} // Classes view
                    collapsed={collapsed}
                    onClick={() => onNavigate('parcourir')}
                />
                <SidebarItem 
                    icon={<LayoutDashboard className="w-[18px] h-[18px]" strokeWidth={2.5} />}
                    label="Tableau de bord"
                    active={view === 'dashboard'} // Stats view
                    collapsed={collapsed}
                    onClick={() => onNavigate('dashboard')}
                />
                <SidebarItem 
                    icon={<Calendar className="w-[18px] h-[18px]" strokeWidth={2.5} />}
                    label="Calendrier des devoirs"
                    active={false}
                    collapsed={collapsed}
                    onClick={() => {}}
                />
            </nav>

            {/* Settings at bottom */}
            <div className="px-2.5 pb-3 mt-auto">
                <SidebarItem 
                    icon={<Settings className="w-[18px] h-[18px]" strokeWidth={2.5} />}
                    label="Paramètres"
                    active={view === 'settings'}
                    collapsed={collapsed}
                    onClick={() => onNavigate('settings')}
                />
            </div>

            {/* Collapse toggle */}
            <button 
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 shadow-sm transition-all focus:outline-none"
            >
                {collapsed ? <Menu className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </button>
        </aside>
    );
};

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    collapsed?: boolean;
    onClick: () => void;
    className?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, collapsed, onClick, className }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors font-semibold text-[13.5px]",
                active 
                    ? "bg-transparent text-neutral-900" 
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
                collapsed && "justify-center px-0",
                className
            )}
            title={collapsed ? label : undefined}
        >
            <span className={cn(
                "flex items-center justify-center shrink-0",
                active ? "text-neutral-900" : "text-neutral-400"
            )}>
                {icon}
            </span>
            {!collapsed && (
                <span className="truncate">{label}</span>
            )}
        </button>
    );
};


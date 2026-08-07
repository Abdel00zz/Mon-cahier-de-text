import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { NextSessionInfo } from '@/utils/timetable';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Trash2, Settings, BookOpen, Users } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface ClassCardProps {
    classInfo: ClassInfo;
    lastModified: string | null | undefined;
    nextSession?: NextSessionInfo | null;
    onSelect: () => void;
    onDelete: () => void;
    onConfigure: () => void;
}

const containsArabic = (text: string): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
};

const formatSuperscript = (text: string) => {
    const parts = text.split(/(\d+(?:er|ere|eme|ère|ème))/);
    return parts.map((part, idx) => {
        if (part.endsWith('er')) return <span key={idx}>{part.slice(0, -2)}<sup>er</sup></span>;
        if (part.endsWith('ere')) return <span key={idx}>{part.slice(0, -3)}<sup>ere</sup></span>;
        if (part.endsWith('eme')) return <span key={idx}>{part.slice(0, -3)}<sup>eme</sup></span>;
        if (part.endsWith('ère')) return <span key={idx}>{part.slice(0, -3)}<sup>ère</sup></span>;
        if (part.endsWith('ème')) return <span key={idx}>{part.slice(0, -3)}<sup>ème</sup></span>;
        return part;
    });
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Vierge';
    try {
        const date = new Date(dateString);
        const corrected = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return corrected.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
        return '---';
    }
};

const CYCLE_BADGES: Record<string, { label: string; style: string }> = {
    college: { label: 'Collège', style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
    lycee: { label: 'Lycée', style: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
    prepa: { label: 'Prépa', style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
};

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, lastModified, nextSession, onSelect, onDelete, onConfigure }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { impact } = useHapticFeedback();

    const handleDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        impact('medium');
        setConfirmDelete(true);
    };

    const handleConfigureClick = (e: MouseEvent) => {
        e.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleCardClick = () => {
        impact('light');
        onSelect();
    };

    const displayName = formatClassDisplayName(classInfo.name);
    
    let mainName = displayName;
    let groupNum = '';
    if (displayName.includes(' · Gr. ')) {
        const parts = displayName.split(' · Gr. ');
        mainName = parts[0];
        groupNum = parts[1];
    }

    const isArabic = containsArabic(mainName);
    const cycleBadge = classInfo.cycle ? CYCLE_BADGES[classInfo.cycle] : null;

    return (
        <div
            onClick={handleCardClick}
            className="card-press group relative flex min-h-[140px] cursor-pointer flex-col overflow-hidden rounded-[24px] border border-border bg-card text-card-foreground shadow-2xs transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 sm:min-h-[155px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
        >
            <div className="p-4 sm:p-5 flex-1 flex flex-col">
                {/* Top Row: Badges + Quick Actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {cycleBadge && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${cycleBadge.style}`}>
                                {cycleBadge.label}
                            </span>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                        <button
                            onClick={handleConfigureClick}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title="Modifier"
                            aria-label={`Modifier ${displayName}`}
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            title="Supprimer"
                            aria-label={`Supprimer ${displayName}`}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Class Title */}
                <div className="flex-1 flex flex-col items-center justify-center text-center mt-1 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2.5 text-primary">
                        <Users className="w-5 h-5" />
                    </div>
                    <h3
                        className={`text-sm sm:text-base font-bold text-foreground transition-colors group-hover:text-primary tracking-tight ${isArabic ? 'font-ar text-sm' : 'font-display'}`}
                        title={displayName}
                    >
                        {formatSuperscript(mainName)}
                        {groupNum && (
                            <span className="font-itim text-lg text-primary ml-1.5 opacity-90">{groupNum}</span>
                        )}
                    </h3>
                </div>
            </div>

            {/* Bottom info footer */}
            <div className="mt-auto border-t border-border/40 bg-zinc-50/80 dark:bg-zinc-900/40 px-4 py-2.5 sm:px-5 flex items-center justify-between rounded-b-[24px]">
                <div className="min-w-0 pr-2 flex items-center gap-2">
                    <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            nextSession?.kind === 'now'
                                ? 'bg-emerald-500 animate-pulse'
                                : nextSession
                                ? 'bg-[#007AFF]'
                                : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                    />
                    <div className="min-w-0 flex flex-col justify-center gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 leading-none">Prochaine séance</span>
                        <span className={`truncate text-[11px] font-bold leading-none ${nextSession?.kind === 'now' ? 'text-emerald-600 dark:text-emerald-400' : nextSession ? 'text-[#007AFF] dark:text-blue-400' : 'text-muted-foreground/70'}`}>
                            {nextSession?.label ?? 'Horaire à définir'}
                        </span>
                    </div>
                </div>

                <div className="shrink-0 flex flex-col justify-center text-right gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 leading-none">Dernière saisie</span>
                    <span className="font-mono text-[11px] font-medium text-muted-foreground/80 leading-none">{formatDate(lastModified)}</span>
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={`Supprimer « ${displayName} » ?`}
                description="Cette action est irréversible : tous les cours de cette classe seront définitivement supprimés."
                confirmLabel="Supprimer"
                onConfirm={onDelete}
            />
        </div>
    );
};

export const ClassCard = memo(ClassCardComponent);


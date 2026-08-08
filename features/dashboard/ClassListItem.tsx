import { FC, KeyboardEvent, MouseEvent, useState } from 'react';
import { ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { NextSessionInfo } from '@/utils/timetable';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChevronRight, Settings, Trash2, Users } from '@/components/ui/icons';

interface ClassListItemProps {
    classInfo: ClassInfo;
    lastModified: string | null | undefined;
    nextSession?: NextSessionInfo | null;
    onSelect: () => void;
    onDelete: () => void;
    onConfigure: () => void;
}

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

export const ClassListItem: FC<ClassListItemProps> = ({ classInfo, lastModified, nextSession, onSelect, onDelete, onConfigure }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const displayName = formatClassDisplayName(classInfo.name);
    const visual = getClassVisual(classInfo.name);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
        }
    };
    const stopAnd = (event: MouseEvent, action: () => void) => {
        event.stopPropagation();
        action();
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className="group relative flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[20px] border border-border bg-card text-card-foreground px-4 py-3 shadow-2xs transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-h-[58px]"
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${visual.iconSurfaceClass}`} aria-hidden>
                <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 sm:text-sm">{displayName}</h3>
                    {classInfo.subject && (
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {classInfo.subject}
                        </span>
                    )}
                </div>
                <p className={`mt-0.5 truncate text-[11px] font-semibold sm:text-xs ${nextSession?.kind === 'now' ? 'text-emerald-600 dark:text-emerald-400' : nextSession ? 'text-[#007AFF] dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {nextSession?.label ?? 'Horaire à compléter'}
                </p>
            </div>

            <div className="hidden shrink-0 border-l border-zinc-100 dark:border-zinc-800 pl-3 text-right sm:block">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Mis à jour</span>
                <span className="mt-0.5 block font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-400">{formatDate(lastModified)}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                    type="button"
                    onClick={(event) => stopAnd(event, onConfigure)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 active:scale-95"
                    aria-label={`Modifier ${displayName}`}
                >
                    <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={(event) => stopAnd(event, () => setConfirmDelete(true))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 active:scale-95"
                    aria-label={`Supprimer ${displayName}`}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 sm:ml-0.5" aria-hidden />
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

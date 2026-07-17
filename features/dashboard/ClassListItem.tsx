import { FC, KeyboardEvent, MouseEvent, useState } from 'react';
import { ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { NextSessionInfo } from '@/utils/timetable';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChevronRight, GraduationCap, Settings, Trash2 } from '@/components/ui/icons';

interface ClassListItemProps {
    classInfo: ClassInfo;
    lastModified: string | null | undefined;
    nextSession?: NextSessionInfo | null;
    onSelect: () => void;
    onDelete: () => void;
    onConfigure: () => void;
}

const ACCENTS = [
    'border-blue-200 bg-blue-50 text-blue-600',
    'border-violet-200 bg-violet-50 text-violet-600',
    'border-emerald-200 bg-emerald-50 text-emerald-600',
    'border-amber-200 bg-amber-50 text-amber-600',
    'border-rose-200 bg-rose-50 text-rose-600',
    'border-cyan-200 bg-cyan-50 text-cyan-600',
] as const;

const accentFor = (classId: string) => {
    const hash = Array.from(classId).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
    return ACCENTS[hash % ACCENTS.length];
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

export const ClassListItem: FC<ClassListItemProps> = ({ classInfo, lastModified, nextSession, onSelect, onDelete, onConfigure }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const displayName = formatClassDisplayName(classInfo.name);
    const accent = accentFor(classInfo.id);

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
            className="group relative flex min-h-16 cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-zinc-300 hover:shadow-[0_7px_18px_rgba(0,0,0,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-h-[68px] sm:gap-3 sm:px-3"
        >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-9 sm:w-9 ${accent}`}>
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate font-display text-[11px] font-bold text-zinc-800 sm:text-[13px]">{displayName}</h3>
                    {classInfo.subject && (
                        <span className="max-w-[6.5rem] truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.05em] text-zinc-500 sm:max-w-[9rem] sm:text-[8px]">
                            {classInfo.subject}
                        </span>
                    )}
                </div>
                <p className={`mt-0.5 truncate text-[9px] font-semibold sm:text-[10px] ${nextSession?.kind === 'now' ? 'text-emerald-600' : nextSession ? 'text-primary' : 'text-zinc-400'}`}>
                    {nextSession?.label ?? 'Horaire à compléter'}
                </p>
            </div>

            <div className="hidden shrink-0 border-l border-zinc-100 pl-3 text-right sm:block">
                <span className="block text-[7px] font-semibold uppercase tracking-[0.07em] text-zinc-400">Mis à jour</span>
                <span className="mt-0.5 block font-mono text-[9px] font-bold text-zinc-500">{formatDate(lastModified)}</span>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                    type="button"
                    onClick={(event) => stopAnd(event, onConfigure)}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label={`Modifier ${displayName}`}
                >
                    <Settings className="h-2.5 w-2.5" />
                </button>
                <button
                    type="button"
                    onClick={(event) => stopAnd(event, () => setConfirmDelete(true))}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Supprimer ${displayName}`}
                >
                    <Trash2 className="h-2.5 w-2.5" />
                </button>
                <ChevronRight className="h-3 w-3 text-zinc-300 sm:ml-0.5" aria-hidden />
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

import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { NextSessionInfo } from '@/utils/timetable';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Trash2, Settings, GraduationCap } from '@/components/ui/icons';

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

const CLASS_ICON_STYLES = [
    { shell: 'border-blue-200 bg-blue-50', icon: 'text-blue-600', glow: 'bg-blue-400/15' },
    { shell: 'border-violet-200 bg-violet-50', icon: 'text-violet-600', glow: 'bg-violet-400/15' },
    { shell: 'border-emerald-200 bg-emerald-50', icon: 'text-emerald-600', glow: 'bg-emerald-400/15' },
    { shell: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', glow: 'bg-amber-400/15' },
    { shell: 'border-rose-200 bg-rose-50', icon: 'text-rose-600', glow: 'bg-rose-400/15' },
    { shell: 'border-cyan-200 bg-cyan-50', icon: 'text-cyan-600', glow: 'bg-cyan-400/15' },
] as const;

const classIconStyle = (classId: string) => {
    const hash = Array.from(classId).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
    return CLASS_ICON_STYLES[hash % CLASS_ICON_STYLES.length];
};

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, lastModified, nextSession, onSelect, onDelete, onConfigure }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete(true);
    };

    const handleConfigureClick = (e: MouseEvent) => {
        e.stopPropagation();
        onConfigure();
    };

    const displayName = formatClassDisplayName(classInfo.name);
    const isArabic = containsArabic(displayName);
    const iconStyle = classIconStyle(classInfo.id);

    return (
        <div
            onClick={() => onSelect()}
            className="group relative flex min-h-[148px] cursor-pointer flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),_0_1px_2px_rgba(0,0,0,0.03)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:min-h-[190px] sm:rounded-xl"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        >
            {classInfo.subject && (
                <span
                    className="absolute left-2 top-2 z-20 max-w-[calc(100%-4.25rem)] truncate rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[7px] font-semibold uppercase tracking-[0.05em] text-zinc-500 transition-colors group-hover:border-zinc-300 sm:left-3 sm:top-3 sm:max-w-[calc(100%-6rem)] sm:px-2 sm:text-[8px] sm:tracking-[0.06em]"
                    title={classInfo.subject}
                >
                    {classInfo.subject}
                </span>
            )}

            {/* Quick Actions (Hover) */}
            <div className="absolute right-2 top-2 z-20 flex items-center gap-1 opacity-55 transition-opacity duration-200 hover:opacity-100 sm:right-3 sm:top-2.5 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                    onClick={handleConfigureClick}
                  className="flex h-4 w-4 items-center justify-center rounded text-zinc-400 transition-colors active:scale-[0.96] hover:bg-zinc-100 hover:text-zinc-700 sm:h-5 sm:w-5 md:h-4 md:w-4"
                    title="Modifier"
                >
                    <Settings size={8} />
                </button>
                <button
                    onClick={handleDeleteClick}
                  className="flex h-4 w-4 items-center justify-center rounded text-zinc-400 transition-colors active:scale-[0.96] hover:bg-red-50 hover:text-red-600 sm:h-5 sm:w-5 md:h-4 md:w-4"
                    title="Supprimer"
                >
                    <Trash2 size={8} />
                </button>
            </div>

            <div className="relative z-10 flex min-h-[144px] w-full flex-1 flex-col sm:min-h-[186px]">
                <div className="flex flex-1 flex-col items-center justify-center px-2 pb-2 pt-9 sm:px-4 sm:pb-3 sm:pt-11">
                    <div className={`relative mb-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md sm:mb-2.5 sm:h-10 sm:w-10 sm:rounded-lg ${iconStyle.shell} ${iconStyle.icon}`}>
                        <span aria-hidden className={`absolute -right-2.5 -top-2.5 h-6 w-6 rounded-full sm:h-7 sm:w-7 ${iconStyle.glow}`} />
                        <GraduationCap className="relative h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                    </div>

                    <h3
                        className={`max-w-full text-center text-[10px] font-bold leading-[1.2] text-zinc-800 transition-colors group-hover:text-primary sm:text-[12px] sm:leading-snug ${isArabic ? 'font-ar text-[13px] sm:text-base' : 'font-display'}`}
                        title={displayName}
                    >
                        {formatSuperscript(displayName)}
                    </h3>

                </div>

                <div className="mt-auto grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5 border-t border-zinc-100 bg-zinc-50/50 px-2 pb-2 pt-1.5 transition-colors group-hover:bg-zinc-50/80 sm:gap-3 sm:px-4 sm:pb-3 sm:pt-2.5">
                    <span className="min-w-0 text-left">
                        <span className="block text-[6px] font-semibold uppercase tracking-[0.05em] text-zinc-400 sm:text-[7px] sm:tracking-[0.08em]">Prochaine séance</span>
                        <span className={`mt-0.5 block truncate text-[8px] font-bold sm:text-[9px] ${nextSession?.kind === 'now' ? 'text-emerald-600' : nextSession ? 'text-primary' : 'text-zinc-400'}`}>
                            {nextSession?.label ?? 'Horaire à compléter'}
                        </span>
                    </span>
                    <span className="shrink-0 text-right">
                        <span className="block text-[6px] font-semibold uppercase tracking-[0.05em] text-zinc-400 sm:text-[7px] sm:tracking-[0.08em]">Mise à jour</span>
                        <span className="mt-0.5 block font-mono text-[7px] font-bold text-zinc-500 sm:text-[8px]">{formatDate(lastModified)}</span>
                    </span>
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

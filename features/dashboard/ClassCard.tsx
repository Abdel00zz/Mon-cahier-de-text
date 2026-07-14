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
            className="group relative flex min-h-[172px] cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),_0_1px_2px_rgba(0,0,0,0.03)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:min-h-[190px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        >
            {classInfo.subject && (
                <span
                    className="absolute left-3 top-3 z-20 max-w-[calc(100%-6.5rem)] truncate rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-[0.06em] text-zinc-500 transition-colors group-hover:border-zinc-300"
                    title={classInfo.subject}
                >
                    {classInfo.subject}
                </span>
            )}

            {/* Quick Actions (Hover) */}
            <div className="absolute right-3 top-2.5 z-20 flex items-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                    onClick={handleConfigureClick}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors border border-zinc-200 shadow-sm"
                    title="Modifier"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-zinc-200 shadow-sm"
                    title="Supprimer"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="relative z-10 flex min-h-[168px] w-full flex-1 flex-col sm:min-h-[186px]">
                <div className="flex flex-1 flex-col items-center justify-center px-4 pb-3 pt-12 sm:pt-11">
                    <div className={`relative mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md ${iconStyle.shell} ${iconStyle.icon}`}>
                        <span aria-hidden className={`absolute -right-3 -top-3 h-8 w-8 rounded-full ${iconStyle.glow}`} />
                        <GraduationCap className="relative h-[22px] w-[22px]" aria-hidden />
                    </div>

                    <h3
                        className={`max-w-full text-center text-[12px] font-bold leading-snug text-zinc-800 transition-colors group-hover:text-primary sm:text-[13px] ${isArabic ? 'font-ar text-lg' : 'font-display'}`}
                        title={displayName}
                    >
                        {formatSuperscript(displayName)}
                    </h3>

                </div>

                <div className="mt-auto grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-4 pb-3 pt-2.5 transition-colors group-hover:bg-zinc-50/80">
                    <span className="min-w-0 text-left">
                        <span className="block text-[8px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Prochaine séance</span>
                        <span className={`mt-0.5 block truncate text-[10px] font-bold ${nextSession?.kind === 'now' ? 'text-emerald-600' : nextSession ? 'text-primary' : 'text-zinc-400'}`}>
                            {nextSession?.label ?? 'Horaire à compléter'}
                        </span>
                    </span>
                    <span className="shrink-0 text-right">
                        <span className="block text-[8px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Mise à jour</span>
                        <span className="mt-0.5 block font-mono text-[9px] font-bold text-zinc-500">{formatDate(lastModified)}</span>
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

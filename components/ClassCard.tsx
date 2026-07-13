import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '../types';
import { NextSessionInfo } from '../utils/timetable';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Trash2, Settings, GraduationCap } from './ui/icons';

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

    const isArabic = containsArabic(classInfo.name);
    const iconStyle = classIconStyle(classInfo.id);

    return (
        <div
            onClick={() => onSelect()}
            className="group relative flex h-[180px] cursor-pointer flex-col justify-center items-center overflow-hidden rounded-xl bg-white p-6 transition-all duration-200 border border-slate-200 hover:border-slate-300 hover:shadow-md"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        >
            {/* Quick Actions (Hover) */}
            <div className="absolute top-3 right-3 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={handleConfigureClick}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
                    title="Modifier"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                    title="Supprimer"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center w-full">
                <div className={`relative mb-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md ${iconStyle.shell} ${iconStyle.icon}`}>
                    <span aria-hidden className={`absolute -right-3 -top-3 h-8 w-8 rounded-full ${iconStyle.glow}`} />
                    <GraduationCap className="relative h-[22px] w-[22px]" aria-hidden />
                </div>
                
                <h3 className={`text-base font-bold text-slate-800 text-center leading-tight transition-colors group-hover:text-primary ${isArabic ? 'font-ar text-lg' : 'font-display'}`}>
                    {formatSuperscript(classInfo.name)}
                </h3>
                
                {classInfo.subject && (
                    <span className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {classInfo.subject}
                    </span>
                )}
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={`Supprimer « ${classInfo.name} » ?`}
                description="Cette action est irréversible : tous les cours de cette classe seront définitivement supprimés."
                confirmLabel="Supprimer"
                onConfirm={onDelete}
            />
        </div>
    );
};

export const ClassCard = memo(ClassCardComponent);
export default ClassCard;

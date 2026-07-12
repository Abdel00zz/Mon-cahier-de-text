import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '../types';
import { NextSessionInfo } from '../utils/timetable';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Trash2, Settings, Book } from './ui/icons';

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
    return /[؀-ۿ]/.test(text);
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
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-200 mb-4 shadow-sm group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors duration-200">
                    <Book className="w-5 h-5" />
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

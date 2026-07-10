import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '../types';
import { NextSessionInfo } from '../utils/timetable';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Trash2, Clock, Bell, Settings, ChevronRight, Book } from './ui/icons';

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
            className="group relative flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-[1.75rem] bg-white p-6 sm:p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(82,121,111,0.2)] border-2 border-[#e8e4d9] hover:border-[#84a98c]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        >
            {/* Grid paper texture (Seyès / school notebook checkered format) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(132,169,140,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,169,140,0.07)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-0" />

            {/* Background Blob Effect */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-[#e8f0ec] to-[#f4f1ea] blur-3xl transition-transform duration-700 group-hover:scale-150 z-0"></div>

            {/* Quick Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                <button
                    onClick={handleConfigureClick}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-[#84a98c] backdrop-blur-md transition-all hover:bg-[#f4f1ea] hover:text-[#52796f] hover:scale-105 shadow-sm border border-[#e8e4d9]"
                    title="Modifier"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-[#84a98c] backdrop-blur-md transition-all hover:bg-[#fff3ec] hover:text-[#e76f51] hover:scale-105 shadow-sm border border-[#e8e4d9]"
                    title="Supprimer"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center py-4">
                <div className="mb-4">
                    <h3 className={`text-2xl sm:text-3xl font-black text-[#2f3e46] leading-tight transition-colors group-hover:text-[#52796f] ${isArabic ? 'font-ar text-[1.5rem]' : 'font-display'}`}>
                        {formatSuperscript(classInfo.name)}
                    </h3>
                    {classInfo.subject && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#f4f1ea] border border-[#e8e4d9] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#84a98c]">
                            <Book className="w-3 h-3" />
                            {classInfo.subject}
                        </span>
                    )}
                </div>

                {/* Session Status */}
                <div className="mt-2 flex items-center gap-2">
                    {nextSession?.kind === 'now' ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-[#fff3ec] px-4 py-2.5 border border-[#ffd6c2]">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e76f51] opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e76f51]" />
                            </span>
                            <span className="text-sm font-bold text-[#e76f51]">Séance en cours</span>
                        </div>
                    ) : nextSession ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-[#f4f1ea] px-4 py-2.5 border border-[#e8e4d9]">
                            <Bell className="w-4 h-4 text-[#84a98c]" />
                            <span className="text-sm font-bold text-[#52796f] truncate">{nextSession.label}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-2xl bg-[#fdfbf7] px-4 py-2.5 border border-[#e8e4d9]">
                            <Clock className="w-4 h-4 text-[#cad2c5]" />
                            <span className="text-sm font-bold text-[#84a98c]">En attente</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section - complete line spanning edge to edge */}
            <div className="relative z-10 flex items-center justify-between mt-6 pt-4 px-6 sm:px-8 -mx-6 sm:-mx-8 border-t-2 border-[#e8e4d9] bg-[#fdfbf7]/40 group-hover:bg-[#fdfbf7]/80 transition-colors duration-500 rounded-b-[1.6rem]">
                <div className="flex flex-col text-left">
                    <span className="text-[10px] font-semibold uppercase text-[#cad2c5] tracking-wider">Dernière Màj</span>
                    <span className="text-sm font-bold text-[#84a98c]">{formatDate(lastModified)}</span>
                </div>
                
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-transparent border-2 border-[#e8e4d9] text-[#52796f] transition-all duration-300 group-hover:bg-[#52796f] group-hover:text-white group-hover:border-[#52796f] shadow-sm">
                    <span className="text-xs sm:text-sm font-bold">Ouvrir</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </div>
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

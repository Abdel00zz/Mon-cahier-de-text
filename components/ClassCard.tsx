import { memo, MouseEvent, FC } from 'react';
import { ClassInfo } from '../types';
import { SUBJECT_ABBREV_MAP } from '../constants';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trash2, Clock, Bell, ArrowRight, Settings } from './ui/icons';

interface ClassCardProps {
    classInfo: ClassInfo;
    lastModified: string | null | undefined;
    nextSessionLabel?: string | null;
    onSelect: () => void;
    onDelete: () => void;
    onConfigure: () => void;
}

const containsArabic = (text: string): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
};

const formatSuperscript = (text: string) => {
    const parts = text.split(/(\d+(?:er|ère|ème))/);
    return parts.map((part, idx) => {
        if (part.endsWith('er'))   return <span key={idx}>{part.slice(0, -2)}<sup>er</sup></span>;
        if (part.endsWith('\u00e8re')) return <span key={idx}>{part.slice(0, -3)}<sup>\u00e8re</sup></span>;
        if (part.endsWith('\u00e8me')) return <span key={idx}>{part.slice(0, -3)}<sup>\u00e8me</sup></span>;
        return part;
    });
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Aucun cours';
    try {
        const date = new Date(dateString);
        const corrected = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return `Màj : ${corrected.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    } catch {
        return 'Date non spécifiée';
    }
};

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, lastModified, nextSessionLabel, onSelect, onDelete, onConfigure }) => {
    const handleDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la classe "${classInfo.name}" ?\n\nCette action est irréversible et supprimera définitivement tous ses cours.`)) {
            onDelete();
        }
    };

    const handleConfigureClick = (e: MouseEvent) => {
        e.stopPropagation();
        onConfigure();
    };

    const isArabic = containsArabic(classInfo.name);
    const displaySubject = SUBJECT_ABBREV_MAP[classInfo.subject] || classInfo.subject;

    return (
        <Card
            className="group relative w-full cursor-pointer overflow-hidden rounded-[20px] border border-[#E4D3AC]/70 bg-[#FFFDF7] p-0 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[#B8935A] hover:shadow-lg active:translate-y-0 active:scale-[0.98] active:shadow-sm select-none will-change-transform"
            onClick={() => onSelect()}
        >
            {/* Soft, premium dynamic colored ambient glow in the top-right corner on hover */}
            <div 
                className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" 
                style={{ backgroundColor: classInfo.color || '#B8935A' }}
            />

            <CardContent className="relative flex min-h-[140px] flex-col justify-between p-4 sm:p-4.5">
                {/* Header: Dynamic Color Dot & Actions */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {/* Dynamic color pill */}
                        <span 
                            className="h-2 w-2 rounded-full shadow-sm shrink-0" 
                            style={{ backgroundColor: classInfo.color || '#B8935A' }}
                        />
                    </div>
                    <div className="flex items-center gap-1 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleConfigureClick}
                            className="h-7 w-7 rounded-full text-[#A79C87] hover:bg-[#FCF6EA] hover:text-[#B8935A] transition-all duration-200"
                            title="Configurer la classe"
                            aria-label="Configurer la classe"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteClick}
                            className="h-7 w-7 rounded-full text-[#A79C87] hover:bg-rose-50/80 hover:text-rose-600 transition-all duration-200"
                            title="Supprimer la classe"
                            aria-label="Supprimer la classe"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="my-2.5 flex flex-col justify-center">
                    <h3
                        className={`text-xl sm:text-2xl font-extrabold text-[#2B241D] font-display tracking-tight leading-tight group-hover:text-[#B8935A] transition-colors duration-300 ${isArabic ? 'font-ar text-2xl' : ''}`}
                    >
                        {formatSuperscript(classInfo.name)}
                    </h3>
                    
                    <span 
                        className="text-[10px] font-extrabold tracking-widest text-[#B8935A] uppercase font-mono mt-1"
                    >
                        {displaySubject}
                    </span>

                    {nextSessionLabel && (
                        <div 
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#FCF6EA]/60 px-3 py-0.5 text-[11px] font-extrabold text-[#69604F] border border-[#E4D3AC]/25 w-max shadow-sm"
                        >
                            <Bell className="h-3 w-3 text-[#B8935A]" />
                            <span>Séance : {nextSessionLabel}</span>
                        </div>
                    )}
                </div>

                {/* Footer: Date modified & Ouvrir CTA */}
                <div className="mt-2.5 flex items-center justify-between border-t border-[#E4D3AC]/20 pt-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#69604F]/70 font-semibold font-sans">
                        <Clock className="h-3.5 w-3.5 text-[#A79C87]/80" />
                        {formatDate(lastModified)}
                    </span>
                    
                    <span 
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider text-[#B8935A] transition-all duration-300 group-hover:gap-2"
                    >
                        OUVRIR 
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export const ClassCard = memo(ClassCardComponent);
export default ClassCard;

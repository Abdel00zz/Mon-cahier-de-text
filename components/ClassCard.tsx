import { memo, MouseEvent, FC } from 'react';
import { ClassInfo } from '../types';
import { SUBJECT_ABBREV_MAP } from '../constants';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trash2, CalendarDays, Clock } from './ui/icons';

interface ClassCardProps {
    classInfo: ClassInfo;
    lastModified: string | null | undefined;
    nextSessionLabel?: string | null;
    onSelect: () => void;
    onDelete: () => void;
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
    if (!dateString) return 'Aucun cours enregistré';
    try {
        const date = new Date(dateString);
        const corrected = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return `Màj : ${corrected.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } catch {
        return 'Date non spécifiée';
    }
};

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, lastModified, nextSessionLabel, onSelect, onDelete }) => {

    const handleDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la classe "${classInfo.name}" ?\n\nCette action est irréversible et supprimera définitivement tous ses cours.`)) {
            onDelete();
        }
    };

    const isArabic = containsArabic(classInfo.name);
    const displaySubject = SUBJECT_ABBREV_MAP[classInfo.subject] || classInfo.subject;

    return (
        <Card
            className="group relative w-full cursor-pointer overflow-hidden border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-0 transition-all duration-150 hover:border-slate-400 hover:bg-slate-50/50"
            style={{ borderLeft: `4px solid ${classInfo.color}` }}
            onClick={() => onSelect()}
        >
            <CardContent className="flex min-h-[8.5rem] flex-col justify-between p-4">
                {/* Header: Subject Label & Delete Action */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 select-none">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: classInfo.color }} />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {displaySubject}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDeleteClick}
                        className="h-9 w-9 rounded-full text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 max-md:opacity-100 md:h-6 md:w-6 md:rounded md:opacity-0 md:group-hover:opacity-100"
                        title="Supprimer la classe"
                        aria-label="Supprimer la classe"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>

                {/* Main Content: Class Title */}
                <div className="my-2 flex flex-1 flex-col justify-center gap-1.5">
                    <h3
                        className={`text-[15px] font-semibold text-slate-800 leading-tight tracking-tight ${isArabic ? 'font-arabic text-lg' : ''}`}
                    >
                        {formatSuperscript(classInfo.name)}
                    </h3>
                    {nextSessionLabel && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <CalendarDays className="h-2.5 w-2.5" />
                            Prochaine séance : {nextSessionLabel}
                        </span>
                    )}
                </div>

                {/* Footer: Monospace Modif Date */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-mono text-[10px] text-slate-400 select-none">
                    <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(lastModified)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-300 group-hover:text-primary transition-colors">
                        Ouvrir →
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export const ClassCard = memo(ClassCardComponent);
export default ClassCard;

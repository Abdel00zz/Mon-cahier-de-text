import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '../types';
import { NextSessionInfo } from '../utils/timetable';
import { Card, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Trash2, Clock, Bell, Settings, ChevronRight } from './ui/icons';

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
    if (!dateString) return 'Aucun cours';
    try {
        const date = new Date(dateString);
        const corrected = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return `Màj : ${corrected.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    } catch {
        return 'Date non spécifiée';
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
            className="group flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        >
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className={`text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight ${isArabic ? 'font-ar text-[1.28rem]' : ''}`}>
                        {formatSuperscript(classInfo.name)}
                    </h3>
                    <div className="flex items-center gap-1.5 ml-2">
                        <button
                            onClick={handleConfigureClick}
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Modifier"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Supprimer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {nextSession?.kind === 'now' ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        Séance en cours
                    </p>
                ) : nextSession ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Bell className="w-3.5 h-3.5" />
                        Séance : {nextSession.label}
                    </p>
                ) : (
                    <p className="flex items-center gap-1.5 text-xs font-medium italic text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        Emploi du temps non renseigné
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/45 px-6 py-3.5">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {formatDate(lastModified)}
                </span>
                <span className="group/btn inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
                    Ouvrir
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-0.5 transition-transform" />
                </span>
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

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
        <Card
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
            className="group relative h-full w-full min-h-[124px] cursor-pointer overflow-hidden rounded-lg border border-white/70 surface-glass shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-[0.98] select-none will-change-transform"
            onClick={() => onSelect()}
            aria-label={`Ouvrir la classe ${classInfo.name}`}
        >
            <div className="relative flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-1.5">
                    <CardTitle
                        className={`min-w-0 flex-1 pt-0.5 text-[1.1rem] sm:text-[1.22rem] font-extrabold font-display leading-tight text-foreground ${isArabic ? 'font-ar text-[1.28rem]' : ''}`}
                    >
                        {formatSuperscript(classInfo.name)}
                    </CardTitle>
                    <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleConfigureClick}
                            className="h-9 w-9 rounded-full text-muted-foreground/55 hover:bg-[rgb(var(--sky-wash)_/_0.62)] hover:text-primary transition-all duration-200"
                            title="Configurer la classe"
                            aria-label="Configurer la classe"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteClick}
                            className="h-9 w-9 rounded-full text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                            title="Supprimer la classe"
                            aria-label="Supprimer la classe"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="mt-2 flex-1">
                    {nextSession?.kind === 'now' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                            </span>
                            Séance en cours
                        </span>
                    ) : nextSession ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-[rgb(var(--sky-wash)_/_0.58)] px-2.5 py-1 text-[11px] font-extrabold text-primary shadow-sm">
                            <Bell className="h-3 w-3" />
                            <span>Séance : {nextSession.label}</span>
                        </span>
                    ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground/55 italic">
                            Emploi du temps non renseigné
                        </span>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-md border border-white/70 bg-[rgb(var(--paper-wash)_/_0.55)] px-2.5 py-2">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground font-sans">
                        <Clock className="h-3.5 w-3.5 opacity-60" />
                        {formatDate(lastModified)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground transition-all duration-300 group-hover:gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-sm">
                        Ouvrir
                        <ChevronRight className="h-3.5 w-3.5" />
                    </span>
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
        </Card>
    );
};

export const ClassCard = memo(ClassCardComponent);
export default ClassCard;

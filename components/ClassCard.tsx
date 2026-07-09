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
    /** prochaine séance calculée par le moteur intelligent (fériés, vacances, heure) */
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
    const parts = text.split(/(\d+(?:er|ère|ème))/);
    return parts.map((part, idx) => {
        if (part.endsWith('er'))   return <span key={idx}>{part.slice(0, -2)}<sup>er</sup></span>;
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
    const [hovered, setHovered] = useState(false);
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
    const accent = classInfo.color || 'hsl(var(--primary))';
    /** teinte lisible de l'accent sur fond clair */
    const accentInk = `color-mix(in srgb, ${accent} 72%, hsl(var(--foreground)))`;

    return (
        <Card
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
            className="group relative h-full w-full min-h-[124px] cursor-pointer overflow-hidden rounded-[22px] border-2 transition-all duration-300 ease-out active:scale-[0.98] select-none will-change-transform"
            style={{
                // contour complet à la couleur de la classe, qui s'intensifie au survol/tap
                borderColor: hovered
                    ? `color-mix(in srgb, ${accent} 85%, hsl(var(--border)))`
                    : `color-mix(in srgb, ${accent} 55%, hsl(var(--border)))`,
                backgroundColor: hovered
                    ? `color-mix(in srgb, ${accent} 10%, hsl(var(--card)))`
                    : `color-mix(in srgb, ${accent} 4%, hsl(var(--card)))`,
                boxShadow: hovered
                    ? `0 4px 18px color-mix(in srgb, ${accent} 30%, transparent)`
                    : `0 1px 4px color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onSelect()}
            aria-label={`Ouvrir la classe ${classInfo.name}`}
        >
            {/* Halo doux dans l'angle */}
            <div
                className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-[40px] opacity-10 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
                style={{ backgroundColor: accent }}
            />

            <div className="relative flex h-full flex-col p-4">
                {/* Nom de la classe + actions discrètes */}
                <div className="flex items-start justify-between gap-1.5">
                    <CardTitle
                        className={`min-w-0 flex-1 pt-0.5 text-[1.1rem] sm:text-[1.22rem] font-extrabold font-display tracking-tight leading-tight ${isArabic ? 'font-ar text-[1.28rem]' : ''}`}
                        style={{ color: `color-mix(in srgb, ${accent} 18%, hsl(var(--foreground)))` }}
                    >
                        {formatSuperscript(classInfo.name)}
                    </CardTitle>
                    <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleConfigureClick}
                            className="h-9 w-9 rounded-full text-muted-foreground/50 hover:bg-secondary hover:text-primary transition-all duration-200"
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

                {/* Prochaine séance — moteur intelligent : « en cours » (pastille
                    vivante), « aujourd'hui · 14h », « demain », « lundi · 8h »,
                    ou « le 12 sept. » au retour des vacances */}
                <div className="mt-2 flex-1">
                    {nextSession?.kind === 'now' ? (
                        <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shadow-sm"
                            style={{ backgroundColor: accent }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                            </span>
                            Séance en cours
                        </span>
                    ) : nextSession ? (
                        <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${accent} 12%, hsl(var(--card)))`,
                                border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                                color: accentInk,
                            }}
                        >
                            <Bell className="h-3 w-3" style={{ color: accent }} />
                            <span>Séance : {nextSession.label}</span>
                        </span>
                    ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground/55 italic">
                            Emploi du temps non renseigné
                        </span>
                    )}
                </div>

                {/* Pied : dernière mise à jour + pastille d'ouverture */}
                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground font-sans">
                        <Clock className="h-3.5 w-3.5 opacity-60" />
                        {formatDate(lastModified)}
                    </span>
                    <span
                        className="inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all duration-300 group-hover:gap-1.5 group-hover:shadow-sm"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${accent} ${hovered ? 18 : 10}%, hsl(var(--card)))`,
                            color: accentInk,
                        }}
                    >
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

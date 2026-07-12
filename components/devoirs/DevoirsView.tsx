import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, LessonsData } from '../../types';
import { useClassAssessments } from '../../hooks/useAssessments';
import { migrateLessonsData } from '../../utils/dataUtils';
import { getBundledCalendar, todayInMorocco } from '../../utils/calendar';
import { daysBetweenISO } from '../../utils/assessments';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '../../utils/assessmentSync';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '../ui/sheet';
import { BookOpen, CalendarCheck, Check, CircleAlert, Plus, Users, X } from '../ui/icons';

interface DevoirsViewProps {
    classes: ClassInfo[];
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    onOpenNotebook: (classInfo: ClassInfo) => void;
}

const readLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
    } catch {
        return [];
    }
};

const formatLongDate = (iso: string): string => {
    try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
        });
    } catch {
        return iso;
    }
};

/* pastille d'état — une teinte par famille, cohérente avec le reste de l'app */
const STATUS_STYLE: Record<AssessmentLink['status'], { label: string; className: string }> = {
    done: { label: 'Dans le cahier', className: 'bg-success/5 text-success border-success/30' },
    mismatch: { label: 'Écart avec le cahier', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    upcoming: { label: 'À venir', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    missing: { label: 'Non saisi', className: 'bg-slate-50 text-slate-500 border-slate-200' },
};

/**
 * Calendrier des devoirs — vue dédiée du hub.
 *
 * Trois mécanismes reliés :
 *   1. le PLANNING (ministériel + dates ajustées) donne la ligne de temps ;
 *   2. le CAHIER de textes est mis en regard (moteur `assessmentSync`) : un
 *      devoir saisi à une autre date fait apparaître « Aligner le calendrier »
 *      — le choix réel du prof met à jour le calendrier, jamais l'inverse ;
 *   3. chaque devoir surveillé ouvre la CONSIGNE DES ABSENTS (noms stockés
 *      avec le compte, synchronisés).
 */
export const DevoirsView: React.FC<DevoirsViewProps> = ({ classes, config, onConfigChange, onOpenNotebook }) => {
    const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
    const selectedClass = classes.find(c => c.id === selectedClassId) ?? classes[0] ?? null;
    const { assessments, hasPlan } = useClassAssessments(selectedClass, config);
    const [absencesFor, setAbsencesFor] = useState<AssessmentLink | null>(null);

    const today = todayInMorocco(new Date(), getBundledCalendar());

    const links = useMemo(() => {
        if (!selectedClass) return [];
        return linkAssessments(assessments, findNotebookAssessments(readLessons(selectedClass.id)), today);
    }, [assessments, selectedClass, today]);

    const setAssessmentDate = (assessmentId: string, dateISO: string) => {
        if (!selectedClass) return;
        const next: Record<string, Record<string, string>> = {
            ...(config.assessmentDates ?? {}),
            [selectedClass.id]: { ...(config.assessmentDates?.[selectedClass.id] ?? {}) },
        };
        if (dateISO) next[selectedClass.id][assessmentId] = dateISO;
        else delete next[selectedClass.id][assessmentId];
        onConfigChange({ assessmentDates: next });
    };

    /* le CHOIX RÉEL du prof (date du cahier) devient la date du calendrier */
    const alignOnNotebook = (link: AssessmentLink) => {
        if (!link.entry?.date) return;
        setAssessmentDate(link.planned.id, link.entry.date);
        toast.success(`Calendrier aligné sur le cahier : ${link.planned.label.split(' — ')[0]} → ${formatLongDate(link.entry.date)}.`);
    };

    if (classes.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <CalendarCheck className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-bold text-slate-900">Créez d'abord vos classes</p>
                <p className="text-xs font-semibold text-slate-500">
                    Le calendrier des devoirs se construit automatiquement à partir de vos classes et du planning officiel.
                </p>
            </div>
        );
    }

    const semesters: (1 | 2)[] = [1, 2];
    const absencesRecord = absencesFor && selectedClass
        ? config.assessmentAbsences?.[selectedClass.id]?.[absencesFor.planned.id]
        : undefined;

    return (
        <div className="space-y-5">
            {/* Sélecteur de classe : chips tactiles */}
            <div className="flex flex-wrap gap-2">
                {classes.map(c => {
                    const active = c.id === selectedClass?.id;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClassId(c.id)}
                            className={`h-9 rounded-full border px-4 text-xs font-bold transition-all cursor-pointer ${
                                active
                                    ? 'border-primary bg-primary text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            {c.name}
                        </button>
                    );
                })}
            </div>

            {!hasPlan ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    Aucun planning officiel de devoirs pour ce niveau/matière.
                </div>
            ) : (
                <>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Dates <b>indicatives</b> du planning ministériel, ajustables ici. La colonne d'état lit votre{' '}
                        <b>cahier de textes</b> : un devoir saisi à une autre date propose d'<b>aligner le calendrier</b> sur
                        votre choix réel. Touchez un devoir surveillé pour <b>consigner les absents</b>.
                    </p>

                    {semesters.map(sem => {
                        const ofSemester = links.filter(l => l.planned.semestre === sem);
                        if (ofSemester.length === 0) return null;
                        return (
                            <section key={sem} className="space-y-2">
                                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Semestre {sem}
                                </h3>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                                    {ofSemester.map(link => {
                                        const a = link.planned;
                                        const inDays = daysBetweenISO(today, a.dateISO);
                                        const custom = !!config.assessmentDates?.[selectedClass!.id]?.[a.id];
                                        const absents = config.assessmentAbsences?.[selectedClass!.id]?.[a.id]?.names ?? [];
                                        const status = STATUS_STYLE[link.status];
                                        const isControle = a.type === 'controle';
                                        return (
                                            <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 hover:bg-slate-50/50 transition-colors">
                                                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                                    isControle
                                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                        : 'border-primary/20 bg-primary/10 text-primary'
                                                }`}>
                                                    {isControle ? `Surveillé ${a.num}` : `Maison ${a.num}`}
                                                </span>

                                                <span className="min-w-0 text-xs font-bold text-slate-700">
                                                    {formatLongDate(a.dateISO)}
                                                    {a.duree && <span className="ml-1.5 font-semibold text-slate-500/80">· {a.duree}</span>}
                                                    {link.status === 'upcoming' && inDays >= 0 && inDays <= 14 && (
                                                        <span className="ml-1.5 font-black text-red-600">
                                                            {inDays === 0 ? "aujourd'hui" : inDays === 1 ? 'demain' : `dans ${inDays} j`}
                                                        </span>
                                                    )}
                                                </span>

                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                                                    {link.status === 'done' && <Check className="h-3 w-3" />}
                                                    {link.status === 'mismatch' && <CircleAlert className="h-3 w-3" />}
                                                    {status.label}
                                                    {link.status === 'mismatch' && link.entry?.date && (
                                                        <span className="font-black">· cahier : {formatLongDate(link.entry.date)}</span>
                                                    )}
                                                </span>

                                                {link.status === 'mismatch' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => alignOnNotebook(link)}
                                                        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 transition-colors hover:bg-amber-100/60 cursor-pointer"
                                                        title="Mettre la date du calendrier à celle du cahier de textes"
                                                    >
                                                        Aligner le calendrier
                                                    </button>
                                                )}

                                                <span className="ml-auto flex items-center gap-1.5">
                                                    {isControle && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAbsencesFor(link)}
                                                            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
                                                                absents.length > 0
                                                                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100/60'
                                                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                                            }`}
                                                            title="Consigner les élèves absents lors de ce devoir"
                                                        >
                                                            <Users className="h-3.5 w-3.5" />
                                                            {absents.length > 0 ? `${absents.length} absent${absents.length > 1 ? 's' : ''}` : 'Absents'}
                                                        </button>
                                                    )}
                                                    <input
                                                        type="date"
                                                        value={a.dateISO}
                                                        onChange={e => setAssessmentDate(a.id, e.target.value)}
                                                        className={`h-8 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer ${
                                                            custom ? 'border-primary text-primary font-bold' : 'border-slate-200'
                                                        }`}
                                                        title={a.fenetre ? `Fenêtre officielle : ${a.fenetre}` : 'Ajuster la date'}
                                                        aria-label={`Date du devoir ${a.label}`}
                                                    />
                                                    {custom && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssessmentDate(a.id, '')}
                                                            className="text-xs font-bold text-slate-400 hover:text-red-600 cursor-pointer"
                                                            title="Revenir à la date officielle"
                                                        >
                                                            ↺
                                                        </button>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}

                    {selectedClass && (
                        <button
                            type="button"
                            onClick={() => onOpenNotebook(selectedClass)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/90 cursor-pointer underline-offset-2 hover:underline"
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Ouvrir le cahier de {selectedClass.name}
                        </button>
                    )}
                </>
            )}

            {/* Consigne des absents : bottom-sheet mobile-first */}
            <Sheet open={absencesFor !== null} onOpenChange={open => { if (!open) setAbsencesFor(null); }}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-3 sm:mx-auto sm:max-w-lg"
                >
                    <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/20" aria-hidden />
                    {absencesFor && selectedClass && (
                        <AbsencesEditor
                            key={`${selectedClass.id}-${absencesFor.planned.id}`}
                            link={absencesFor}
                            className={selectedClass.name}
                            initialNames={absencesRecord?.names ?? []}
                            updatedAt={absencesRecord?.updatedAt}
                            onSave={names => {
                                const classId = selectedClass.id;
                                const forClass = { ...(config.assessmentAbsences?.[classId] ?? {}) };
                                if (names.length > 0) {
                                    forClass[absencesFor.planned.id] = { names, updatedAt: new Date().toISOString() };
                                } else {
                                    delete forClass[absencesFor.planned.id];
                                }
                                onConfigChange({
                                    assessmentAbsences: { ...(config.assessmentAbsences ?? {}), [classId]: forClass },
                                });
                                toast.success(
                                    names.length > 0
                                        ? `${names.length} absent${names.length > 1 ? 's' : ''} consigné${names.length > 1 ? 's' : ''} — ${absencesFor.planned.label.split(' — ')[0]}.`
                                        : 'Liste des absents effacée.'
                                );
                                setAbsencesFor(null);
                            }}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

/* ── Saisie des absents : chips + ajout rapide (Entrée / virgule / collage) ── */

interface AbsencesEditorProps {
    link: AssessmentLink;
    className: string;
    initialNames: string[];
    updatedAt?: string;
    onSave: (names: string[]) => void;
}

const AbsencesEditor: React.FC<AbsencesEditorProps> = ({ link, className, initialNames, updatedAt, onSave }) => {
    const [names, setNames] = useState<string[]>(initialNames);
    const [draft, setDraft] = useState('');

    /* un collage « Nom1, Nom2 » ou multi-lignes ajoute plusieurs élèves d'un coup */
    const commitDraft = (raw: string) => {
        const parts = raw.split(/[,;\n]+/).map(p => p.trim().replace(/\s+/g, ' ')).filter(Boolean);
        if (parts.length === 0) return;
        setNames(prev => {
            const seen = new Set(prev.map(n => n.toLocaleLowerCase('fr')));
            const additions = parts.filter(p => !seen.has(p.toLocaleLowerCase('fr')));
            return [...prev, ...additions];
        });
        setDraft('');
    };

    const effectiveDate = link.entry?.date ?? link.planned.dateISO;

    return (
        <>
            <SheetHeader className="text-left">
                <SheetTitle className="font-display text-lg font-extrabold">
                    Absents — {link.planned.label.split(' — ')[0]}
                </SheetTitle>
                <SheetDescription className="text-xs font-semibold text-muted-foreground/80">
                    {className} · {formatLongDate(effectiveDate)}
                    {updatedAt && ` · liste mise à jour le ${new Date(updatedAt).toLocaleDateString('fr-FR')}`}
                </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-3">
                {names.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {names.map(name => (
                            <Badge key={name} variant="secondary" className="gap-1 pl-2.5 pr-1 text-[11px] font-bold">
                                {name}
                                <button
                                    type="button"
                                    onClick={() => setNames(prev => prev.filter(n => n !== name))}
                                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Retirer ${name}`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                commitDraft(draft);
                            }
                        }}
                        onPaste={e => {
                            const text = e.clipboardData.getData('text');
                            if (/[,;\n]/.test(text)) {
                                e.preventDefault();
                                commitDraft(text);
                            }
                        }}
                        onBlur={() => commitDraft(draft)}
                        placeholder="Nom de l'élève, puis Entrée…"
                        className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        autoFocus
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-11 w-11 shrink-0 rounded-lg"
                        onClick={() => commitDraft(draft)}
                        aria-label="Ajouter l'élève"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground/60">
                    Astuce : collez une liste « Nom1, Nom2, Nom3 » — chaque nom devient une étiquette. La liste suit votre
                    compte (synchronisée), utile pour organiser les rattrapages.
                </p>

                <Button type="button" className="h-11 w-full rounded-full font-bold" onClick={() => onSave(names)}>
                    Enregistrer {names.length > 0 ? `(${names.length})` : 'la liste vide'}
                </Button>
            </div>
        </>
    );
};

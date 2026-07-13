import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, LessonsData, PedagogicalEvent, PedagogicalEventType } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useClassAssessments } from '@/hooks/useAssessments';
import { migrateLessonsData } from '@/utils/dataUtils';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import { daysBetweenISO } from '@/utils/assessments';
import { AssessmentLink, findNotebookAssessments, linkAssessments } from '@/utils/assessmentSync';
import {
    getOfficialEventEffectiveEnd,
    getClassSchoolSegment,
    getOfficialStudentEventsFile,
    getOfficialStudentEventsForClass,
    loadOfficialStudentEvents,
    OfficialStudentEvent,
    OfficialStudentEventCategory,
    OfficialStudentEventsFile,
} from '@/utils/officialStudentEvents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    BookOpen,
    CalendarCheck,
    CalendarDays,
    Check,
    CircleAlert,
    CircleCheck,
    FlaskConical,
    GraduationCap,
    Plus,
    Trash2,
    Users,
    X,
} from '@/components/ui/icons';

interface DevoirsViewProps {
    classes: ClassInfo[];
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    onOpenNotebook: (classInfo: ClassInfo) => void;
    /** Mode contextuel : la classe est déjà connue, aucun sélecteur ni lien de retour. */
    embedded?: boolean;
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

type DevoirsSection = 'planning' | 'official' | 'competitions';

const PEDAGOGICAL_EVENT_CONFIG: Record<PedagogicalEventType, { label: string; className: string }> = {
    evaluation_diagnostic: { label: 'Évaluation diagnostique', className: 'border-rose-200 bg-rose-50 text-rose-700' },
    olympiade: { label: 'Olympiade', className: 'border-violet-200 bg-violet-50 text-violet-700' },
    concours: { label: 'Concours', className: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
    soutien: { label: 'Soutien', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    remediation: { label: 'Remédiation', className: 'border-teal-200 bg-teal-50 text-teal-700' },
    examen_blanc: { label: 'Examen blanc', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
    rattrapage: { label: 'Rattrapage', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    autre: { label: 'Autre activité', className: 'border-slate-200 bg-slate-50 text-slate-700' },
};

const OFFICIAL_CATEGORY_CONFIG: Record<OfficialStudentEventCategory, { label: string; className: string }> = {
    school: { label: 'Scolarité', className: 'border-slate-200 bg-slate-50 text-slate-700' },
    assessment: { label: 'Évaluation', className: 'border-blue-200 bg-blue-50 text-blue-700' },
    exam: { label: 'Examen', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
    result: { label: 'Résultat', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    support: { label: 'Préparation', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    competition: { label: 'Concours', className: 'border-violet-200 bg-violet-50 text-violet-700' },
};

const formatDateRange = (start: string, end?: string): string => {
    if (!end || end === start) return formatLongDate(start);
    return `${formatLongDate(start)} au ${formatLongDate(end)}`;
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
export const DevoirsView: React.FC<DevoirsViewProps> = ({ classes, config, onConfigChange, onOpenNotebook, embedded = false }) => {
    const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
    const selectedClass = classes.find(c => c.id === selectedClassId) ?? classes[0] ?? null;
    const selectedClassDisplayName = selectedClass ? formatClassDisplayName(selectedClass.name) : '';
    const { assessments, hasPlan } = useClassAssessments(selectedClass, config);
    const [absencesFor, setAbsencesFor] = useState<AssessmentLink | null>(null);
    const [section, setSection] = useState<DevoirsSection>('planning');
    const [eventEditorOpen, setEventEditorOpen] = useState(false);
    const [showAllOfficial, setShowAllOfficial] = useState(false);
    const [officialEventsFile, setOfficialEventsFile] = useState<OfficialStudentEventsFile>(() => getOfficialStudentEventsFile());

    const today = todayInMorocco(new Date(), getBundledCalendar());

    useEffect(() => {
        let active = true;
        loadOfficialStudentEvents().then(file => {
            if (active) setOfficialEventsFile(file);
        });
        return () => { active = false; };
    }, []);

    const links = useMemo(() => {
        if (!selectedClass) return [];
        return linkAssessments(assessments, findNotebookAssessments(readLessons(selectedClass.id)), today);
    }, [assessments, selectedClass, today]);

    const pedagogicalEvents = useMemo(
        () => selectedClass
            ? [...(config.pedagogicalEvents?.[selectedClass.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
            : [],
        [config.pedagogicalEvents, selectedClass]
    );

    const officialEvents = useMemo(
        () => selectedClass ? getOfficialStudentEventsForClass(selectedClass, undefined, officialEventsFile) : [],
        [officialEventsFile, selectedClass]
    );

    const officialJourney = useMemo(
        () => officialEvents.filter(event => event.category !== 'competition'),
        [officialEvents]
    );

    const officialCompetitions = useMemo(
        () => officialEvents.filter(event => event.category === 'competition'),
        [officialEvents]
    );

    const classGroups = useMemo(() => {
        const definitions = [
            { id: 'college', label: 'Collège' },
            { id: 'lycee', label: 'Lycée qualifiant' },
            { id: 'unknown', label: 'Autres classes' },
        ] as const;
        return definitions
            .map(group => ({ ...group, classes: classes.filter(item => getClassSchoolSegment(item) === group.id) }))
            .filter(group => group.classes.length > 0);
    }, [classes]);

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

    const savePedagogicalEvents = (events: PedagogicalEvent[]) => {
        if (!selectedClass) return;
        onConfigChange({
            pedagogicalEvents: {
                ...(config.pedagogicalEvents ?? {}),
                [selectedClass.id]: events,
            },
        });
    };

    const addPedagogicalEvent = (event: PedagogicalEvent) => {
        savePedagogicalEvents([...pedagogicalEvents, event]);
        setEventEditorOpen(false);
        toast.success(`${PEDAGOGICAL_EVENT_CONFIG[event.type].label} ajoutée au parcours de ${selectedClassDisplayName}.`);
    };

    const togglePedagogicalEvent = (eventId: string) => {
        savePedagogicalEvents(pedagogicalEvents.map(event =>
            event.id === eventId
                ? { ...event, status: event.status === 'done' ? 'planned' : 'done' }
                : event
        ));
    };

    const deletePedagogicalEvent = (eventId: string) => {
        savePedagogicalEvents(pedagogicalEvents.filter(event => event.id !== eventId));
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
        <div className={embedded ? 'space-y-4' : 'space-y-5'}>
            {!embedded && <div className="space-y-2" aria-label="Classes et niveaux">
                {classGroups.map(group => (
                    <div key={group.id} className="flex flex-wrap items-center gap-2">
                        <span className="w-24 shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{group.label}</span>
                        <div className="flex flex-wrap gap-2">
                            {group.classes.map(c => {
                                const active = c.id === selectedClass?.id;
                                const displayName = formatClassDisplayName(c.name);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => { setSelectedClassId(c.id); setShowAllOfficial(false); }}
                                        aria-pressed={active}
                                        aria-label={`Afficher les évaluations de ${displayName}`}
                                        title={displayName}
                                        className={`min-h-10 max-w-full rounded-2xl border px-3 py-2 text-left text-[10px] font-bold leading-tight transition-all sm:max-w-[19rem] sm:text-[11px] ${
                                            active
                                                ? 'border-primary bg-primary text-white shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {displayName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>}

            <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1" role="tablist" aria-label="Sections des évaluations">
                {([
                    { id: 'planning', label: 'Mes évaluations', icon: CalendarCheck },
                    { id: 'official', label: 'Parcours officiel', icon: GraduationCap },
                    { id: 'competitions', label: 'Concours', icon: FlaskConical },
                ] as const).map(item => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => { setSection(item.id); setShowAllOfficial(false); }}
                            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-extrabold transition-colors sm:text-xs ${
                                active ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="leading-tight">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {section === 'planning' && (
                <>
                    <PedagogicalEventsSection
                        className={selectedClassDisplayName}
                        events={pedagogicalEvents}
                        onAdd={() => setEventEditorOpen(true)}
                        onToggle={togglePedagogicalEvent}
                        onDelete={deletePedagogicalEvent}
                    />

                    {!hasPlan ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                            Aucun planning indicatif de devoirs pour ce niveau et cette matière. Les activités ajoutées ci-dessus restent disponibles.
                        </div>
                    ) : (
                        <>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Les devoirs ci-dessous sont <b>indicatifs et modifiables</b>. Le calendrier ministériel obligatoire est séparé dans l'onglet <b>Parcours officiel</b>.
                            </p>

                            {semesters.map(sem => {
                                const ofSemester = links.filter(l => l.planned.semestre === sem);
                                if (ofSemester.length === 0) return null;
                                return (
                                    <section key={sem} className="space-y-2">
                                        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Semestre {sem}</h3>
                                        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                            {ofSemester.map(link => {
                                                const a = link.planned;
                                                const inDays = daysBetweenISO(today, a.dateISO);
                                                const custom = !!config.assessmentDates?.[selectedClass!.id]?.[a.id];
                                                const absents = config.assessmentAbsences?.[selectedClass!.id]?.[a.id]?.names ?? [];
                                                const status = STATUS_STYLE[link.status];
                                                const isControle = a.type === 'controle';
                                                return (
                                                    <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors hover:bg-slate-50/50">
                                                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                                            isControle ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-primary/20 bg-primary/10 text-primary'
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
                                                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 transition-colors hover:bg-amber-100/60"
                                                            >
                                                                Aligner le calendrier
                                                            </button>
                                                        )}
                                                        <span className="ml-auto flex items-center gap-1.5">
                                                            {isControle && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAbsencesFor(link)}
                                                                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition-colors ${
                                                                        absents.length > 0
                                                                            ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100/60'
                                                                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                                                    }`}
                                                                >
                                                                    <Users className="h-3.5 w-3.5" />
                                                                    {absents.length > 0 ? `${absents.length} absent${absents.length > 1 ? 's' : ''}` : 'Absents'}
                                                                </button>
                                                            )}
                                                            <input
                                                                type="date"
                                                                value={a.dateISO}
                                                                onChange={e => setAssessmentDate(a.id, e.target.value)}
                                                                className={`h-8 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                                                    custom ? 'border-primary font-bold text-primary' : 'border-slate-200'
                                                                }`}
                                                                title={a.fenetre ? `Fenêtre indicative : ${a.fenetre}` : 'Ajuster la date'}
                                                                aria-label={`Date du devoir ${a.label}`}
                                                            />
                                                            {custom && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAssessmentDate(a.id, '')}
                                                                    className="text-xs font-bold text-slate-400 hover:text-red-600"
                                                                    title="Revenir à la date indicative"
                                                                >↺</button>
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </>
                    )}

                    {selectedClass && !embedded && (
                        <button
                            type="button"
                            onClick={() => onOpenNotebook(selectedClass)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/90 cursor-pointer underline-offset-2 hover:underline"
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Ouvrir le cahier de {selectedClassDisplayName}
                        </button>
                    )}
                </>
            )}

            {section === 'official' && selectedClass && (
                <OfficialEventsPanel
                    className={selectedClassDisplayName}
                    events={officialJourney}
                    source={officialEventsFile}
                    today={today}
                    showAll={showAllOfficial}
                    onToggleAll={() => setShowAllOfficial(value => !value)}
                />
            )}

            {section === 'competitions' && selectedClass && (
                <OfficialEventsPanel
                    className={selectedClassDisplayName}
                    events={officialCompetitions}
                    source={officialEventsFile}
                    today={today}
                    showAll={showAllOfficial}
                    onToggleAll={() => setShowAllOfficial(value => !value)}
                    competitions
                />
            )}

            <Sheet open={eventEditorOpen} onOpenChange={setEventEditorOpen}>
                <SheetContent
                    side="bottom"
                    className="max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-3 sm:mx-auto sm:max-w-lg"
                >
                    <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/20" aria-hidden />
                    {selectedClass && (
                        <PedagogicalEventEditor
                            className={selectedClassDisplayName}
                            today={today}
                            onCancel={() => setEventEditorOpen(false)}
                            onSave={addPedagogicalEvent}
                        />
                    )}
                </SheetContent>
            </Sheet>

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
                            className={selectedClassDisplayName}
                            initialNames={absencesRecord?.names ?? []}
                            updatedAt={absencesRecord?.updatedAt}
                            onCancel={() => setAbsencesFor(null)}
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

interface PedagogicalEventsSectionProps {
    className: string;
    events: PedagogicalEvent[];
    onAdd: () => void;
    onToggle: (eventId: string) => void;
    onDelete: (eventId: string) => void;
}

const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({ className, events, onAdd, onToggle, onDelete }) => (
    <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
            <div>
                <h3 className="text-sm font-extrabold text-slate-900">Activités pédagogiques · {className}</h3>
                <p className="text-[11px] font-semibold text-slate-500">Diagnostic, soutien, olympiade, examen blanc ou rattrapage.</p>
            </div>
            <Button type="button" size="sm" className="h-9 shrink-0 rounded-full px-3 text-xs font-bold" onClick={onAdd}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Ajouter
            </Button>
        </div>

        {events.length === 0 ? (
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-20 w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <CalendarDays className="h-4 w-4" />
                </span>
                <span>
                    <span className="block text-xs font-extrabold text-slate-800">Ajouter une étape au parcours de la classe</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">Elle sera synchronisée avec votre compte.</span>
                </span>
            </button>
        ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {events.map(event => {
                    const config = PEDAGOGICAL_EVENT_CONFIG[event.type];
                    const done = event.status === 'done';
                    return (
                        <article key={event.id} className={`flex items-start gap-3 px-3 py-3 ${done ? 'bg-slate-50/60' : ''}`}>
                            <button
                                type="button"
                                onClick={() => onToggle(event.id)}
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                    done ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-400 hover:text-primary'
                                }`}
                                aria-label={done ? `Rouvrir ${event.title}` : `Marquer ${event.title} comme réalisé`}
                            >
                                {done ? <CircleCheck className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                            </button>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase ${config.className}`}>{config.label}</span>
                                    {done && <span className="text-[10px] font-bold text-emerald-600">Réalisé</span>}
                                </div>
                                <h4 className={`mt-1 text-xs font-extrabold ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{event.title}</h4>
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{formatDateRange(event.date, event.endDate)}</p>
                                {event.note && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{event.note}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => onDelete(event.id)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                                aria-label={`Supprimer ${event.title}`}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </article>
                    );
                })}
            </div>
        )}
    </section>
);

interface OfficialEventsPanelProps {
    className: string;
    events: OfficialStudentEvent[];
    source: OfficialStudentEventsFile;
    today: string;
    showAll: boolean;
    onToggleAll: () => void;
    competitions?: boolean;
}

const OfficialEventsPanel: React.FC<OfficialEventsPanelProps> = ({
    className,
    events,
    source,
    today,
    showAll,
    onToggleAll,
    competitions = false,
}) => {
    const upcoming = events.filter(event => getOfficialEventEffectiveEnd(event) >= today);
    const fallbackPast = [...events].filter(event => getOfficialEventEffectiveEnd(event) < today).slice(-6);
    const visible = showAll ? events : (upcoming.length > 0 ? upcoming.slice(0, 8) : fallbackPast);
    return (
        <section className="space-y-3">
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-4 py-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                        {competitions ? <FlaskConical className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-950">{competitions ? 'Concours accessibles' : 'Parcours officiel de l’élève'}</h3>
                            <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-blue-700">Officiel · 047.26</span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
                            {className} · année {source.schoolYear}. Seules les échéances compatibles avec le niveau sont affichées.
                        </p>
                    </div>
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
                    Aucun jalon officiel identifié pour ce niveau.
                </div>
            ) : (
                <div className="space-y-2">
                    {visible.map(event => {
                        const category = OFFICIAL_CATEGORY_CONFIG[event.category];
                        const end = getOfficialEventEffectiveEnd(event);
                        const startsIn = daysBetweenISO(today, event.start);
                        const past = end < today;
                        const ongoing = event.start <= today && end >= today;
                        const timing = ongoing
                            ? 'En cours'
                            : past
                                ? 'Terminé'
                                : startsIn === 0
                                    ? "Aujourd'hui"
                                    : startsIn === 1
                                        ? 'Demain'
                                        : `Dans ${startsIn} jours`;
                        return (
                            <article key={event.id} className={`rounded-xl border bg-white px-3 py-3 shadow-sm ${past ? 'border-slate-200 opacity-65' : 'border-slate-200'}`}>
                                <div className="flex items-start gap-3">
                                    <div className="w-[72px] shrink-0 border-r border-slate-100 pr-3">
                                        <p className="text-[10px] font-black uppercase text-primary">{timing}</p>
                                        <p className="mt-1 text-[10px] font-bold leading-tight text-slate-500">{formatDateRange(event.start, event.end)}</p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase ${category.className}`}>{category.label}</span>
                                            {event.dateKind === 'indicative' && (
                                                <span className="text-[9px] font-bold text-amber-700">Date précise à confirmer</span>
                                            )}
                                        </div>
                                        <h4 className="mt-1 text-xs font-extrabold leading-snug text-slate-900">{event.title}</h4>
                                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{event.studentAction}</p>
                                        <p className="mt-1 text-[9px] font-bold text-slate-400">Source : annexe officielle, page PDF {event.sourcePage}</p>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {events.length > 8 && (
                <Button type="button" variant="secondary" className="h-10 w-full rounded-xl text-xs font-bold" onClick={onToggleAll}>
                    {showAll ? 'Afficher seulement les prochains jalons' : `Voir le calendrier complet (${events.length})`}
                </Button>
            )}
        </section>
    );
};

interface PedagogicalEventEditorProps {
    className: string;
    today: string;
    onCancel: () => void;
    onSave: (event: PedagogicalEvent) => void;
}

const PedagogicalEventEditor: React.FC<PedagogicalEventEditorProps> = ({ className, today, onCancel, onSave }) => {
    const [type, setType] = useState<PedagogicalEventType>('evaluation_diagnostic');
    const [title, setTitle] = useState(PEDAGOGICAL_EVENT_CONFIG.evaluation_diagnostic.label);
    const [date, setDate] = useState(today);
    const [endDate, setEndDate] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    const changeType = (nextType: PedagogicalEventType) => {
        const previousDefault = PEDAGOGICAL_EVENT_CONFIG[type].label;
        setType(nextType);
        if (!title.trim() || title === previousDefault) setTitle(PEDAGOGICAL_EVENT_CONFIG[nextType].label);
    };

    const submit = () => {
        if (!title.trim()) {
            setError('Donnez un titre clair à cette activité.');
            return;
        }
        if (!date) {
            setError('Choisissez la date de début.');
            return;
        }
        if (endDate && endDate < date) {
            setError('La date de fin doit être postérieure ou égale à la date de début.');
            return;
        }
        onSave({
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `event-${Date.now()}`,
            type,
            title: title.trim(),
            date,
            endDate: endDate || undefined,
            note: note.trim() || undefined,
            status: 'planned',
            createdAt: new Date().toISOString(),
        });
    };

    return (
        <>
            <SheetHeader className="text-left">
                <SheetTitle className="font-display text-lg font-extrabold">Ajouter une activité</SheetTitle>
                <SheetDescription className="text-xs font-semibold text-muted-foreground/80">{className} · événement créé par le professeur</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
                <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-slate-700">Type d'activité</span>
                    <select
                        value={type}
                        onChange={event => changeType(event.target.value as PedagogicalEventType)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        {Object.entries(PEDAGOGICAL_EVENT_CONFIG).map(([value, config]) => (
                            <option key={value} value={value}>{config.label}</option>
                        ))}
                    </select>
                </label>

                <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-slate-700">Titre</span>
                    <input
                        value={title}
                        onChange={event => { setTitle(event.target.value); setError(''); }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Ex. Diagnostic des prérequis du chapitre 1"
                        autoFocus
                    />
                </label>

                <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-slate-700">Début</span>
                        <input type="date" value={date} onChange={event => { setDate(event.target.value); setError(''); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold" />
                    </label>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-slate-700">Fin <span className="font-medium text-slate-400">(facultatif)</span></span>
                        <input type="date" value={endDate} min={date} onChange={event => { setEndDate(event.target.value); setError(''); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold" />
                    </label>
                </div>

                <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-slate-700">Objectif ou consigne <span className="font-medium text-slate-400">(facultatif)</span></span>
                    <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Compétences visées, élèves concernés, matériel..." />
                </label>

                {error && (
                    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" className="h-11 rounded-xl font-bold" onClick={onCancel}>Annuler</Button>
                    <Button type="button" className="h-11 rounded-xl font-bold" onClick={submit}>Ajouter</Button>
                </div>
            </div>
        </>
    );
};

/* ── Saisie des absents : chips + ajout rapide (Entrée / virgule / collage) ── */

interface AbsencesEditorProps {
    link: AssessmentLink;
    className: string;
    initialNames: string[];
    updatedAt?: string;
    onCancel: () => void;
    onSave: (names: string[]) => void;
}

const AbsencesEditor: React.FC<AbsencesEditorProps> = ({ link, className, initialNames, updatedAt, onCancel, onSave }) => {
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

                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" className="h-11 rounded-xl font-bold" onClick={onCancel}>
                        Annuler
                    </Button>
                    <Button type="button" className="h-11 rounded-xl font-bold" onClick={() => onSave(names)}>
                        Enregistrer {names.length > 0 ? `(${names.length})` : ''}
                    </Button>
                </div>
            </div>
        </>
    );
};

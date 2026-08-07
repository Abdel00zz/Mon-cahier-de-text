import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    OFFICIAL_EVENT_CATEGORIES,
    OFFICIAL_LEVEL_TAGS,
    validateOfficialStudentEventsFile,
    type OfficialStudentEventsFile,
} from '../../utils/officialStudentEvents';
import { fetchAdminOfficialEvents, saveAdminOfficialEvents } from '../api';
import { Check, Download, FileInput, FileText, Save } from '../../components/ui/icons';

const CATEGORY_LABELS: Record<string, string> = {
    school: 'Scolarité',
    assessment: 'Évaluations',
    exam: 'Examens',
    result: 'Résultats',
    support: 'Soutien / préparation',
    competition: 'Concours',
};

export const OfficialBulletinManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [bulletin, setBulletin] = useState<OfficialStudentEventsFile | null>(null);
    const [jsonText, setJsonText] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAdminOfficialEvents()
            .then(({ officialEvents }) => {
                const validated = validateOfficialStudentEventsFile(officialEvents);
                setBulletin(validated);
                setJsonText(JSON.stringify(validated, null, 2));
            })
            .catch(reason => setError(reason instanceof Error ? reason.message : 'Chargement impossible.'));
    }, []);

    const stats = useMemo(() => {
        if (!bulletin) return [];
        return OFFICIAL_EVENT_CATEGORIES.map(category => ({
            category,
            count: bulletin.events.filter(event => event.category === category).length,
        })).filter(item => item.count > 0);
    }, [bulletin]);

    const validateText = (): OfficialStudentEventsFile | null => {
        setError('');
        setMessage('');
        try {
            const parsed = validateOfficialStudentEventsFile(JSON.parse(jsonText));
            setBulletin(parsed);
            setJsonText(JSON.stringify(parsed, null, 2));
            setMessage(`JSON valide : ${parsed.events.length} événements pour ${parsed.schoolYear}. Aucun doublon ni intervalle incorrect.`);
            return parsed;
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'JSON invalide.');
            return null;
        }
    };

    const publish = async () => {
        const validated = validateText();
        if (!validated) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await saveAdminOfficialEvents(validated);
            setBulletin(result.officialEvents);
            setJsonText(JSON.stringify(result.officialEvents, null, 2));
            setMessage(`Bulletin ${result.officialEvents.schoolYear} publié. Les enseignants recevront cette version au prochain chargement.`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Publication impossible.');
        } finally {
            setBusy(false);
        }
    };

    const importFile = async (file: File | undefined) => {
        if (!file) return;
        setError('');
        setMessage('');
        if (!file.name.toLowerCase().endsWith('.json')) {
            setError('Le bulletin doit être un fichier JSON.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Le fichier dépasse 2 Mo. Vérifiez qu’il ne contient pas le PDF ou des images encodées.');
            return;
        }
        try {
            setJsonText(await file.text());
            setMessage(`Fichier « ${file.name} » chargé. Utilisez « Vérifier » avant de publier.`);
        } catch {
            setError('Lecture du fichier impossible.');
        }
    };

    const downloadCurrent = () => {
        if (!bulletin) return;
        const blob = new Blob([JSON.stringify(bulletin, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulletin-officiel-${bulletin.schoolYear}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground p-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"><FileText className="h-4 w-4" /></span>
                    <div>
                        <h1 className="text-lg font-black">Bulletin officiel des élèves</h1>
                        <p className="text-xs text-primary-foreground/65">Examens, évaluations, résultats, soutien et concours</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={onBack} className="h-10 rounded-xl bg-primary-foreground/10 px-4 text-xs font-bold">Retour</button>
                    <button onClick={downloadCurrent} disabled={!bulletin} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 text-xs font-bold disabled:opacity-40"><Download className="h-3.5 w-3.5" />Exporter</button>
                    <button onClick={publish} disabled={busy || !jsonText.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold disabled:opacity-50"><Save className="h-3.5 w-3.5" />Publier</button>
                </div>
            </header>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{message}</div>}

            {bulletin && (
                <section className="grid gap-2 sm:grid-cols-[1.5fr_repeat(3,1fr)]">
                    <div className="rounded-xl border bg-card p-3">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Version active</p>
                        <p className="mt-1 text-sm font-black">{bulletin.schoolYear} · v{bulletin.version}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{bulletin.source.title}</p>
                    </div>
                    {stats.slice(0, 3).map(item => (
                        <div key={item.category} className="rounded-xl border bg-card p-3">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">{CATEGORY_LABELS[item.category]}</p>
                            <p className="mt-1 text-xl font-black text-primary">{item.count}</p>
                        </div>
                    ))}
                </section>
            )}

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.75fr)]">
                <div className="space-y-3 rounded-2xl border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div><h2 className="text-sm font-black">Code JSON du bulletin</h2><p className="text-[11px] text-muted-foreground">Vous pouvez coller le code ou charger un fichier.</p></div>
                        <div className="flex gap-2">
                            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={event => importFile(event.target.files?.[0])} />
                            <button onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-bold"><FileInput className="h-3.5 w-3.5" />Importer JSON</button>
                            <button onClick={validateText} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-secondary px-3 text-xs font-bold"><Check className="h-3.5 w-3.5" />Vérifier</button>
                        </div>
                    </div>
                    <textarea
                        value={jsonText}
                        onChange={event => { setJsonText(event.target.value); setMessage(''); setError(''); }}
                        spellCheck={false}
                        className="min-h-[34rem] w-full resize-y rounded-xl border bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label="Code JSON du bulletin officiel"
                    />
                </div>

                <aside className="space-y-3">
                    <section className="rounded-2xl border bg-blue-50/70 p-4">
                        <h2 className="text-sm font-black text-slate-950">Méthode d’extraction depuis le PDF</h2>
                        <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-700">
                            <li><b>1.</b> Relever l’année, le numéro, la date et le titre de la décision.</li>
                            <li><b>2.</b> Ne garder que les informations concernant directement l’élève.</li>
                            <li><b>3.</b> Séparer collège, tronc commun, 1BAC et 2BAC.</li>
                            <li><b>4.</b> Distinguer date fixe, période et mois indicatif.</li>
                            <li><b>5.</b> Noter la page PDF de chaque ligne pour permettre la vérification.</li>
                            <li><b>6.</b> Vérifier le JSON ici avant toute publication.</li>
                        </ol>
                    </section>

                    <section className="rounded-2xl border bg-card p-4">
                        <h3 className="text-xs font-black">Informations à conserver</h3>
                        <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                            <li>• titre clair pour l’enseignant et l’élève ;</li>
                            <li>• début et fin au format YYYY-MM-DD ;</li>
                            <li>• niveaux réellement concernés ;</li>
                            <li>• catégorie et nature de la date ;</li>
                            <li>• action pédagogique attendue ;</li>
                            <li>• page exacte de la source.</li>
                        </ul>
                    </section>

                    <section className="rounded-2xl border bg-card p-4">
                        <h3 className="text-xs font-black">Balises de niveau acceptées</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {OFFICIAL_LEVEL_TAGS.map(level => <code key={level} className="rounded-md bg-secondary px-1.5 py-1 text-[10px] font-bold">{level}</code>)}
                        </div>
                    </section>
                </aside>
            </section>
        </main>
    );
};


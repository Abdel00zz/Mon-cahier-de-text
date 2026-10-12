import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import {
    EMPTY_EVALUATION_POLICY,
    EVALUATION_KIND_ORDER,
    clampKindPolicy,
    countPolicyChanges,
    diffKindPolicies,
    isDevoirKind,
    kindSupport,
    resolveAllKindPolicies,
} from '../../domain/evaluations/evaluationPolicy';
import type { EvaluationDocumentMode, EvaluationKindKey, EvaluationKindPolicy } from '../../types';
import { fetchAdminEvaluationPolicy, saveAdminEvaluationPolicy, type AdminEvaluationPolicyState } from '../api';
import './evaluationPolicy.css';

/*
 * POLITIQUE DU CONTRÔLE CONTINU — la direction décide, nature par nature, ce que
 * le cahier transmet à la feuille « Contrôle continu et activités » et ce que
 * l'enseignant y peut faire : contenu, liste d'élèves, retours, notes, absents.
 *
 * Deux portées, comme l'horaire des séances : une politique GÉNÉRALE (écarts aux
 * valeurs historiques) et, par compte, des écarts propres à ce compte. Chaque
 * carte montre en direct la ligne que verra l'enseignant : on règle en voyant.
 */

interface EvaluationPolicyManagerProps {
    onBack: () => void;
    /** Présent : personnalisation du compte. Absent : politique générale. */
    phone?: string;
}

type Draft = Record<EvaluationKindKey, EvaluationKindPolicy>;

const EMPTY_STATE: AdminEvaluationPolicyState = {
    evaluationPolicy: EMPTY_EVALUATION_POLICY,
    globalEvaluationPolicy: EMPTY_EVALUATION_POLICY,
    assignment: null,
};

/** Nom court et rôle de chaque nature, tels que la direction les lit. */
const KIND_COPY: Record<EvaluationKindKey, { name: string; note: string }> = {
    evaluation_diagnostic: { name: 'Évaluation diagnostique', note: 'Évaluation de départ de la classe' },
    controle: { name: 'Devoir surveillé', note: 'Épreuve écrite en classe' },
    controle_court: { name: 'Devoir écrit court', note: 'Épreuve écrite courte' },
    controle_global: { name: 'Devoir écrit global', note: 'Épreuve écrite longue' },
    oral: { name: 'Évaluation orale', note: 'La classe prend la parole' },
    maison: { name: 'Devoir maison', note: 'Travail remis puis corrigé en classe' },
    colle: { name: 'Colle', note: 'Interrogation orale des classes préparatoires' },
    controle_cahiers: { name: 'Contrôle des cahiers', note: 'Constat noté dans la remarque de séance' },
    correction_controle_continu: { name: 'Correction du devoir surveillé', note: 'Séance de correction d’une épreuve' },
    examen_blanc: { name: 'Examen blanc', note: 'Épreuve en conditions d’examen' },
    olympiade: { name: 'Olympiade', note: 'Compétition ouverte aux élèves' },
    concours: { name: 'Concours', note: 'Préparation ou passage d’un concours' },
    soutien: { name: 'Soutien', note: 'Séance d’accompagnement' },
    remediation: { name: 'Remédiation', note: 'Reprise ciblée d’une notion' },
    rattrapage: { name: 'Rattrapage', note: 'Séance pour les élèves absents' },
    autre: { name: 'Autre activité', note: 'Activité libre de la classe' },
};

const FEEDBACK_COPY = {
    levels: 'Niveau atteint par chaque élève',
    submission: 'Rendu ou non rendu',
    notebook: 'État du cahier de chaque élève',
} as const;

const DOCUMENT_OPTIONS: ReadonlyArray<{ value: EvaluationDocumentMode; label: string }> = [
    { value: 'off', label: 'Sans contenu' },
    { value: 'optional', label: 'Facultatif' },
    { value: 'required', label: 'Requis' },
];

const FIELDS = ['transmit', 'continuous', 'document', 'students', 'feedback', 'grades', 'absences'] as const;

/** Les commandes que verra l'enseignant sur la ligne de cette nature, dans l'ordre de la feuille. */
const previewFor = (kind: EvaluationKindKey, policy: EvaluationKindPolicy): { label: string; filled?: 'missing' }[] => {
    const items: { label: string; filled?: 'missing' }[] = [];
    if (policy.document !== 'off') items.push({ label: '+ Contenu', filled: policy.document === 'required' ? 'missing' : undefined });
    if (policy.absences) items.push({ label: 'Absents' });
    if (policy.students) {
        items.push({ label: kind === 'maison' ? 'Remises' : kind === 'oral' || kind === 'colle' ? 'Suivi' : kind === 'controle_cahiers' ? 'Cahiers' : 'Élèves' });
    }
    return items;
};

interface ToggleProps {
    label: string;
    sub?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, sub, checked, disabled, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="policy-toggle"
    >
        <span className="policy-toggle__rail" aria-hidden="true" />
        <span className="policy-toggle__text">
            {label}
            {sub && <span className="policy-toggle__sub">{sub}</span>}
        </span>
    </button>
);

export const EvaluationPolicyManager: React.FC<EvaluationPolicyManagerProps> = ({ onBack, phone }) => {
    const [state, setState] = useState<AdminEvaluationPolicyState>(EMPTY_STATE);
    const [draft, setDraft] = useState<Draft>(() => resolveAllKindPolicies(EMPTY_EVALUATION_POLICY));
    const [draftCustom, setDraftCustom] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const applyState = useCallback((result: AdminEvaluationPolicyState) => {
        setState(result);
        setDraft(resolveAllKindPolicies(result.evaluationPolicy));
        setDraftCustom(Boolean(phone && countPolicyChanges(result.assignment) > 0));
    }, [phone]);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            applyState(await fetchAdminEvaluationPolicy(phone));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chargement de la politique impossible.');
        } finally {
            setIsLoading(false);
        }
    }, [applyState, phone]);

    useEffect(() => { void load(); }, [load]);

    const stored = useMemo(() => resolveAllKindPolicies(state.evaluationPolicy), [state.evaluationPolicy]);
    // Valeur de référence : les défauts (page générale) ou la politique générale (page d'un compte).
    const reference = useMemo(
        () => resolveAllKindPolicies(phone ? state.globalEvaluationPolicy : EMPTY_EVALUATION_POLICY),
        [phone, state.globalEvaluationPolicy],
    );
    const storedCustom = Boolean(phone && countPolicyChanges(state.assignment) > 0);
    const inheriting = Boolean(phone && !draftCustom);
    const locked = isLoading || isSaving || inheriting;

    const same = (left: EvaluationKindPolicy, right: EvaluationKindPolicy) => FIELDS.every(field => left[field] === right[field]);
    const changedKinds = EVALUATION_KIND_ORDER.filter(kind => !same(draft[kind], stored[kind]));
    const changed = changedKinds.length > 0 || (phone ? draftCustom !== storedCustom : false);
    const version = phone ? state.assignment?.version ?? 0 : state.globalEvaluationPolicy.version;
    const updatedAt = phone ? state.assignment?.updatedAt : state.globalEvaluationPolicy.updatedAt;

    const update = (kind: EvaluationKindKey, patch: Partial<EvaluationKindPolicy>) => {
        setMessage(null);
        setDraft(current => ({ ...current, [kind]: clampKindPolicy(kind, { ...current[kind], ...patch }) }));
    };

    const resetDraft = () => {
        setDraft(stored);
        setDraftCustom(storedCustom);
        setError(null);
        setMessage(null);
    };

    const useDefaults = () => {
        setMessage(null);
        setDraft(reference);
    };

    const chooseSource = (custom: boolean) => {
        setMessage(null);
        setDraftCustom(custom);
        // Revenir à la politique générale montre ce que le compte suivra réellement.
        if (!custom) setDraft(resolveAllKindPolicies(state.globalEvaluationPolicy));
        else setDraft(stored);
    };

    const publish = async () => {
        setConfirmOpen(false);
        if (!changed || isSaving) return;
        setIsSaving(true);
        setError(null);
        setMessage(null);
        try {
            const overrides = inheriting
                ? {}
                : diffKindPolicies(draft, phone ? state.globalEvaluationPolicy : EMPTY_EVALUATION_POLICY);
            const result = await saveAdminEvaluationPolicy(overrides, version, phone);
            applyState(result);
            setMessage(phone
                ? inheriting
                    ? 'Ce compte suit désormais la politique générale.'
                    : 'Politique personnalisée publiée. Le compte l’appliquera à sa prochaine synchronisation.'
                : 'Politique générale publiée. Les comptes l’appliqueront à leur prochaine synchronisation.');
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Publication impossible.');
        } finally {
            setIsSaving(false);
        }
    };

    const stats = useMemo(() => {
        const kinds = EVALUATION_KIND_ORDER;
        return {
            transmitted: kinds.filter(kind => draft[kind].transmit).length,
            continuous: kinds.filter(kind => draft[kind].continuous).length,
            students: kinds.filter(kind => draft[kind].students).length,
            graded: kinds.filter(kind => draft[kind].grades).length,
        };
    }, [draft]);

    const continuousKinds = EVALUATION_KIND_ORDER.filter(kind => draft[kind].continuous);
    const otherKinds = EVALUATION_KIND_ORDER.filter(kind => !draft[kind].continuous);

    const renderCard = (kind: EvaluationKindKey) => {
        const policy = draft[kind];
        const support = kindSupport(kind);
        const copy = KIND_COPY[kind];
        const kindChanged = !same(policy, stored[kind]);
        const differs = !same(policy, reference[kind]);
        const preview = previewFor(kind, policy);
        const detail = policy.students
            ? [policy.feedback ? FEEDBACK_COPY[support.feedback] : null, policy.grades ? 'Note /20' : null].filter(Boolean).join(' · ')
            : '';
        return (
            <article key={kind} className="policy-card" data-changed={kindChanged ? 'true' : undefined} data-kind={kind}>
                <header className="policy-card__head">
                    <h3 className="policy-card__name">{copy.name}</h3>
                    <span className="policy-card__note">{copy.note}</span>
                    {differs && !inheriting ? (
                        <button
                            type="button"
                            onClick={() => update(kind, reference[kind])}
                            className="policy-badge min-h-11 cursor-pointer"
                            title={phone ? 'Revenir à la politique générale pour cette nature' : 'Revenir aux valeurs par défaut pour cette nature'}
                        >
                            Rétablir
                        </button>
                    ) : (
                        <span className="policy-badge" data-tone="muted">{phone ? 'Politique générale' : 'Par défaut'}</span>
                    )}
                </header>

                <div className="policy-grid" role="group" aria-label={`Réglages : ${copy.name}`}>
                    <Toggle
                        label="Transmis à la feuille"
                        sub={isDevoirKind(kind) ? 'Depuis le cahier' : 'Cahier ou remarque'}
                        checked={policy.transmit}
                        disabled={locked}
                        onChange={transmit => update(kind, { transmit })}
                    />
                    <Toggle
                        label="Contrôle continu"
                        sub={policy.continuous ? 'Devoirs et évaluations' : 'Activités pédagogiques'}
                        checked={policy.continuous}
                        disabled={locked}
                        onChange={continuous => update(kind, { continuous })}
                    />
                    <Toggle
                        label="Liste d’élèves"
                        checked={policy.students}
                        disabled={locked}
                        onChange={students => update(kind, { students })}
                    />
                    <Toggle
                        label="Retours par élève"
                        sub={FEEDBACK_COPY[support.feedback]}
                        checked={policy.feedback}
                        disabled={locked || !policy.students}
                        onChange={feedback => update(kind, { feedback })}
                    />
                    <Toggle
                        label="Notes /20"
                        sub={support.grades ? undefined : 'Non disponible'}
                        checked={policy.grades}
                        disabled={locked || !support.grades || !policy.feedback}
                        onChange={grades => update(kind, { grades })}
                    />
                    <Toggle
                        label="Absents"
                        sub={support.absences ? undefined : 'Non disponible'}
                        checked={policy.absences}
                        disabled={locked || !support.absences}
                        onChange={absences => update(kind, { absences })}
                    />
                    <div className="policy-document">
                        <span className="policy-document__label" id={`policy-doc-${kind}`}>Contenu (sujet, corrigé)</span>
                        <div className="policy-seg" role="radiogroup" aria-labelledby={`policy-doc-${kind}`}>
                            {DOCUMENT_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={policy.document === option.value}
                                    disabled={locked}
                                    onClick={() => update(kind, { document: option.value })}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="policy-preview" aria-label="Aperçu de la ligne enseignant">
                    <span className="policy-preview__label">Ligne enseignant</span>
                    {preview.length === 0
                        ? <span className="policy-preview__empty">Aucune commande : date et suppression seulement</span>
                        : preview.map(item => (
                            <span key={item.label} className="ev-action" data-filled={item.filled} aria-hidden="true">{item.label}</span>
                        ))}
                    {detail && <span className="policy-preview__empty">{detail}</span>}
                    {!policy.transmit && <span className="policy-preview__empty">Reste dans le cahier, non transmis</span>}
                </div>
            </article>
        );
    };

    return (
        <div className="policy-page mx-auto min-h-dvh max-w-5xl space-y-5 p-4 sm:p-8">
            <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted">
                ← Retour
            </button>

            <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">{phone ? `Compte ${phone}` : 'Politique générale'}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{phone ? 'Contrôle continu du compte' : 'Contrôle continu et activités'}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {phone
                        ? 'Choisissez si cet enseignant suit la politique générale ou ses propres réglages, nature par nature.'
                        : 'Pour chaque nature d’élément du cahier de textes, décidez ce qui est transmis à la feuille « Contrôle continu et activités » et ce que l’enseignant peut y faire. Les données déjà saisies ne sont jamais supprimées.'}
                </p>
            </header>

            {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</div>}
            {message && <div role="status" className="rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{message}</div>}

            {phone && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5" role="radiogroup" aria-label="Source de la politique">
                    <button type="button" role="radio" aria-checked={!draftCustom} onClick={() => chooseSource(false)} disabled={isLoading || isSaving}
                        className={`min-h-11 rounded-xl px-3 text-xs font-black transition-colors ${!draftCustom ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        Politique générale
                    </button>
                    <button type="button" role="radio" aria-checked={draftCustom} onClick={() => chooseSource(true)} disabled={isLoading || isSaving}
                        className={`min-h-11 rounded-xl px-3 text-xs font-black transition-colors ${draftCustom ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        Personnalisée
                    </button>
                </div>
            )}

            <section className="policy-summary" aria-label="Synthèse">
                <div className="policy-stat"><span className="policy-stat__value">{stats.transmitted}</span><span className="policy-stat__label">natures transmises</span></div>
                <div className="policy-stat"><span className="policy-stat__value">{stats.continuous}</span><span className="policy-stat__label">en contrôle continu</span></div>
                <div className="policy-stat"><span className="policy-stat__value">{stats.students}</span><span className="policy-stat__label">avec liste d’élèves</span></div>
                <div className="policy-stat"><span className="policy-stat__value">{stats.graded}</span><span className="policy-stat__label">avec notes</span></div>
            </section>

            {isLoading ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground" role="status">Chargement de la politique…</div>
            ) : (
                <>
                    <section className="space-y-3" aria-labelledby="policy-continuous">
                        <div>
                            <h2 id="policy-continuous" className="policy-family__title">Devoirs et évaluations</h2>
                            <p className="policy-family__hint">Traités comme contrôle continu : ils ouvrent la feuille de l’enseignant.</p>
                        </div>
                        {continuousKinds.length === 0
                            ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Aucune nature n’est traitée comme contrôle continu.</p>
                            : continuousKinds.map(renderCard)}
                    </section>

                    <section className="space-y-3" aria-labelledby="policy-others">
                        <div>
                            <h2 id="policy-others" className="policy-family__title">Activités pédagogiques</h2>
                            <p className="policy-family__hint">Elles racontent l’année de la classe sans entrer dans le contrôle continu.</p>
                        </div>
                        {otherKinds.length === 0
                            ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Toutes les natures sont traitées comme contrôle continu.</p>
                            : otherKinds.map(renderCard)}
                    </section>
                </>
            )}

            <div className="policy-bar" role="region" aria-label="Publication">
                <p className="policy-bar__text">
                    {changed
                        ? `${changedKinds.length || 1} modification${(changedKinds.length || 1) > 1 ? 's' : ''} non publiée${(changedKinds.length || 1) > 1 ? 's' : ''}`
                        : 'Aucune modification en attente'}
                    <small>Version {version}{updatedAt ? ` · publiée le ${new Date(updatedAt).toLocaleString('fr-FR')}` : ' · valeurs par défaut'}</small>
                </p>
                <Button type="button" variant="outline" onClick={resetDraft} disabled={!changed || isSaving} className="min-h-11 rounded-xl">Annuler</Button>
                {!inheriting && (
                    <Button type="button" variant="outline" onClick={useDefaults} disabled={isLoading || isSaving} className="min-h-11 rounded-xl">
                        {phone ? 'Suivre la politique générale' : 'Valeurs par défaut'}
                    </Button>
                )}
                <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!changed || isLoading || isSaving} className="min-h-11 rounded-xl">
                    {isSaving ? 'Publication…' : phone ? 'Publier pour ce compte' : 'Publier pour tous les comptes'}
                </Button>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Publier cette politique ?"
                description={phone
                    ? inheriting
                        ? `Le compte ${phone} suivra de nouveau la politique générale.`
                        : `Seul le compte ${phone} appliquera ces réglages. Les données déjà saisies restent visibles.`
                    : 'Tous les comptes sans réglages propres appliqueront cette politique à leur prochaine synchronisation. Les données déjà saisies restent visibles.'}
                confirmLabel="Publier"
                variant="default"
                onConfirm={() => void publish()}
            />
        </div>
    );
};

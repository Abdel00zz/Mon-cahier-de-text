import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AbsencePeriod, AppConfig, ClassInfo, ContentDirection, LessonsData } from '@/types';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { classSessionsDuring, absenceDates, injectAbsenceLine, notebookSessionDates } from '@/domain/notebook/absenceInjection';
import { defaultContentDirection, detectContentDirection } from '@/domain/notebook/contentDirection';
import { readStoredNotebook } from '@/infrastructure/storage/notebookStorage';
import { saveNotebook } from '@/infrastructure/storage/saveNotebook';
import './absencesTab.css';
import { X } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { StatusNotice } from '@/components/ui/status-notice';
import { SettingsSection } from './SettingsPrimitives';
import { useLocale } from '@/i18n/LocaleProvider';

interface AbsencesTabProps {
    config: AppConfig;
    classes: ClassInfo[];
    onConfigChange: (patch: Partial<AppConfig>) => void;
    /** La rubrique est-elle réellement affichée ? (elle reste montée, masquée en CSS) */
    visible: boolean;
}

/**
 * Absences justifiées (certificats de maladie, congés).
 *
 * Deux effets, indissociables : les dates saisies excluent le retard et taisent
 * les rappels (moteurs partagés), **et** chaque absence pose automatiquement le
 * certificat dans le cahier des classes qui ont une séance pendant l'absence.
 *
 * La ligne est posée À CHAQUE DATE DE SÉANCE, avec le motif pour seul texte :
 * la date appartient à la cellule « date » du tableau, comme pour toute séance,
 * et la fusion par date fait apparaître le certificat dans la MÊME ligne que les
 * contenus de ce jour — un cahier se lit par dates, un certificat n'est pas une
 * plage écrite dans le contenu. L'injection est idempotente : réouvrir la
 * rubrique n'écrit rien de plus, et le message le dit honnêtement.
 */
export const AbsencesTab: React.FC<AbsencesTabProps> = ({ config, classes, onConfigChange, visible }) => {
    const { locale, t } = useLocale();
    const absences = useMemo(() => config.absences ?? [], [config.absences]);
    const startInput = useRef<HTMLInputElement>(null);
    const [debut, setDebut] = useState('');
    const [fin, setFin] = useState('');
    const [motif, setMotif] = useState('');
    const [injected, setInjected] = useState(0);
    const [sessions, setSessions] = useState(0);
    const invalidRange = Boolean(debut && fin && fin < debut);
    const lineTitle = t('notifications.absenceCertificate');

    /*
     * Écrit les lignes manquantes dans chaque cahier concerné : UNE lecture et
     * UNE écriture par classe, même quand plusieurs absences la visent — dix
     * dates corrigées d'un coup font un seul envoi, pas dix.
     *
     * Les dates retenues sont l'UNION de deux sources : les séances prévues à
     * l'emploi du temps, ET les séances que le cahier porte déjà (contenus
     * datés). L'emploi du temps peut être vide ou pas encore synchronisé sur
     * l'appareil ; s'y fier seul rendait le certificat invisible alors que le
     * cahier montrait bel et bien des séances à ces dates.
     */
    const inject = useCallback((periods: AbsencePeriod[]) => {
        const classIds = classes.map(item => item.id);
        const timetableDates = new Map<string, string[]>();
        const window = new Set<string>();
        const motifByDate = new Map<string, string>();
        for (const period of periods) {
            for (const date of absenceDates(period)) {
                window.add(date);
                // Deux absences qui se chevauchent : le premier motif saisi gagne.
                if (!motifByDate.has(date)) motifByDate.set(date, period.motif?.trim() ?? '');
            }
            for (const { classId, dates } of classSessionsDuring(config.timetable, config.timetableClock, period, classIds)) {
                timetableDates.set(classId, [...new Set([...(timetableDates.get(classId) ?? []), ...dates])]);
            }
        }
        let notebooks = 0;
        let lines = 0;
        let targets = 0;
        for (const classId of classIds) {
            let stored: { lessonsData: unknown; contentDirection?: ContentDirection };
            try {
                stored = readStoredNotebook(classId);
            } catch {
                continue; // Cahier illisible : jamais remplacé à l'aveugle.
            }
            const fromNotebook = notebookSessionDates(stored.lessonsData).filter(date => window.has(date));
            const dates = [...new Set([...(timetableDates.get(classId) ?? []), ...fromNotebook])].sort();
            if (dates.length === 0) continue;
            targets += 1;
            let lessons = stored.lessonsData;
            let changed = false;
            for (const date of dates) {
                const next = injectAbsenceLine(lessons, {
                    date,
                    title: lineTitle,
                    // Le texte raconte l'absence, la date la situe : rien à répéter.
                    description: motifByDate.get(date) || '',
                    id: `free-absence-${classId}-${date}`,
                });
                if (!next) continue; // ligne déjà posée pour cette date
                lessons = next;
                changed = true;
                lines += 1;
            }
            if (!changed) continue;
            const direction = stored.contentDirection
                ?? detectContentDirection(lessons, defaultContentDirection(locale)).direction;
            saveNotebook(classId, lessons as unknown as LessonsData, direction);
            notebooks += 1;
        }
        return { targets, notebooks, lines };
    }, [classes, config.timetable, config.timetableClock, lineTitle, locale]);

    /*
     * Injection automatique : à l'ouverture de la rubrique et à chaque
     * changement d'absence, les cahiers concernés reçoivent les lignes
     * manquantes. Aucune écriture quand tout est déjà en place (jamais de bruit
     * réseau).
     */
    useEffect(() => {
        if (!visible) return;
        const result = inject(absences);
        setInjected(current => current === result.lines ? current : result.lines);
        setSessions(current => current === result.targets ? current : result.targets);
    }, [absences, inject, visible]);

    const addAbsence = () => {
        if (!debut || invalidRange) return;
        const effectiveFin = fin && fin >= debut ? fin : debut;
        onConfigChange({ absences: [...absences, { debut, fin: effectiveFin, motif: motif.trim() || undefined }] });
        setDebut('');
        setFin('');
        setMotif('');
        startInput.current?.focus();
    };

    const removeAbsence = (index: number) => {
        onConfigChange({ absences: absences.filter((_, i) => i !== index) });
    };

    return (
        <SettingsSection
            title={t('notifications.absences')}
            hint={t('notifications.absenceHint')}
            separators={false}
        >
            {absences.length > 0 && (
                <ul className="space-y-2">
                    {absences.map((absence, index) => (
                        <li
                            key={`${absence.debut}-${index}`}
                            className="flex items-center justify-between gap-2 absence-period flex-wrap rounded-lg bg-muted/50 px-3 py-2 text-sm"
                        >
                            <span className="min-w-0 flex-1 font-medium text-foreground font-sans">
                                <bdi dir="ltr">{formatDateDDMMYYYY(absence.debut)}</bdi>
                                {absence.fin !== absence.debut && <> – <bdi dir="ltr">{formatDateDDMMYYYY(absence.fin)}</bdi></>}
                                {absence.motif && <span className="mt-1 block text-xs font-normal text-muted-foreground">{absence.motif}</span>}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeAbsence(index)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                                aria-label={t('notifications.deleteAbsence')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={event => { event.preventDefault(); addAbsence(); }} className="absence-form grid grid-cols-2 items-end gap-3">
                <label className="min-w-0 space-y-1.5 text-sm text-muted-foreground">
                    <span>{t('notifications.absenceStart')}</span>
                    <input
                        type="date"
                        ref={startInput}
                        required
                        value={debut}
                        onChange={e => setDebut(e.target.value)}
                        className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        aria-label={t('notifications.absenceStart')}
                    />
                </label>
                <label className="min-w-0 space-y-1.5 text-sm text-muted-foreground">
                    <span>{t('notifications.absenceEnd')}</span>
                    <input
                        type="date"
                        value={fin}
                        min={debut || undefined}
                        onChange={e => setFin(e.target.value)}
                        className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        aria-label={t('notifications.absenceEnd')}
                        aria-invalid={invalidRange || undefined}
                        aria-describedby={invalidRange ? 'absence-range-error' : undefined}
                    />
                </label>
                <label className="col-span-full space-y-1.5 text-sm text-muted-foreground">
                  <span>{t('notifications.reasonOptional')}</span>
                  <input
                    type="text"
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder={t('notifications.reasonOptional')}
                    aria-label={t('notifications.reasonOptional')}
                    className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                </label>
                <Button
                    type="submit"
                    disabled={!debut || invalidRange}
                    className="col-span-full min-h-11 text-sm"
                >
                    {t('notifications.add')}
                </Button>
            </form>
            {invalidRange && <div id="absence-range-error"><StatusNotice tone="error" title={t('notifications.absenceRangeError')} announce /></div>}

            {absences.length > 0 && (
                <p className="mt-3 text-[13px] leading-snug text-muted-foreground" role="status" aria-live="polite">
                    {sessions === 0
                        ? t('notifications.absenceNoSession')
                        : t(injected > 0 ? 'notifications.absenceInjected' : 'notifications.absenceAlready')}
                </p>
            )}
        </SettingsSection>
    );
};

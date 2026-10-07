import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AbsencePeriod, AppConfig, ClassInfo, ContentDirection, LessonsData } from '@/types';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { classSessionsDuring, absenceDates, injectAbsenceLine } from '@/domain/notebook/absenceInjection';
import { defaultContentDirection, detectContentDirection } from '@/domain/notebook/contentDirection';
import { readStoredNotebook } from '@/infrastructure/storage/notebookStorage';
import { saveNotebook } from '@/infrastructure/storage/saveNotebook';
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
     */
    const inject = useCallback((periods: AbsencePeriod[]) => {
        const classIds = classes.map(item => item.id);
        const datesByClass = new Map<string, string[]>();
        const motifByDate = new Map<string, string>();
        for (const period of periods) {
            for (const { classId, dates } of classSessionsDuring(config.timetable, config.timetableClock, period, classIds)) {
                datesByClass.set(classId, [...new Set([...(datesByClass.get(classId) ?? []), ...dates])]);
            }
            for (const date of absenceDates(period)) {
                // Deux absences qui se chevauchent : le premier motif saisi gagne.
                if (!motifByDate.has(date)) motifByDate.set(date, period.motif?.trim() ?? '');
            }
        }
        let notebooks = 0;
        let lines = 0;
        for (const [classId, dates] of datesByClass) {
            let stored: { lessonsData: unknown; contentDirection?: ContentDirection };
            try {
                stored = readStoredNotebook(classId);
            } catch {
                continue; // Cahier illisible : jamais remplacé à l'aveugle.
            }
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
        return { targets: datesByClass.size, notebooks, lines };
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
    };

    const removeAbsence = (index: number) => {
        onConfigChange({ absences: absences.filter((_, i) => i !== index) });
    };

    return (
        <SettingsSection
            title={t('notifications.absences')}
            hint={t('notifications.absenceHint')}
        >
            {absences.length > 0 && (
                <ul className="space-y-2">
                    {absences.map((absence, index) => (
                        <li
                            key={`${absence.debut}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-1 text-sm"
                        >
                            <span className="font-bold text-foreground font-sans">
                                {formatDateDDMMYYYY(absence.debut)}
                                {absence.fin !== absence.debut && ` → ${formatDateDDMMYYYY(absence.fin)}`}
                                {absence.motif && <span className="ml-1.5 font-medium text-muted-foreground">· {absence.motif}</span>}
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

            <div className="mt-3.5 grid grid-cols-1 items-end gap-3 min-[400px]:grid-cols-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                <label className="min-w-0 space-y-1.5 text-sm text-muted-foreground">
                    <span>{t('notifications.absenceStart')}</span>
                    <input
                        type="date"
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
                <input
                    type="text"
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder={t('notifications.reasonOptional')}
                    aria-label={t('notifications.reasonOptional')}
                    className="col-span-full h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                    type="button"
                    onClick={addAbsence}
                    disabled={!debut || invalidRange}
                    className="col-span-full text-sm sm:col-span-1"
                >
                    {t('notifications.add')}
                </Button>
            </div>
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

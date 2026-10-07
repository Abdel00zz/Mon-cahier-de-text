import React, { useMemo, useRef, useState } from 'react';
import type { AppConfig, ClassInfo } from '@/types';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
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

/** Absences administratives : config.absences est la source unique, hors du plan pédagogique. */
export const AbsencesTab: React.FC<AbsencesTabProps> = ({ config, onConfigChange }) => {
    const { t } = useLocale();
    const absences = useMemo(() => config.absences ?? [], [config.absences]);
    const startInput = useRef<HTMLInputElement>(null);
    const [debut, setDebut] = useState('');
    const [fin, setFin] = useState('');
    const [motif, setMotif] = useState('');
    const invalidRange = Boolean(debut && fin && fin < debut);

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
                    {t('notifications.absenceSeparated')}
                </p>
            )}
        </SettingsSection>
    );
};

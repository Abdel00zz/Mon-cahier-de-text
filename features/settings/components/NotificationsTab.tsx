import React, { useState } from 'react';
import { AbsencePeriod, AppConfig, NotificationSettings } from '@/types';
import { defaultNotificationSettings } from '@/hooks/useConfigManager';
import { isStandalone, pushSupported, sendTestNotification, subscribeToPush, unsubscribeFromPush } from '@/utils/push';
import { formatDateDDMMYYYY } from '@/utils/dataUtils';
import { Bell, CalendarCheck, Clock, TriangleAlert, X } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NotificationsTabProps {
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }> = ({
    checked,
    onChange,
    label,
    hint,
    disabled,
}) => (
    <div className={`flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 ${disabled ? 'opacity-60' : ''}`}>
        <div className="flex flex-col text-left">
            <Label className="text-xs font-bold text-foreground font-sans leading-none">{label}</Label>
            {hint && <span className="mt-1.5 block text-[11px] text-muted-foreground font-sans leading-normal">{hint}</span>}
        </div>
        <Switch
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
        />
    </div>
);

const NotificationKind: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
}> = ({ icon: Icon, label, detail }) => (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-card px-2.5 py-2 shadow-sm ring-1 ring-border/70">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
            <span className="block truncate text-[11px] font-bold text-foreground">{label}</span>
            <span className="block truncate text-[9px] font-medium text-muted-foreground">{detail}</span>
        </span>
    </div>
);

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ config, onChange }) => {
    const settings = config.notificationSettings ?? { ...defaultNotificationSettings };
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const patch = (updates: Partial<NotificationSettings>) =>
        onChange({ notificationSettings: { ...settings, ...updates } });

    const supported = pushSupported();
    const standalone = isStandalone();
    const iosNeedsInstall = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone;
    const vibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    const handlePushToggle = async (enable: boolean) => {
        setBusy(true);
        setMessage(null);
        try {
            if (enable) {
                const result = await subscribeToPush();
                if (result.ok) {
                    patch({ pushEnabled: true });
                    setMessage('Notifications push activées sur cet appareil.');
                } else {
                    setMessage(`Activation impossible : ${result.reason ?? 'erreur inconnue'}.`);
                }
            } else {
                await unsubscribeFromPush();
                patch({ pushEnabled: false });
                setMessage('Notifications push désactivées sur cet appareil.');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
                Recevez des rappels intelligents lorsque votre cahier prend du retard — jamais pendant les vacances, les
                jours fériés ou le week-end.
            </p>

            <div className="rounded-xl border border-border bg-secondary/35 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-xs font-bold text-foreground">Alertes natives du téléphone</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Elles apparaissent dans la bannière système, l'écran verrouillé et le centre de notifications selon les réglages du téléphone.
                        </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Autorisées' : 'Non activées'}
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <NotificationKind icon={TriangleAlert} label="Retard du cahier" detail="Cron intelligent" />
                    <NotificationKind icon={Clock} label="Fin de séance" detail="Rappel local" />
                    <NotificationKind icon={CalendarCheck} label="Date manquante" detail="Après le cours" />
                    <NotificationKind icon={Bell} label="Administration" detail="Message direct" />
                </div>
            </div>

            <Toggle
                label="Alertes dans l'application"
                hint="Bannière affichée sur le tableau de bord en cas de retard."
                checked={settings.enabled}
                onChange={v => patch({ enabled: v })}
            />

            <Toggle
                label="Notifications push sur cet appareil"
                hint={
                    iosNeedsInstall
                        ? "Sur iPhone/iPad, installez d'abord l'application sur l'écran d'accueil."
                        : !supported
                          ? "Cet appareil ne prend pas en charge les notifications push."
                          : 'Recevez une notification même quand l\'application est fermée.'
                }
                checked={settings.pushEnabled}
                onChange={handlePushToggle}
                disabled={busy || !supported || iosNeedsInstall}
            />

            <Toggle
                label="Rappels de fin de séance sur cet appareil"
                hint={
                    vibrationSupported
                        ? 'Vibration une minute avant la fin de chaque séance, et alerte si aucune date n\'a été affectée.'
                        : 'Cet appareil ne prend pas en charge la vibration — les rappels s\'affichent en notification visuelle.'
                }
                checked={settings.sessionVibration ?? false}
                onChange={v => patch({ sessionVibration: v })}
                disabled={!settings.enabled}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="rounded-xl border border-border bg-card p-3">
                    <span className="block text-xs font-semibold text-foreground font-sans">Seuil de retard</span>
                    <select
                        value={settings.gapThreshold}
                        onChange={e => patch({ gapThreshold: Number(e.target.value) })}
                        className="mt-1.5 h-9 w-full rounded-md border border-border/80 bg-card text-foreground px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <option value={1}>1 séance de retard</option>
                        <option value={2}>2 séances de retard</option>
                        <option value={3}>3 séances de retard</option>
                    </select>
                </label>
                <label className="rounded-xl border border-border bg-card p-3">
                    <span className="block text-xs font-semibold text-foreground font-sans">Inactivité</span>
                    <select
                        value={settings.inactivityThresholdDays}
                        onChange={e => patch({ inactivityThresholdDays: Number(e.target.value) })}
                        className="mt-1.5 h-9 w-full rounded-md border border-border/80 bg-card text-foreground px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <option value={3}>Après 3 jours de classe</option>
                        <option value={5}>Après 5 jours de classe</option>
                        <option value={10}>Après 10 jours de classe</option>
                    </select>
                </label>
            </div>

            <Toggle
                label="Silence pendant les vacances"
                hint="Aucune alerte durant les vacances scolaires et jours fériés."
                checked={settings.quietDuringVacations}
                onChange={v => patch({ quietDuringVacations: v })}
            />

            {settings.pushEnabled && (
                <button
                    type="button"
                    onClick={async () => {
                        setBusy(true);
                        const ok = await sendTestNotification();
                        setMessage(ok ? 'Notification de test envoyée.' : "Échec de l'envoi du test.");
                        setBusy(false);
                    }}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-border/80 bg-card text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 transition-colors"
                >
                    Envoyer une notification de test
                </button>
            )}

            {message && <p className="rounded-lg bg-secondary border border-border/60 px-3 py-2 text-[11px] font-medium text-foreground">{message}</p>}

            <AbsencesSection
                absences={config.absences ?? []}
                onChange={absences => onChange({ absences })}
            />
        </div>
    );
};

/* ── Absences justifiées (certificats de maladie, congés) ─────────────────── */

const AbsencesSection: React.FC<{
    absences: AbsencePeriod[];
    onChange: (absences: AbsencePeriod[]) => void;
}> = ({ absences, onChange }) => {
    const [debut, setDebut] = useState('');
    const [fin, setFin] = useState('');
    const [motif, setMotif] = useState('');

    const addAbsence = () => {
        if (!debut) return;
        const effectiveFin = fin && fin >= debut ? fin : debut;
        onChange([...absences, { debut, fin: effectiveFin, motif: motif.trim() || undefined }]);
        setDebut('');
        setFin('');
        setMotif('');
    };

    const removeAbsence = (index: number) => {
        onChange(absences.filter((_, i) => i !== index));
    };

    return (
        <div className="rounded-xl border border-border bg-card p-3">
            <h4 className="text-xs font-semibold text-foreground font-display">Absences justifiées</h4>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground font-sans">
                Certificat de maladie, congé... Ces périodes sont exclues du calcul de retard et aucune alerte
                n'est envoyée pendant.
            </p>

            {absences.length > 0 && (
                <ul className="mt-2.5 space-y-1.5">
                    {absences.map((absence, index) => (
                        <li
                            key={`${absence.debut}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-lg bg-secondary border border-border/30 px-2.5 py-1.5 text-[11px]"
                        >
                            <span className="font-semibold text-foreground font-sans">
                                {formatDateDDMMYYYY(absence.debut)}
                                {absence.fin !== absence.debut && ` → ${formatDateDDMMYYYY(absence.fin)}`}
                                {absence.motif && <span className="ml-1.5 font-normal text-muted-foreground font-mono">· {absence.motif}</span>}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeAbsence(index)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                aria-label="Supprimer cette absence"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                <input
                    type="date"
                    value={debut}
                    onChange={e => setDebut(e.target.value)}
                    className="h-10 rounded-md border border-border/80 bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label="Début de l'absence"
                />
                <input
                    type="date"
                    value={fin}
                    min={debut || undefined}
                    onChange={e => setFin(e.target.value)}
                    className="h-10 rounded-md border border-border/80 bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label="Fin de l'absence"
                />
                <input
                    type="text"
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder="Motif (optionnel)"
                    className="col-span-2 h-10 rounded-md border border-border/80 bg-card px-2 text-xs text-foreground sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                    type="button"
                    onClick={addAbsence}
                    disabled={!debut}
                    className="col-span-2 h-10 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40 sm:col-span-1 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                    Ajouter
                </button>
            </div>
        </div>
    );
};

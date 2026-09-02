import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AbsencePeriod, AppConfig, NotificationSettings } from '@/types';
import { defaultNotificationSettings } from '@/hooks/useConfigManager';
import {
    activateNativeNotifications,
    getPushNotificationState,
    isIOSDevice,
    isStandalone,
    pushSupported,
    sendTestNotification,
    unsubscribeFromPush,
    type PushNotificationState,
} from '@/utils/push';
import { formatDateDDMMYYYY } from '@/utils/dataUtils';
import { Bell, CalendarCheck, Check, Clock, Download, TriangleAlert, X } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/i18n/LocaleProvider';

type Translate = ReturnType<typeof useLocale>['t'];

/**
 * Carte d'activation des rappels push, le geste explicite qui remplace la
 * demande de permission autrefois noyée dans l'onboarding. États clairs :
 * non supporté · installation iOS requise · bloqué (navigateur) · activé ·
 * à activer. Tout en tokens du design system (aucune couleur en dur).
 */
const PushActivationCard: React.FC<{
    state: PushNotificationState;
    checking: boolean;
    busy: boolean;
    onActivate: () => void;
    onDeactivate: () => void;
    onTest: () => void;
    t: Translate;
}> = ({ state, checking, busy, onActivate, onDeactivate, onTest, t }) => {
    const supported = pushSupported();
    const iosNeedsInstall = isIOSDevice() && !isStandalone();
    const active = state.permission === 'granted' && state.subscribed && state.serverRegistered === true;
    const permission = state.permission;

    const stateDetails = (
        <dl className="mt-3 grid grid-cols-3 gap-1.5" aria-label={t('notifications.state.title')}>
            <div className="min-w-0 rounded-lg bg-muted/55 px-2 py-1.5">
                <dt className="truncate text-[9px] font-semibold text-muted-foreground">{t('notifications.state.permission')}</dt>
                <dd className="mt-0.5 truncate text-[10px] font-bold text-foreground">
                    {permission === 'granted'
                        ? t('notifications.state.allowed')
                        : permission === 'denied'
                            ? t('notifications.state.blocked')
                            : permission === 'unsupported'
                                ? t('notifications.state.unavailable')
                                : t('notifications.state.notAllowed')}
                </dd>
            </div>
            <div className="min-w-0 rounded-lg bg-muted/55 px-2 py-1.5">
                <dt className="truncate text-[9px] font-semibold text-muted-foreground">{t('notifications.state.browser')}</dt>
                <dd className="mt-0.5 truncate text-[10px] font-bold text-foreground">
                    {checking ? t('notifications.state.checking') : state.subscribed ? t('notifications.state.active') : t('notifications.state.inactive')}
                </dd>
            </div>
            <div className="min-w-0 rounded-lg bg-muted/55 px-2 py-1.5">
                <dt className="truncate text-[9px] font-semibold text-muted-foreground">{t('notifications.state.server')}</dt>
                <dd className="mt-0.5 truncate text-[10px] font-bold text-foreground">
                    {checking || state.serverRegistered === null
                        ? t('notifications.state.checking')
                        : state.serverRegistered
                            ? t('notifications.state.registered')
                            : t('notifications.state.notRegistered')}
                </dd>
            </div>
        </dl>
    );

    // Cas informatifs (aucune action possible)
    if (!supported || iosNeedsInstall) {
        return (
            <div className="settings-surface flex items-start gap-3.5 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
                    {iosNeedsInstall ? <Download className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{t('notifications.remindersTitle')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {iosNeedsInstall ? t('notifications.pushIosInstall') : t('notifications.pushUnsupported')}
                    </p>
                    {stateDetails}
                </div>
            </div>
        );
    }

    // Bloqué par le navigateur : ré-autorisation impossible par API.
    if (permission === 'denied' && !active) {
        return (
            <div className="flex items-start gap-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs backdrop-blur-xl">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <TriangleAlert className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">{t('notifications.remindersTitle')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('notifications.permissionDenied')}</p>
                    {stateDetails}
                    {(state.subscribed || state.serverRegistered === true) && (
                        <button
                            type="button"
                            onClick={onDeactivate}
                            disabled={busy || checking}
                            className="mt-3 h-9 rounded-md px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                            {t('notifications.turnOff')}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Activé : état de succès + test + désactivation.
    if (active) {
        return (
            <div className="settings-surface p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-5 w-5 stroke-[2.5]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{t('notifications.remindersTitle')}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('notifications.remindersActive')}</p>
                        {stateDetails}
                    </div>
                </div>
                <div className="mt-3.5 flex items-center gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onTest}
                        disabled={busy || checking}
                        className="h-9.5 flex-1 rounded-md border border-white/[0.12] dark:border-white/[0.08] bg-background/80 text-xs font-bold text-foreground transition-all hover:bg-card disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                        {t('notifications.sendTest')}
                    </button>
                    <button
                        type="button"
                        onClick={onDeactivate}
                        disabled={busy || checking}
                        className="h-9.5 rounded-md px-3 text-xs font-bold text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer"
                    >
                        {t('notifications.turnOff')}
                    </button>
                </div>
            </div>
        );
    }

    // À activer : le vrai CTA (permission + abonnement en un geste).
    const label = permission === 'granted' ? t('notifications.finalizeReminders') : t('notifications.enableReminders');
    return (
        <div className="settings-surface p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
                    <Bell className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t('notifications.remindersTitle')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('notifications.pushHint')}</p>
                    {stateDetails}
                </div>
            </div>
            <button
                type="button"
                onClick={onActivate}
                disabled={busy || checking}
                className="mt-3.5 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
                <Bell className="h-4 w-4" />
                {label}
            </button>
        </div>
    );
};

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
    <div className={`settings-surface flex items-start justify-between gap-3 p-4 ${disabled ? 'opacity-60' : ''}`}>
        <div className="flex flex-col text-start">
            <Label className="text-xs font-bold text-foreground font-sans leading-none">{label}</Label>
            {hint && <span className="mt-1.5 block text-xs text-muted-foreground font-sans leading-normal">{hint}</span>}
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
    <div className="flex min-w-0 items-center gap-2.5 rounded-md bg-zinc-100 p-2.5 shadow-none dark:bg-zinc-800/80">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
            <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-foreground">{label}</span>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">{detail}</span>
        </span>
    </div>
);

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ config, onChange }) => {
    const { t } = useLocale();
    const settings = config.notificationSettings ?? { ...defaultNotificationSettings };
    const [busy, setBusy] = useState(false);
    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [pushState, setPushState] = useState<PushNotificationState>(() => ({
        permission: pushSupported() && typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
        subscribed: false,
        serverRegistered: null,
    }));
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    const patch = useCallback((updates: Partial<NotificationSettings>) => {
        onChange({ notificationSettings: { ...settingsRef.current, ...updates } });
    }, [onChange]);

    const vibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    const stateIsActive = (state: PushNotificationState) =>
        state.permission === 'granted' && state.subscribed && state.serverRegistered === true;

    // Réconcilie le réglage local avec les trois couches réelles, sans afficher
    // de demande d'autorisation et sans attendre indéfiniment un SW absent.
    useEffect(() => {
        let cancelled = false;
        setChecking(true);
        void getPushNotificationState()
            .then(state => {
                if (cancelled) return;
                setPushState(state);
                if (state.serverRegistered !== null) {
                    const active = stateIsActive(state);
                    if (settingsRef.current.pushEnabled !== active) patch({ pushEnabled: active });
                }
                if (state.reason === 'serverStatusUnavailable' || state.reason === 'nativeUnavailable') {
                    setMessage(t('notifications.statusCheckFailed'));
                }
            })
            .catch(() => {
                if (!cancelled) setMessage(t('notifications.statusCheckFailed'));
            })
            .finally(() => {
                if (!cancelled) setChecking(false);
            });
        return () => {
            cancelled = true;
        };
    }, [patch, t]);

    // Un seul geste : autorisation système + abonnement serveur.
    const handleActivate = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await activateNativeNotifications();
            setPushState(result);
            const active = stateIsActive(result);
            patch({ pushEnabled: active });
            if (active) {
                setMessage(t('notifications.pushEnabled'));
            } else {
                const reason = result.reason
                    ? t(`notifications.activationReason.${result.reason}`)
                    : t('notifications.unknownReason');
                setMessage(t('notifications.activationFailed', { reason }));
            }
        } catch {
            setMessage(t('notifications.activationUnexpectedError'));
        } finally {
            setBusy(false);
        }
    };

    const handleDeactivate = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await unsubscribeFromPush();
            const state = await getPushNotificationState();
            setPushState(state);
            if (state.serverRegistered !== null) patch({ pushEnabled: stateIsActive(state) });
            if (result.ok) {
                setMessage(t('notifications.pushDisabled'));
            } else if (result.localUnsubscribed && !result.serverUnregistered) {
                setMessage(t('notifications.pushDisabledCleanupPending'));
            } else {
                setMessage(t('notifications.deactivationFailed'));
            }
        } catch {
            setMessage(t('notifications.deactivationFailed'));
        } finally {
            setBusy(false);
        }
    };

    const handleTest = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await sendTestNotification();
            setMessage(result.ok
                ? t('notifications.testSuccess')
                : result.sent === 0
                    ? t('notifications.testNoDelivery')
                    : t('notifications.testFailure'));
        } catch {
            setMessage(t('notifications.testFailure'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
                {t('notifications.intro')}
            </p>

            {/* Activation explicite des rappels push */}
            <PushActivationCard
                state={pushState}
                checking={checking}
                busy={busy}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onTest={handleTest}
                t={t}
            />

            <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs">
                <h4 className="text-xs font-bold text-foreground">{t('notifications.nativeTitle')}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {t('notifications.nativeDescription')}
                </p>
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <NotificationKind icon={TriangleAlert} label={t('notifications.kindDelay')} detail={t('notifications.smartCheck')} />
                    <NotificationKind icon={Clock} label={t('notifications.kindEnd')} detail={t('notifications.localReminder')} />
                    <NotificationKind icon={CalendarCheck} label={t('notifications.kindMissingDate')} detail={t('notifications.afterClass')} />
                    <NotificationKind icon={Bell} label={t('notifications.kindAdmin')} detail={t('notifications.directMessage')} />
                </div>
            </div>

            <Toggle
                label={t('notifications.inApp')}
                hint={t('notifications.inAppHint')}
                checked={settings.enabled}
                onChange={v => patch({ enabled: v })}
            />

            <Toggle
                label={t('notifications.vibration')}
                hint={
                    vibrationSupported
                        ? t('notifications.vibrationHint')
                        : t('notifications.vibrationUnsupported')
                }
                checked={settings.sessionVibration ?? false}
                onChange={v => patch({ sessionVibration: v })}
                disabled={!settings.enabled}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="settings-surface flex flex-col justify-between p-4">
                    <span className="block text-xs font-bold text-foreground font-sans">{t('notifications.delayThreshold')}</span>
                    <select
                        value={settings.gapThreshold}
                        onChange={e => patch({ gapThreshold: Number(e.target.value) })}
                        className="mt-2 h-10 w-full rounded-md border border-white/[0.12] dark:border-white/[0.08] bg-background/80 text-foreground px-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                    >
                        {[1, 2, 3].map(count => (
                            <option key={count} value={count}>
                                {t(count === 1 ? 'notifications.delayedSessions.one' : count === 2 ? 'notifications.delayedSessions.two' : 'notifications.delayedSessions.many', { count })}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="settings-surface flex flex-col justify-between p-4">
                    <span className="block text-xs font-bold text-foreground font-sans">{t('notifications.inactivity')}</span>
                    <select
                        value={settings.inactivityThresholdDays}
                        onChange={e => patch({ inactivityThresholdDays: Number(e.target.value) })}
                        className="mt-2 h-10 w-full rounded-md border border-white/[0.12] dark:border-white/[0.08] bg-background/80 text-foreground px-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                    >
                        {[3, 5, 10].map(count => <option key={count} value={count}>{t('notifications.inactiveDays', { count })}</option>)}
                    </select>
                </label>
            </div>

            <Toggle
                label={t('notifications.quiet')}
                hint={t('notifications.quietHint')}
                checked={settings.quietDuringVacations}
                onChange={v => patch({ quietDuringVacations: v })}
            />

            {message && <p role="status" aria-live="polite" className="settings-surface px-3.5 py-2.5 text-xs font-bold text-foreground">{message}</p>}

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
    const { t } = useLocale();
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
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-foreground">{t('notifications.absences')}</h4>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground font-sans">
                {t('notifications.absencesHint')}
            </p>

            {absences.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {absences.map((absence, index) => (
                        <li
                            key={`${absence.debut}-${index}`}
                            className="settings-surface flex items-center justify-between gap-2 px-3 py-2 text-xs"
                        >
                            <span className="font-bold text-foreground font-sans">
                                {formatDateDDMMYYYY(absence.debut)}
                                {absence.fin !== absence.debut && ` → ${formatDateDDMMYYYY(absence.fin)}`}
                                {absence.motif && <span className="ml-1.5 font-medium text-muted-foreground">· {absence.motif}</span>}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeAbsence(index)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                                aria-label={t('notifications.deleteAbsence')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                <input
                    type="date"
                    value={debut}
                    onChange={e => setDebut(e.target.value)}
                    className="h-10 rounded-md border border-white/[0.12] dark:border-white/[0.08] bg-background/80 px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    aria-label={t('notifications.absenceStart')}
                />
                <input
                    type="date"
                    value={fin}
                    min={debut || undefined}
                    onChange={e => setFin(e.target.value)}
                    className="h-10 rounded-md border border-white/[0.12] dark:border-white/[0.08] bg-background/80 px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    aria-label={t('notifications.absenceEnd')}
                />
                <input
                    type="text"
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder={t('notifications.reasonOptional')}
                    className="col-span-2 h-10 rounded-md border border-white/[0.12] dark:border-white/[0.08] bg-background/80 px-3 text-xs text-foreground sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
                <button
                    type="button"
                    onClick={addAbsence}
                    disabled={!debut}
                    className="col-span-2 h-10 cursor-pointer rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-40 sm:col-span-1"
                >
                    {t('notifications.add')}
                </button>
            </div>
        </div>
    );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AbsencePeriod, AppConfig, NotificationSettings } from '@/types';
import { defaultNotificationSettings } from '@/hooks/useConfigManager';
import {
    activateNativeNotifications,
    getPushNotificationState,
    hasPendingPushCleanup,
    isIOSDevice,
    isStandalone,
    pushSupported,
    sendTestNotification,
    unsubscribeFromPush,
    type PushNotificationState,
} from '@/infrastructure/push/push';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { Bell, CalendarCheck, Clock, TriangleAlert, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { StatusNotice, type NoticeTone } from '@/components/ui/status-notice';
import { Switch } from '@/components/ui/switch';
import { SettingsRow, SettingsSection, settingsFieldClass } from './SettingsPrimitives';
import { useLocale } from '@/i18n/LocaleProvider';
import { captureWorkspaceLease } from '@/infrastructure/storage/accountWorkspace';

type Translate = ReturnType<typeof useLocale>['t'];

/**
 * Carte d'activation des rappels push, le geste explicite qui remplace la
 * demande de permission autrefois noyée dans l'onboarding. États clairs :
 * non supporté · installation iOS requise · bloqué (navigateur) · activé ·
 * à activer. Tout en tokens du design system (aucune couleur en dur).
 */
export const PushActivationCard: React.FC<{
    state: PushNotificationState;
    checking: boolean;
    busy: boolean;
    onActivate: () => void;
    onDeactivate: () => void;
    onTest: () => void;
    onOpenSettings?: () => void;
    t: Translate;
    supported?: boolean;
    iosNeedsInstall?: boolean;
}> = ({ state, checking, busy, onActivate, onDeactivate, onTest, onOpenSettings, t, supported = pushSupported(), iosNeedsInstall = supported && isIOSDevice() && !isStandalone() }) => {
    const local = state.delivery === 'local';
    const active = state.permission === 'granted' && (local ? state.subscribed : state.remoteAvailable === false);
    const blocked = state.permission === 'denied' && !active;
    const unavailable = !supported || iosNeedsInstall;
    const description = iosNeedsInstall ? t('notifications.pushIosInstall')
        : !supported ? t('notifications.pushUnsupported')
        : checking ? t('notifications.state.checking')
        : blocked ? t(local ? 'notifications.nativePermissionDenied' : 'notifications.permissionDenied')
        : local ? t('notifications.nativeRemindersDescription')
        : active ? t('notifications.remindersActive')
        : t('notifications.remindersReady');
    const diagnostics = [
        [t('notifications.state.permission'), state.permission === 'granted'
            ? t('notifications.state.allowed')
            : state.permission === 'denied' ? t('notifications.state.blocked')
            : state.permission === 'unsupported' ? t('notifications.state.unavailable')
            : t('notifications.state.notAllowed')],
        [t(local ? 'notifications.nativeDevice' : 'notifications.state.browser'), checking ? t('notifications.state.checking')
            : state.subscribed ? t('notifications.state.active') : t('notifications.state.inactive')],
        [t(local ? 'notifications.nativeRemote' : 'notifications.state.server'), checking ? t('notifications.state.checking')
            : state.serverRegistered === null ? t('notifications.state.unavailable')
            : state.serverRegistered ? t('notifications.state.registered') : t(local ? 'notifications.nativeRemotePending' : 'notifications.state.notRegistered')],
    ];
    return (
        <StatusNotice
            tone={blocked ? 'warning' : active ? 'success' : 'info'}
            title={t(local ? 'notifications.nativeRemindersTitle' : 'notifications.remindersTitle')}
            description={description}
        >
            {local && blocked && onOpenSettings && (
                <Button variant="outline" disabled={busy || checking} onClick={onOpenSettings}>
                    {t('notifications.nativeOpenSettings')}
                </Button>
            )}
            {!unavailable && !blocked && (
                <Button disabled={busy || checking} aria-busy={busy}
                    onClick={active ? onTest : onActivate}>
                    {busy ? t('common.loading') : active ? t('notifications.sendTest')
                        : state.permission === 'granted' ? t('notifications.finalizeReminders')
                        : t('notifications.enableReminders')}
                </Button>
            )}
            {local && active && state.remoteAvailable && state.serverRegistered !== true && (
                <Button variant="outline" disabled={busy || checking} onClick={onActivate}>
                    {t('notifications.nativeConnectMessages')}
                </Button>
            )}
            {!unavailable && (active || (blocked && (state.subscribed || state.serverRegistered === true))) && (
                <Button variant="ghost" disabled={busy || checking} onClick={onDeactivate}>
                    {t('notifications.turnOff')}
                </Button>
            )}
            <details className="basis-full text-xs text-muted-foreground">
                <summary className="min-h-11 cursor-pointer rounded-lg py-3 font-medium focus-visible:outline-2 focus-visible:outline-primary">
                    {t('notifications.state.title')}
                </summary>
                <dl className="space-y-2 pb-2">
                    {diagnostics.map(([label, value]) => (
                        <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <dt>{label}</dt><dd className="font-medium text-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>
            </details>
            {local && active && state.serverRegistered !== true && (
                <p className="basis-full text-xs leading-relaxed text-muted-foreground">{t('notifications.nativeRemotePendingHint')}</p>
            )}
        </StatusNotice>
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
}) => {
    const id = React.useId();
    return (
        <SettingsRow label={label} hint={hint} htmlFor={id} className={disabled ? 'opacity-60' : undefined}>
            <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </SettingsRow>
    );
};

/** Liste déroulante alignée à droite d'une ligne de réglage. */
const SelectRow: React.FC<{
    label: string;
    value: number;
    options: { value: number; label: string }[];
    onChange: (value: number) => void;
    disabled?: boolean;
}> = ({ label, value, options, onChange, disabled }) => {
    const id = React.useId();
    return (
        <SettingsRow label={label} htmlFor={id} className={disabled ? 'opacity-60' : undefined}>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={event => onChange(Number(event.target.value))}
                className={`${settingsFieldClass} w-auto min-w-[6.5rem] cursor-pointer`}
            >
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </SettingsRow>
    );
};

const NotificationKind: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
}> = ({ icon: Icon, label, detail }) => (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/60 p-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
            <Icon className="h-[18px] w-[18px] stroke-[1.5]" />
        </span>
        <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-foreground">{label}</span>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">{detail}</span>
        </span>
    </div>
);

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ config, onChange }) => {
    const { t, locale } = useLocale();
    const l = (fr: string, ar: string, en: string) => locale === 'ar' ? ar : locale === 'en' ? en : fr;
    const settings = { ...defaultNotificationSettings, ...(config.notificationSettings ?? {}) };
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const liveRef = useRef(true);
    useEffect(() => { liveRef.current = true; return () => { liveRef.current = false; }; }, []);
    const [checking, setChecking] = useState(true);
    const [permissionRevision, setPermissionRevision] = useState(0);
    const [message, setMessage] = useState<{ text: string; tone: NoticeTone } | null>(null);
    const [cleanupPending, setCleanupPending] = useState(hasPendingPushCleanup);
    const [pushState, setPushState] = useState<PushNotificationState>(() => ({
        permission: pushSupported() && typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
        subscribed: false,
        serverRegistered: null,
        remoteAvailable: false,
    }));
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    const patch = useCallback((updates: Partial<NotificationSettings>) => {
        const next = { ...settingsRef.current, ...updates };
        settingsRef.current = next;
        onChange({ notificationSettings: next });
    }, [onChange]);

    const vibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    // Web : la livraison distante a été retirée, les rappels locaux sont actifs
    // dès que l'autorisation est accordée. Android : l'état FCM fait foi.
    const stateIsActive = (state: PushNotificationState) =>
        state.permission === 'granted' && (state.delivery === 'local' ? state.subscribed : state.remoteAvailable === false);

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') setPermissionRevision(value => value + 1);
        };
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('online', refresh);
        return () => {
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('online', refresh);
        };
    }, []);

    // Réconcilie le réglage local avec les trois couches réelles, sans afficher
    // de demande d'autorisation et sans attendre indéfiniment un SW absent.
    useEffect(() => {
        if (busy) return;
        let cancelled = false;
        const lease = captureWorkspaceLease();
        setChecking(true);
        void getPushNotificationState()
            .then(state => {
                if (cancelled || busyRef.current || !lease()) return;
                setPushState(state);
                setCleanupPending(hasPendingPushCleanup());
                if (state.serverRegistered !== null) {
                    const active = stateIsActive(state);
                    if (settingsRef.current.pushEnabled !== active) patch({ pushEnabled: active });
                }
                if (state.reason === 'nativeUnavailable') {
                    setMessage({ text: t('notifications.statusCheckFailed'), tone: 'warning' });
                }
            })
            .catch(() => {
                if (!cancelled && !busyRef.current && lease()) setMessage({ text: t('notifications.statusCheckFailed'), tone: 'warning' });
            })
            .finally(() => {
                if (!cancelled && lease()) setChecking(false);
            });
        return () => {
            cancelled = true;
        };
    }, [patch, t, permissionRevision, busy]);

    // Un seul geste : autorisation système + abonnement serveur.
    const handleActivate = async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        const lease = captureWorkspaceLease();
        const fresh = () => liveRef.current && lease();
        setBusy(true);
        setMessage(null);
        try {
            const result = await activateNativeNotifications();
            if (!fresh()) return;
            setPushState(result);
            const active = stateIsActive(result);
            patch({ pushEnabled: active });
            if (active) {
                setMessage({ text: t('notifications.pushEnabled'), tone: 'success' });
            } else if (result.delivery === 'local' && result.permission === 'denied') {
                setMessage({ text: t('notifications.nativePermissionDenied'), tone: 'warning' });
            } else {
                const reason = result.reason
                    ? t(`notifications.activationReason.${result.reason}`)
                    : t('notifications.unknownReason');
                setMessage({ text: t('notifications.activationFailed', { reason }), tone: 'warning' });
            }
        } catch {
            if (fresh()) setMessage({ text: t('notifications.activationUnexpectedError'), tone: 'error' });
        } finally {
            busyRef.current = false;
            if (fresh()) { setBusy(false); setCleanupPending(hasPendingPushCleanup()); }
        }
    };

    const handleDeactivate = async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        const lease = captureWorkspaceLease();
        const fresh = () => liveRef.current && lease();
        setBusy(true);
        setMessage(null);
        try {
            const result = await unsubscribeFromPush();
            if (!fresh()) return;
            const state = await getPushNotificationState();
            if (!fresh()) return;
            setPushState(state);
            if (state.serverRegistered !== null) patch({ pushEnabled: stateIsActive(state) });
            if (result.ok) {
                setMessage({ text: t('notifications.pushDisabled'), tone: 'success' });
            } else if (result.localUnsubscribed && !result.serverUnregistered) {
                setMessage({ text: t('notifications.pushDisabledCleanupPending'), tone: 'warning' });
            } else {
                setMessage({ text: t('notifications.deactivationFailed'), tone: 'error' });
            }
        } catch {
            if (fresh()) setMessage({ text: t('notifications.deactivationFailed'), tone: 'error' });
        } finally {
            busyRef.current = false;
            if (fresh()) { setBusy(false); setCleanupPending(hasPendingPushCleanup()); }
        }
    };

    const handleTest = async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        const lease = captureWorkspaceLease();
        const fresh = () => liveRef.current && lease();
        setBusy(true);
        setMessage(null);
        try {
            const result = await sendTestNotification();
            if (!fresh()) return;
            setMessage({
                text: result.ok ? t('notifications.testSuccess')
                    : result.sent === 0 ? t('notifications.testNoDelivery') : t('notifications.testFailure'),
                tone: result.ok ? 'success' : result.sent === 0 ? 'warning' : 'error',
            });
        } catch {
            if (fresh()) setMessage({ text: t('notifications.testFailure'), tone: 'error' });
        } finally {
            busyRef.current = false;
            if (fresh()) setBusy(false);
        }
    };

    const minuteOptions = (values: number[]) => values.map(value => ({ value, label: String(value) }));

    return (
        <div className="space-y-7">
            {/* Activation explicite des rappels sur cet appareil */}
            <SettingsSection title={l('Cet appareil', 'هذا الجهاز', 'This device')} hint={t('notifications.intro')}>
                <div className="space-y-3 py-3.5">
                    <PushActivationCard
                        state={pushState}
                        checking={checking}
                        busy={busy}
                        onActivate={handleActivate}
                        onOpenSettings={() => {
                            const lease = captureWorkspaceLease();
                            void import('@/platform/nativeRuntime').then(module => module.openNativeNotificationSettings()).catch(() => {
                                if (liveRef.current && lease()) setMessage({ text: t('notifications.nativePermissionDenied'), tone: 'warning' });
                            });
                        }}
                        onDeactivate={handleDeactivate}
                        onTest={handleTest}
                        t={t}
                    />
                    {(message || cleanupPending) && (
                        <StatusNotice tone={message?.tone ?? 'warning'} title={message?.text ?? t('notifications.pushDisabledCleanupPending')} announce={!!message}>
                            {cleanupPending && !stateIsActive(pushState) && <Button variant="outline" disabled={busy || checking} onClick={handleDeactivate}>
                                {l('Terminer la désactivation', 'إتمام إلغاء التفعيل', 'Complete deactivation')}
                            </Button>}
                        </StatusNotice>
                    )}
                </div>
            </SettingsSection>

            <SettingsSection title={l('Rappels', 'التذكيرات', 'Reminders')}>
                <Toggle label={t('notifications.inApp')} checked={settings.enabled} onChange={v => patch({ enabled: v })} />
                <Toggle
                    label={t('notifications.vibration')}
                    hint={!vibrationSupported ? t('notifications.vibrationUnsupported') : l('Rappels de cet appareil uniquement.', 'لتذكيرات هذا الجهاز فقط.', 'Reminders on this device only.')}
                    checked={settings.sessionVibration ?? false}
                    disabled={!vibrationSupported}
                    onChange={v => {
                        patch({ sessionVibration: v });
                        if (v && vibrationSupported) {
                            try { navigator.vibrate([160, 80, 160]); } catch { /* Device may reject vibration. */ }
                        }
                    }}
                />
                <Toggle label={l('Rappel avant la fin', 'تذكير قبل النهاية', 'Reminder before the end')}
                    checked={settings.sessionEndReminderEnabled}
                    onChange={value => patch({ sessionEndReminderEnabled: value })} disabled={!settings.enabled} />
                <SelectRow label={l('Minutes avant la fin', 'الدقائق قبل النهاية', 'Minutes before the end')}
                    value={settings.sessionReminderMinutes ?? 1} options={minuteOptions([1, 2, 5, 10])}
                    disabled={!settings.enabled || !settings.sessionEndReminderEnabled}
                    onChange={value => patch({ sessionReminderMinutes: value })} />
                <Toggle label={l('Rappel si aucune date', 'تذكير إن لم يُسجَّل تاريخ', 'Reminder if no date')}
                    hint={l('Une date ne confirme pas chaque séance du jour.', 'التاريخ الواحد لا يؤكد كل حصص اليوم.', 'One date does not confirm every session that day.')}
                    checked={settings.missingDateReminderEnabled}
                    onChange={value => patch({ missingDateReminderEnabled: value })} disabled={!settings.enabled} />
                <SelectRow label={l('Minutes après la séance', 'الدقائق بعد الحصة', 'Minutes after the session')}
                    value={settings.missingDateReminderMinutes ?? 5} options={minuteOptions([1, 5, 10, 15, 30])}
                    disabled={!settings.enabled || !settings.missingDateReminderEnabled}
                    onChange={value => patch({ missingDateReminderMinutes: value })} />
                <Toggle label={t('notifications.quiet')} checked={settings.quietDuringVacations} onChange={v => patch({ quietDuringVacations: v })} />
            </SettingsSection>

            <SettingsSection title={l('Seuils d’alerte', 'عتبات التنبيه', 'Alert thresholds')}>
                <SelectRow label={t('notifications.delayThreshold')} value={settings.gapThreshold}
                    options={[1, 2, 3].map(count => ({
                        value: count,
                        label: t(count === 1 ? 'notifications.delayedSessions.one' : count === 2 ? 'notifications.delayedSessions.two' : 'notifications.delayedSessions.many', { count }),
                    }))}
                    onChange={value => patch({ gapThreshold: value })} />
                <SelectRow label={t('notifications.inactivity')} value={settings.inactivityThresholdDays}
                    options={[3, 5, 10].map(count => ({ value: count, label: t('notifications.inactiveDays', { count }) }))}
                    onChange={value => patch({ inactivityThresholdDays: value })} />
            </SettingsSection>

            <AbsencesSection
                absences={config.absences ?? []}
                onChange={absences => onChange({ absences })}
            />

            <details className="text-sm text-muted-foreground">
                <summary className="min-h-11 cursor-pointer rounded-lg py-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-primary">
                    {l('À savoir', 'للمزيد', 'Good to know')}
                </summary>
                <div className="space-y-4 pb-3">
                    <div>
                        <p className="font-medium text-foreground">{t('notifications.nativeTitle')}</p>
                        <p className="mt-0.5 text-[13px] leading-snug">{t('notifications.nativeDescription')}</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <NotificationKind icon={TriangleAlert} label={t('notifications.kindDelay')} detail={t('notifications.smartCheck')} />
                            <NotificationKind icon={Clock} label={t('notifications.kindEnd')} detail={t('notifications.localReminder')} />
                            <NotificationKind icon={CalendarCheck} label={t('notifications.kindMissingDate')} detail={t('notifications.afterClass')} />
                            <NotificationKind icon={Bell} label={t('notifications.kindAdmin')} detail={t('notifications.directMessage')} />
                        </div>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{t('notifications.iconBadgeTitle')}</p>
                        <p className="mt-0.5 text-[13px] leading-snug">{t('notifications.iconBadgeDescription')}</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">iPhone / iPad</p>
                        <p className="mt-0.5 text-[13px] leading-snug">{l('iOS 16.4+ : ouvrez l’application depuis l’écran d’accueil et vérifiez Notifications et Concentration.', 'iOS 16.4 فما فوق: افتح التطبيق من الشاشة الرئيسية وتحقق من الإشعارات والتركيز.', 'iOS 16.4+: open the app from the Home Screen and check Notifications and Focus.')}</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">Android</p>
                        <p className="mt-0.5 text-[13px] leading-snug">{l('Le mode économie d’énergie peut retarder les alertes. Les rappels locaux demandent une application active.', 'قد يؤخر وضع توفير الطاقة التنبيهات. تتطلب التذكيرات المحلية تطبيقاً نشطاً.', 'Battery Saver may delay alerts. Local reminders need an active app.')}</p>
                    </div>
                </div>
            </details>
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
    const invalidRange = Boolean(debut && fin && fin < debut);

    const addAbsence = () => {
        if (!debut || invalidRange) return;
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
        <section>
            <h3 className="text-sm font-semibold text-foreground">{t('notifications.absences')}</h3>

            {absences.length > 0 && (
                <ul className="mt-3 space-y-2">
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
        </section>
    );
};

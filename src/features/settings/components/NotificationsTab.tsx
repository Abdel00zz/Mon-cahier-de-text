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
import { Label } from '@/components/ui/label';
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
    const { locale } = useLocale();
    const state = disabled
        ? (locale === 'ar' ? 'غير متاح' : locale === 'en' ? 'Unavailable' : 'Indisponible')
        : checked
            ? (locale === 'ar' ? 'مفعّل' : locale === 'en' ? 'On' : 'Activé')
            : (locale === 'ar' ? 'متوقف' : locale === 'en' ? 'Off' : 'Désactivé');
    return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors motion-reduce:transition-none ${checked && !disabled ? 'border-primary bg-primary/[0.035]' : 'border-border bg-card'} ${disabled ? 'opacity-60' : ''}`}>
        <div className="min-w-0 flex-1 text-start">
            <Label htmlFor={id} className={`block py-1 text-sm font-semibold text-foreground leading-snug ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{label}</Label>
            {hint && <span id={`${id}-hint`} className="mt-1 block text-xs text-muted-foreground leading-relaxed">{hint}</span>}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-0.5">
        <Switch
            id={id}
            aria-describedby={hint ? `${id}-hint` : undefined}
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
        />
        <span aria-hidden="true" className={`text-[10px] font-medium leading-none ${checked && !disabled ? 'text-primary' : 'text-muted-foreground'}`}>{state}</span>
        </div>
    </div>
    );
};

const NotificationKind: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
}> = ({ icon: Icon, label, detail }) => (
    <div className="flex min-w-0 items-center gap-2.5 rounded-md bg-zinc-100 p-2.5 shadow-none dark:bg-zinc-800/80">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
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
                checked={settings.enabled}
                onChange={v => patch({ enabled: v })}
            />
            <div className="flex items-start gap-3 px-1 py-2">
                <span aria-hidden="true" className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">2</span>
                </span>
                <div className="min-w-0 text-start">
                    <p className="text-sm font-semibold text-foreground">{t('notifications.iconBadgeTitle')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('notifications.iconBadgeDescription')}</p>
                </div>
            </div>

            <Toggle
                label={t('notifications.vibration')}
                hint={!vibrationSupported ? t('notifications.vibrationUnsupported') : l('Pour les rappels sur cet appareil. Les retours tactiles des boutons sont séparés.', 'لتذكيرات هذا الجهاز. الاستجابة اللمسية للأزرار مستقلة.', 'For reminders on this device. Button haptics are separate.')}
                checked={settings.sessionVibration ?? false}
                disabled={!vibrationSupported}
                onChange={v => {
                    patch({ sessionVibration: v });
                    if (v && vibrationSupported) {
                        try { navigator.vibrate([160, 80, 160]); } catch { /* Device may reject vibration. */ }
                    }
                }}
            />

            <Toggle label={l('Rappel avant la fin de séance', 'تذكير قبل نهاية الحصة', 'Session end reminder')}
                checked={settings.sessionEndReminderEnabled}
                onChange={value => patch({ sessionEndReminderEnabled: value })} disabled={!settings.enabled} />
            <label className="settings-surface block p-4 text-xs">
                <span>{l('Prévenir avant la fin (minutes)', 'التنبيه قبل النهاية (دقائق)', 'Minutes before the end')}</span>
                <select className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3" value={settings.sessionReminderMinutes ?? 1} disabled={!settings.enabled} onChange={event => patch({ sessionReminderMinutes: Number(event.target.value) })}>{[1, 2, 5, 10].map(value => <option key={value} value={value}>{value}</option>)}</select>
            </label>
            <Toggle label={l('Rappel si aucune date saisie ce jour-là', 'تذكير إذا لم يسجل أي تاريخ لهذا اليوم', 'Reminder if no date is recorded that day')}
                hint={l('Le cahier ne distingue pas les horaires : une date ne confirme pas chacune des séances d’une même journée.', 'الدفتر لا يميز الساعات: تاريخ واحد لا يؤكد كل حصص اليوم.', 'The notebook has no time-of-day evidence: a date does not confirm every session that day.')}
                checked={settings.missingDateReminderEnabled}
                onChange={value => patch({ missingDateReminderEnabled: value })} disabled={!settings.enabled} />
            <label className="settings-surface block p-4 text-xs">
                <span>{l('Délai après la séance (minutes)', 'المهلة بعد الحصة (دقائق)', 'Minutes after the session')}</span>
                <select className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3" value={settings.missingDateReminderMinutes ?? 5} disabled={!settings.enabled} onChange={event => patch({ missingDateReminderMinutes: Number(event.target.value) })}>{[1, 5, 10, 15, 30].map(value => <option key={value} value={value}>{value}</option>)}</select>
            </label>
            <details className="px-1 text-xs text-muted-foreground">
                <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-primary">
                    {l('À savoir sur les rappels', 'حول التذكيرات', 'About reminders')}
                </summary>
                <p className="pb-3 leading-relaxed">{l('Les rappels locaux nécessitent une page active et peuvent être retardés si l’application est suspendue. La vibration dépend du téléphone et d’une interaction préalable. Les push peuvent arriver application fermée.', 'تتطلب التذكيرات المحلية صفحة نشطة وقد تتأخر عند تعليق التطبيق. يعتمد الاهتزاز على الهاتف وتفاعل سابق. قد تصل إشعارات الدفع والتطبيق مغلق.', 'Local reminders need an active page and may be delayed while the app is suspended. Vibration depends on the device and prior interaction. Push alerts can arrive with the app closed.')}</p>
                <dl className="space-y-3 pb-3 leading-relaxed">
                    <div><dt className="font-medium text-foreground">iPhone / iPad</dt><dd>{l('iOS 16.4+ : ouvrez l’application depuis l’écran d’accueil. Si le test est silencieux, vérifiez Notifications et Concentration dans les réglages du téléphone.', 'iOS 16.4 أو أحدث: افتح التطبيق من الشاشة الرئيسية. إذا كان الاختبار صامتاً، تحقق من الإشعارات والتركيز في إعدادات الهاتف.', 'iOS 16.4+: open the app from the Home Screen. If the test is silent, check Notifications and Focus in phone settings.')}</dd></div>
                    <div><dt className="font-medium text-foreground">Google Pixel / Samsung</dt><dd>{l('Autorisez les notifications du site dans Chrome ou Samsung Internet. Le système peut retarder les alertes en mode économie d’énergie.', 'اسمح بإشعارات الموقع في Chrome أو Samsung Internet. قد يؤخر النظام التنبيهات في وضع توفير الطاقة.', 'Allow site notifications in Chrome or Samsung Internet. Battery Saver may delay alerts.')}</dd></div>
                    <div><dt className="font-medium text-foreground">{l('Icône et réception', 'الأيقونة والاستقبال', 'Icon and delivery')}</dt><dd>{l('Le logo identifie l’application ; Android utilise aussi un petit pictogramme transparent. Un test transmis par le serveur confirme l’envoi, sa réception doit être vérifiée sur ce téléphone.', 'يمثل الشعار التطبيق؛ ويستخدم Android أيضاً رمزاً صغيراً بخلفية شفافة. يؤكد اختبار الخادم الإرسال، ويجب التحقق من الاستقبال على هذا الهاتف.', 'The logo identifies the app; Android also uses a small transparent glyph. A server-submitted test confirms sending; check receipt on this phone.')}</dd></div>
                </dl>
            </details>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="settings-surface flex flex-col justify-between p-4">
                    <span className="block text-xs font-bold text-foreground font-sans">{t('notifications.delayThreshold')}</span>
                    <select
                        value={settings.gapThreshold}
                        onChange={e => patch({ gapThreshold: Number(e.target.value) })}
                        className="mt-2 h-10 w-full rounded-md border border-border bg-background text-foreground px-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
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
                        className="mt-2 h-10 w-full rounded-md border border-border bg-background text-foreground px-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                    >
                        {[3, 5, 10].map(count => <option key={count} value={count}>{t('notifications.inactiveDays', { count })}</option>)}
                    </select>
                </label>
            </div>

            <Toggle
                label={t('notifications.quiet')}
                checked={settings.quietDuringVacations}
                onChange={v => patch({ quietDuringVacations: v })}
            />

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
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-foreground">{t('notifications.absences')}</h4>

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
                    className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                    className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                    className="col-span-full h-11 min-w-0 rounded-xl border border-border bg-background px-3 text-xs text-foreground sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        </div>
    );
};

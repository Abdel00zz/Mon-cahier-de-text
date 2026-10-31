import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppConfig, NotificationSettings } from '@/types';
import { defaultNotificationSettings } from '@/hooks/useConfigManager';
import {
    activateNativeNotifications,
    getPushNotificationState,
    hasPendingPushCleanup,
    pushSupported,
    sendTestNotification,
    unsubscribeFromPush,
    requestIgnoreBatteryOptimization,
    requestExactAlarmPermission,
    type PushNotificationState,
} from '@/infrastructure/push/push';
import { Bell, CalendarCheck, CalendarDays, Clock, TriangleAlert } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { StatusNotice, type NoticeTone } from '@/components/ui/status-notice';
import { SettingsSection } from './SettingsPrimitives';
import { PushActivationCard } from './PushActivationCard';
import { Toggle, SelectRow, NotificationKind } from './NotificationControls';
import { useLocale } from '@/i18n/LocaleProvider';
import { captureWorkspaceLease } from '@/infrastructure/storage/accountWorkspace';
import { sessionReminderMinutes } from '@/domain/notifications/sessionReminderTiming';

export { PushActivationCard } from './PushActivationCard';

interface NotificationsTabProps {
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
}

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
        window.addEventListener('native-resume', refresh);
        window.addEventListener('focus', refresh);
        return () => {
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('online', refresh);
            window.removeEventListener('native-resume', refresh);
            window.removeEventListener('focus', refresh);
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

    const handleRequestBatteryOptimization = async () => {
        if (busyRef.current) return;
        const lease = captureWorkspaceLease();
        try {
            await requestIgnoreBatteryOptimization();
            if (liveRef.current && lease()) {
                const updated = await getPushNotificationState();
                if (liveRef.current && lease()) setPushState(updated);
            }
        } catch { /* ignored */ }
    };

    const handleRequestExactAlarm = async () => {
        if (busyRef.current) return;
        const lease = captureWorkspaceLease();
        try {
            await requestExactAlarmPermission();
            if (liveRef.current && lease()) {
                const updated = await getPushNotificationState();
                if (liveRef.current && lease()) setPushState(updated);
            }
        } catch { /* ignored */ }
    };

    const minuteOptions = (values: number[]) => values.map(value => ({ value, label: String(value) }));

    return (
        <div className="space-y-6">
            {/* Activation explicite des rappels sur cet appareil */}
            <SettingsSection title={l('Cet appareil', 'هذا الجهاز', 'This device')} hint={t('notifications.intro')} icon={Bell}>
                <div className="space-y-3 pt-0.5">
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
                        onRequestBatteryOptimization={handleRequestBatteryOptimization}
                        onRequestExactAlarm={handleRequestExactAlarm}
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

            <SettingsSection title={l('Rappels', 'التذكيرات', 'Reminders')} icon={Clock}>
                <Toggle label={t('notifications.enabled')} checked={settings.enabled} onChange={v => patch({ enabled: v })} icon={Bell} />
                <Toggle
                    label={t('notifications.vibration')}
                    hint={!vibrationSupported ? t('notifications.vibrationUnsupported') : l('Rappels de cet appareil uniquement.', 'لتذكيرات هذا الجهاز فقط.', 'Reminders on this device only.')}
                    checked={settings.sessionVibration ?? false}
                    disabled={!vibrationSupported}
                    icon={Bell}
                    onChange={v => {
                        patch({ sessionVibration: v });
                        if (v && vibrationSupported) {
                            try { navigator.vibrate([160, 80, 160]); } catch { /* Device may reject vibration. */ }
                        }
                    }}
                />
                <Toggle label={l('Rappel avant la fin', 'تذكير قبل النهاية', 'Reminder before the end')}
                    checked={settings.sessionEndReminderEnabled}
                    onChange={value => patch({ sessionEndReminderEnabled: value })} disabled={!settings.enabled} icon={Clock} />
                <SelectRow label={l('Minutes avant la fin', 'الدقائق قبل النهاية', 'Minutes before the end')}
                    value={sessionReminderMinutes(settings)} options={minuteOptions([1, 2, 5, 10])}
                    disabled={!settings.enabled || !settings.sessionEndReminderEnabled}
                    onChange={value => patch({ sessionReminderMinutes: value, sessionReminderTimingVersion: 1 })} />
                <Toggle label={l('Rappel si aucune date', 'تذكير إن لم يُسجَّل تاريخ', 'Reminder if no date')}
                    hint={l('Si aucune séance n’est datée aujourd’hui, lorsque l’application est active.', 'عند غياب حصة مؤرّخة اليوم، والتطبيق مفتوح.', 'When no session is dated today and the app is active.')}
                    checked={settings.missingDateReminderEnabled}
                    onChange={value => patch({ missingDateReminderEnabled: value })} disabled={!settings.enabled} icon={CalendarCheck} />
                <SelectRow label={l('Minutes après la séance', 'الدقائق بعد الحصة', 'Minutes after the session')}
                    value={settings.missingDateReminderMinutes ?? 5} options={minuteOptions([1, 5, 10, 15, 30])}
                    disabled={!settings.enabled || !settings.missingDateReminderEnabled}
                    onChange={value => patch({ missingDateReminderMinutes: value })} />
                <Toggle label={t('notifications.quiet')} checked={settings.quietDuringVacations} onChange={v => patch({ quietDuringVacations: v })} icon={CalendarDays} />
            </SettingsSection>

            <SettingsSection title={l('Seuils d’alerte', 'عتبات التنبيه', 'Alert thresholds')} icon={TriangleAlert}>
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
                            <NotificationKind icon={Clock} label={t('notifications.kindEnd')} detail={pushState.delivery === 'local' ? t('notifications.nativeRemindersDescription') : t('notifications.localReminder')} />
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
                        <p className="mt-0.5 text-[13px] leading-snug">{l('Le mode économie d’énergie peut retarder les alertes. Dans l’APK, les rappels de fin de séance sont programmés même application fermée. Le contrôle des dates se fait application active.', 'قد يؤخر وضع توفير الطاقة التنبيهات. في تطبيق Android، تُبرمج تذكيرات نهاية الحصة حتى والتطبيق مغلق. تُراجع التواريخ عند فتح التطبيق.', 'Battery Saver may delay alerts. In the Android app, end-of-session reminders are scheduled even when it is closed. Date checks run while the app is active.')}</p>
                    </div>
                </div>
            </details>
        </div>
    );
};

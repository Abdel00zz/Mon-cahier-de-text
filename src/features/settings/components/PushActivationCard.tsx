import React from 'react';
import { isIOSDevice, isStandalone, pushSupported, type PushNotificationState } from '@/infrastructure/push/push';
import { Button } from '@/components/ui/button';
import { StatusNotice } from '@/components/ui/status-notice';
import { useLocale } from '@/i18n/LocaleProvider';

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
    onRequestBatteryOptimization?: () => void;
    onRequestExactAlarm?: () => void;
    t: Translate;
    supported?: boolean;
    iosNeedsInstall?: boolean;
}> = ({
    state,
    checking,
    busy,
    onActivate,
    onDeactivate,
    onTest,
    onOpenSettings,
    onRequestBatteryOptimization,
    onRequestExactAlarm,
    t,
    supported = pushSupported(),
    iosNeedsInstall = supported && isIOSDevice() && !isStandalone(),
}) => {
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
        ...(local ? [
            [t('notifications.nativeBackground'), checking ? t('notifications.state.checking')
                : state.batteryOptimizationIgnored ? t('notifications.nativeBackgroundOptimal')
                : t('notifications.nativeBackgroundRestricted')],
            ...(state.canScheduleExactAlarms !== undefined ? [
                [t('notifications.nativeExactAlarms'), checking ? t('notifications.state.checking')
                    : state.canScheduleExactAlarms ? t('notifications.state.allowed')
                    : t('notifications.state.notAllowed')]
            ] : [])
        ] : []),
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
            {local && active && state.batteryOptimizationIgnored === false && onRequestBatteryOptimization && (
                <Button variant="outline" disabled={busy || checking} onClick={onRequestBatteryOptimization}>
                    {t('notifications.nativeAllowBackground')}
                </Button>
            )}
            {local && active && state.canScheduleExactAlarms === false && onRequestExactAlarm && (
                <Button variant="outline" disabled={busy || checking} onClick={onRequestExactAlarm}>
                    {t('notifications.nativeAllowExactAlarms')}
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
            {local && active && state.batteryOptimizationIgnored === false && (
                <p className="basis-full text-xs leading-relaxed text-amber-700 dark:text-amber-300 font-medium">
                    {t('notifications.nativeBackgroundWarning')}
                </p>
            )}
            {local && active && state.serverRegistered !== true && (
                <p className="basis-full text-xs leading-relaxed text-muted-foreground">{t('notifications.nativeRemotePendingHint')}</p>
            )}
        </StatusNotice>
    );
};


import React, { useState } from 'react';
import { AbsencePeriod, AppConfig, NotificationSettings } from '@/types';
import { defaultNotificationSettings } from '@/hooks/useConfigManager';
import { isStandalone, pushSupported, sendTestNotification, subscribeToPush, unsubscribeFromPush } from '@/utils/push';
import { formatDateDDMMYYYY } from '@/utils/dataUtils';
import { Bell, CalendarCheck, Clock, TriangleAlert, X } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/i18n/LocaleProvider';

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
    const { locale, t } = useLocale();
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
                    setMessage(t('notifications.pushEnabled'));
                } else {
                    setMessage(t('notifications.activationFailed', { reason: result.reason ?? '—' }));
                }
            } else {
                await unsubscribeFromPush();
                patch({ pushEnabled: false });
                setMessage(t('notifications.pushDisabled'));
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
                {t('notifications.intro')}
            </p>

            <div className="rounded-xl border border-border bg-secondary/35 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-xs font-bold text-foreground">{t('notifications.nativeTitle')}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {t('notifications.nativeDescription')}
                        </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? t('notifications.authorized') : t('notifications.inactive')}
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
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
                label={t('notifications.push')}
                hint={
                    iosNeedsInstall
                        ? t('notifications.pushIosInstall')
                        : !supported
                          ? t('notifications.pushUnsupported')
                          : t('notifications.pushHint')
                }
                checked={settings.pushEnabled}
                onChange={handlePushToggle}
                disabled={busy || !supported || iosNeedsInstall}
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
                <label className="rounded-xl border border-border bg-card p-3">
                    <span className="block text-xs font-semibold text-foreground font-sans">{t('notifications.delayThreshold')}</span>
                    <select
                        value={settings.gapThreshold}
                        onChange={e => patch({ gapThreshold: Number(e.target.value) })}
                        className="mt-1.5 h-9 w-full rounded-md border border-border/80 bg-card text-foreground px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {[1, 2, 3].map(count => <option key={count} value={count}>{t('notifications.delayedSessions', { count, plural: count > 1 && locale !== 'ar' ? 's' : '' })}</option>)}
                    </select>
                </label>
                <label className="rounded-xl border border-border bg-card p-3">
                    <span className="block text-xs font-semibold text-foreground font-sans">{t('notifications.inactivity')}</span>
                    <select
                        value={settings.inactivityThresholdDays}
                        onChange={e => patch({ inactivityThresholdDays: Number(e.target.value) })}
                        className="mt-1.5 h-9 w-full rounded-md border border-border/80 bg-card text-foreground px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

            {settings.pushEnabled && (
                <button
                    type="button"
                    onClick={async () => {
                        setBusy(true);
                        const ok = await sendTestNotification();
                        setMessage(ok ? t('notifications.testSuccess') : t('notifications.testFailure'));
                        setBusy(false);
                    }}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-border/80 bg-card text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 transition-colors"
                >
                    {t('notifications.sendTest')}
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
        <div className="rounded-xl border border-border bg-card p-3">
            <h4 className="text-xs font-semibold text-foreground font-display">{t('notifications.absences')}</h4>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground font-sans">
                {t('notifications.absencesHint')}
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
                                aria-label={t('notifications.deleteAbsence')}
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
                    aria-label={t('notifications.absenceStart')}
                />
                <input
                    type="date"
                    value={fin}
                    min={debut || undefined}
                    onChange={e => setFin(e.target.value)}
                    className="h-10 rounded-md border border-border/80 bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label={t('notifications.absenceEnd')}
                />
                <input
                    type="text"
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder={t('notifications.reasonOptional')}
                    className="col-span-2 h-10 rounded-md border border-border/80 bg-card px-2 text-xs text-foreground sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                    type="button"
                    onClick={addAbsence}
                    disabled={!debut}
                    className="col-span-2 h-10 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40 sm:col-span-1 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                    {t('notifications.add')}
                </button>
            </div>
        </div>
    );
};

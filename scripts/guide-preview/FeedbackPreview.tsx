/** Safe visual cases: no user data, persistence, notification permission or network writes. */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { FluidTabRail } from '../../components/ui/FluidTabRail';
import { StatusNotice } from '../../components/ui/status-notice';
import { Toaster } from '../../components/ui/sonner';
import { useLocale } from '../../i18n/LocaleProvider';
import { Modal } from '../../components/ui/modal';
import { PushActivationCard } from '../../features/settings/components/NotificationsTab';
import type { PushNotificationState } from '../../utils/push';

type Scenario = 'save' | 'unavailable' | 'retry' | 'delete';

function NotificationActivationPreview() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<PushNotificationState>({ permission: 'default', subscribed: false, serverRegistered: false });
  const [result, setResult] = useState('');
  const busyRef = useRef(false);
  const activate = () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    window.setTimeout(() => {
      setState(current => current.permission === 'default'
        ? { permission: 'granted', subscribed: false, serverRegistered: false }
        : { permission: 'granted', subscribed: true, serverRegistered: true });
      busyRef.current = false; setBusy(false);
    }, 250);
  };
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>{locale === 'ar' ? 'معاينة تفعيل الإشعارات' : 'Activation des notifications'}</Button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title={t('notifications.remindersTitle')} maxWidth="sm" mobilePresentation="dialog">
      <div className="space-y-4 py-2">
        <p className="text-xs text-muted-foreground">{locale === 'ar' ? 'معاينة محلية: لا يطلب إذن الهاتف ولا يُرسل إشعار.' : 'Simulation locale : aucune permission demandée, aucun push envoyé.'}</p>
        <label className="block text-sm">{locale === 'ar' ? 'الحالة' : 'État à vérifier'}
          <select disabled={busy} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-card px-3" value={state.permission} onChange={event => { setResult(''); setState({ permission: event.target.value as NotificationPermission, subscribed: false, serverRegistered: false }); }}>
            <option value="default">{locale === 'ar' ? 'طلب الإذن' : 'Permission à demander'}</option>
            <option value="granted">{locale === 'ar' ? 'متابعة التفعيل' : 'Continuer l’activation'}</option>
            <option value="denied">{locale === 'ar' ? 'رفض الإذن' : 'Permission refusée'}</option>
          </select>
        </label>
        <PushActivationCard state={state} busy={busy} checking={false} supported iosNeedsInstall={false} t={t}
          onActivate={activate} onDeactivate={() => { setResult(''); setState({ permission: 'granted', subscribed: false, serverRegistered: false }); }}
          onTest={() => setResult(t('notifications.testSuccess'))} />
        {result && <StatusNotice tone="success" title={result} announce />}
      </div>
    </Modal>
  </>;
}

export function FeedbackPreview() {
  const { locale, t } = useLocale();
  const ar = locale === 'ar';
  const [scenario, setScenario] = useState<Scenario>('save');
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [calls, setCalls] = useState(0);
  const attempts = useRef(0);
  const items = [
    { id: 'save' as const, label: ar ? 'حفظ' : 'Enregistrement' },
    { id: 'unavailable' as const, label: ar ? 'غير متاح' : 'Indisponible', disabled: true },
    { id: 'retry' as const, label: ar ? 'إعادة المحاولة' : 'Échec et reprise' },
    { id: 'delete' as const, label: ar ? 'حذف' : 'Suppression' },
  ];
  const destructive = scenario === 'delete';
  const confirm = async () => {
    attempts.current += 1;
    setCalls(value => value + 1);
    // A preview-only delay lets QA inspect pending and duplicate-submit protection.
    await new Promise(resolve => setTimeout(resolve, 900));
    if (scenario === 'retry' && attempts.current === 1) throw new Error('Preview failure');
    setCompleted(true);
  };
  return <div className="mx-auto max-w-xl space-y-6">
    <NotificationActivationPreview />
    <div>
      <h1 className="text-xl font-semibold">{ar ? 'الملاحظات والتأكيدات' : 'Messages et confirmations'}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{ar ? 'معاينة ببيانات افتراضية فقط.' : 'Aperçu avec des données fictives uniquement.'}</p>
    </div>
    <FluidTabRail items={items} activeId={scenario} onChange={value => {
      setScenario(value); setCompleted(false); setCalls(0); attempts.current = 0;
    }} ariaLabel={ar ? 'حالات التأكيد' : 'Cas de confirmation'} />
    <div className="divide-y divide-border/60">
      <StatusNotice tone="success" title={t('notifications.pushEnabled')} />
      <StatusNotice tone="warning" title={t('notifications.remindersTitle')} description={t('notifications.permissionDenied')} />
      <StatusNotice tone="error" title={t('settings.toast.exportFailed')}>
        <Button variant="outline" onClick={() => toast.success(ar ? 'النسخة جاهزة' : 'Copie prête')}>{ar ? 'إعادة المحاولة' : 'Réessayer'}</Button>
      </StatusNotice>
    </div>
    <Button onClick={() => { attempts.current = 0; setCalls(0); setOpen(true); }}>
      {ar ? 'فتح التأكيد' : 'Ouvrir la confirmation'}
    </Button>
    <p role="status" className="text-xs text-muted-foreground">
      {ar ? 'عمليات منفّذة' : 'Actions exécutées'} : {calls}
      {completed && (ar ? ' · تم بنجاح' : ' · Terminé')}
    </p>
    <ConfirmDialog open={open} onOpenChange={setOpen} onConfirm={confirm}
      variant={destructive ? 'destructive' : 'default'}
      title={destructive ? (ar ? 'حذف القسم التجريبي؟' : 'Supprimer la classe de démonstration ?')
        : (ar ? 'حفظ الملف؟' : 'Enregistrer le profil ?')}
      description={destructive ? (ar ? 'سيُحذف القسم ودفتره.' : 'La classe et son cahier seront supprimés.')
        : (ar ? 'ستُطبّق تعديلات الملف.' : 'Vos modifications du profil seront appliquées.')}
      confirmLabel={destructive ? t('dashboard.delete') : t('settings.saveProfile')}
      confirmationPhrase={destructive ? 'DEMO' : undefined}
      confirmationHint={destructive ? (ar ? 'اكتب DEMO للتأكيد.' : 'Saisissez DEMO pour confirmer.') : undefined}
    />
    <Toaster />
  </div>;
}

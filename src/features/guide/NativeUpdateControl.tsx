import { useEffect, useRef, useState } from 'react';
import { NativeUpdates, supportsNativeUpdates, canRestartForUpdate, type NativeUpdateState } from '@/platform/nativeUpdates';
import { startSafePwaAction } from '@/pwa/safeUpdate';
import { toast } from 'sonner';

let cancelInstall: (() => void) | undefined;

export function NativeUpdateControl({ lang }: { lang: 'fr' | 'ar' }) {
  const [state, setState] = useState<NativeUpdateState>('idle');
  const [busy, setBusy] = useState(false);
  const [installRequested, setInstallRequested] = useState(false);
  const live = useRef(0);
  const ar = lang === 'ar';
  const native = supportsNativeUpdates();
  useEffect(() => {
    const generation = ++live.current;
    if (!native) return () => { live.current++; };
    const subscription = NativeUpdates.addListener('stateChanged', result => { if (live.current === generation) setState(result.state); });
    // Opening help is the only automatic check: no timer or foreground polling.
    void NativeUpdates.check().then(result => { if (live.current === generation) setState(result.state); }).catch(() => { if (live.current === generation) setState('store'); });
    return () => { live.current++; void subscription.then(handle => handle.remove()).catch(() => {}); };
  }, [native]);
  if (!native) return null;
  const act = async () => {
    if (busy) return;
    const generation = live.current;
    setBusy(true);
    try {
      if (state === 'store') await NativeUpdates.openStore();
      else if (state === 'downloaded') {
        // The help modal itself blocks a restart. The teacher closes it first.
        cancelInstall?.();
        setInstallRequested(true);
        cancelInstall = startSafePwaAction(() => {
          cancelInstall = undefined;
          if (canRestartForUpdate()) void NativeUpdates.complete().then(result => {
            if (result.state === 'error' || result.state === 'store') throw new Error('Update failed');
          }).catch(() => toast.error(ar ? 'تعذّر التثبيت. أعد المحاولة من الدليل.' : 'Installation impossible. Réessayez depuis le guide.'));
        });
      } else {
        const result = await (state === 'available' ? NativeUpdates.start() : NativeUpdates.check());
        if (live.current === generation) setState(result.state);
      }
    } catch { if (live.current === generation) setState('error'); }
    finally { if (live.current === generation) setBusy(false); }
  };
  const label = state === 'available' ? (ar ? 'تنزيل التحديث' : 'Télécharger la mise à jour')
    : state === 'downloaded' ? (ar ? 'التثبيت بعد إغلاق الدليل' : 'Installer après fermeture du guide')
    : state === 'store' ? (ar ? 'فتح Google Play' : 'Ouvrir Google Play')
    : (ar ? 'التحقق من التحديثات' : 'Vérifier les mises à jour');
  const message = state === 'current' ? (ar ? 'التطبيق محدّث حسب Google Play.' : 'Application à jour selon Google Play.')
    : state === 'downloading' ? (ar ? 'يجري التنزيل. يمكنك متابعة العمل.' : 'Téléchargement en cours. Vous pouvez continuer à travailler.')
    : state === 'downloaded' ? (ar ? 'التحديث جاهز. أغلق الدليل بعد اختيار التثبيت.' : 'Mise à jour prête. Fermez le guide après avoir choisi l’installation.')
    : state === 'store' ? (ar ? 'التحديثات متاحة بعد النشر والتثبيت من Google Play.' : 'Les mises à jour nécessitent une installation depuis Google Play après publication.')
    : state === 'error' ? (ar ? 'تعذّر التحديث. أعد المحاولة عند عودة الاتصال.' : 'Mise à jour impossible. Réessayez avec une connexion.') : '';
  return <div className="guide-update">
    <button type="button" onClick={() => { void act(); }} disabled={busy || state === 'downloading' || installRequested} aria-busy={busy}>{label}</button>
    {(message || installRequested) && <p role="status">{installRequested ? (ar ? 'أغلق الدليل. سيتم التثبيت بعد انتهاء الحفظ.' : 'Fermez le guide. Installation après la fin des sauvegardes.') : message}</p>}
  </div>;
}

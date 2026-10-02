import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowDownToLine, RefreshCw, Check } from 'lucide-react';
import { NativeUpdates, supportsNativeUpdates, canRestartForUpdate, type UpdateResult } from '@/platform/nativeUpdates';
import { startSafePwaAction } from '@/pwa/safeUpdate';
import { webUpdates } from '@/pwa/updateControl';
import { toast } from 'sonner';

let cancelInstall: (() => void) | undefined;
let installRequested = false;
const installationListeners = new Set<() => void>();
const subscribeInstallation = (listener: () => void) => { installationListeners.add(listener); return () => { installationListeners.delete(listener); }; };
const installationSnapshot = () => installRequested;
const setInstallation = (requested: boolean) => { installRequested = requested; installationListeners.forEach(listener => listener()); };

async function checkNative(): Promise<UpdateResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([(async () => {
      const result = await NativeUpdates.check();
      return result.source === 'apk' ? (await import('@/platform/nativeRelease')).checkDirectApkRelease(result) : result;
    })(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Update check timed out')), 20_000); })]);
  } finally { if (timeout) clearTimeout(timeout); }
}

export function AppUpdateControl({ lang }: { lang: 'fr' | 'ar' }) {
  const [result, setResult] = useState<UpdateResult>({ state: 'idle' });
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const pendingNative = useSyncExternalStore(subscribeInstallation, installationSnapshot);
  const webState = useSyncExternalStore(webUpdates.subscribe, webUpdates.getSnapshot);
  const checking = useRef(false);
  const live = useRef(0);
  const ar = lang === 'ar';
  const native = supportsNativeUpdates();
  const state = native ? result.state : webState;
  const pending = native ? pendingNative : webState === 'pending';
  useEffect(() => {
    const generation = ++live.current;
    const connectionChanged = () => setOnline(navigator.onLine);
    window.addEventListener('online', connectionChanged);
    window.addEventListener('offline', connectionChanged);
    const refresh = () => {
      connectionChanged();
      if (!native || checking.current || !navigator.onLine) return;
      checking.current = true;
      setBusy(true);
      void checkNative().then(value => { if (live.current === generation) setResult(value); })
        .catch(() => { if (live.current === generation) setResult(previous => ({ ...previous, state: 'error' })); })
        .finally(() => { if (live.current === generation) { checking.current = false; setBusy(false); } });
    };
    const subscription = native ? NativeUpdates.addListener('stateChanged', value => {
      if (live.current === generation) setResult(value);
    }) : undefined;
    // Recover a Play download on return, only while help is open. No background timer.
    window.addEventListener('native-resume', refresh);
    window.addEventListener('online', refresh);
    refresh();
    return () => {
      live.current++; checking.current = false;
      window.removeEventListener('native-resume', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('online', connectionChanged);
      window.removeEventListener('offline', connectionChanged);
      void subscription?.then(handle => handle.remove()).catch(() => {});
    };
  }, [native]);
  const act = async () => {
    if (busy || checking.current) return;
    if (!native) {
      if (state === 'downloaded') webUpdates.apply();
      else await webUpdates.check();
      return;
    }
    const generation = live.current;
    checking.current = true;
    setBusy(true);
    try {
      if (state === 'store') await NativeUpdates.openStore();
      else if (state === 'available' && result.source === 'apk' && result.downloadUrl) await NativeUpdates.openDownload({ url: result.downloadUrl });
      else if (state === 'downloaded') {
        // The help modal itself blocks a restart. The teacher closes it first.
        cancelInstall?.();
        setInstallation(true);
        cancelInstall = startSafePwaAction(() => {
          cancelInstall = undefined;
          setInstallation(false);
          if (canRestartForUpdate()) void NativeUpdates.complete().then(result => {
            if (result.state !== 'downloaded' && result.state !== 'current') throw new Error('Update failed');
          }).catch(() => toast.error(ar ? 'تعذّر التثبيت. أعد المحاولة من الدليل.' : 'Installation impossible. Réessayez depuis le guide.'));
        });
      } else {
        const value = await (state === 'available' ? NativeUpdates.start() : checkNative());
        if (live.current === generation) setResult(value);
      }
    } catch { if (live.current === generation) setResult(previous => ({ ...previous, state: 'error' })); }
    finally { if (live.current === generation) { checking.current = false; setBusy(false); } }
  };
  const later = () => {
    if (native) { cancelInstall?.(); cancelInstall = undefined; setInstallation(false); }
    else webUpdates.cancel();
  };
  const label = busy || state === 'checking' ? (ar ? 'جارٍ التحقق…' : 'Vérification…')
    : state === 'available' ? (ar ? 'تنزيل التحديث' : 'Télécharger la mise à jour')
    : state === 'downloaded' ? (ar ? 'التثبيت بعد إغلاق الدليل' : 'Installer après fermeture du guide')
    : state === 'store' ? (ar ? 'فتح Google Play' : 'Ouvrir Google Play')
    : (ar ? 'التحقق من التحديثات' : 'Vérifier les mises à jour');
  const message = pending ? (ar ? 'أغلق الدليل. سيتم التثبيت بعد انتهاء الحفظ.' : 'Fermez le guide. Installation après la fin des sauvegardes.')
    : !online && state !== 'downloaded' ? (ar ? 'لا يوجد اتصال. تحقق عند عودته.' : 'Vous êtes hors ligne. Vérifiez au retour de la connexion.')
    : state === 'current' ? (ar ? 'آخر إصدار متاح على قناتك.' : 'Dernière version disponible sur votre canal.')
    : state === 'available' ? (ar ? `تحديث متاح${result.availableVersion ? ` · ${result.availableVersion}` : ''}.` : `Mise à jour disponible${result.availableVersion ? ` · ${result.availableVersion}` : ''}.`)
    : state === 'downloading' ? (ar ? 'يجري التنزيل. يمكنك متابعة العمل.' : 'Téléchargement en cours. Vous pouvez continuer à travailler.')
    : state === 'downloaded' ? (ar ? 'التحديث جاهز. أغلق الدليل بعد اختيار التثبيت.' : 'Mise à jour prête. Fermez le guide après avoir choisi l’installation.')
    : state === 'manual' ? (ar ? 'لم يُنشر ملف تحديث بعد. استخدم ملف APK من مصدر التثبيت.' : 'Aucun fichier de mise à jour publié. Utilisez l’APK fourni par votre source d’installation.')
    : state === 'store' ? (ar ? 'تحقق مباشرة من صفحة التطبيق في Google Play.' : 'Vérifiez directement la fiche de l’application sur Google Play.')
    : state === 'unavailable' ? (ar ? 'التحديثات متاحة في التطبيق المنشور.' : 'Les mises à jour sont disponibles dans l’application publiée.')
    : state === 'applying' ? (ar ? 'جارٍ تطبيق التحديث…' : 'Installation en cours…')
    : state === 'error' ? (ar ? 'تعذّر التحقق. أعد المحاولة.' : 'Vérification impossible. Réessayez.') : '';
  const ready = state === 'downloaded' || state === 'available';
  return <div className="guide-update">
    {native && <span className="guide-update-channel" dir="ltr">{result.source === 'apk' ? 'APK' : result.source === 'play' ? 'Google Play' : 'Android'}</span>}
    <div className="guide-update-actions">
      <button type="button" onClick={() => { void act(); }} disabled={busy || state === 'checking' || state === 'downloading' || state === 'applying' || pending || state === 'unavailable' || (!online && !ready)} aria-busy={busy || state === 'checking'}>
        {ready ? <ArrowDownToLine size={14} aria-hidden="true" /> : state === 'current' ? <Check size={14} aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}{label}
      </button>
      {pending && <button type="button" onClick={later}>{ar ? 'لاحقًا' : 'Plus tard'}</button>}
    </div>
    {state === 'downloading' && typeof result.progress === 'number' && <div className="guide-update-progress"><progress max={100} value={result.progress} aria-label={ar ? 'تنزيل التحديث' : 'Téléchargement de la mise à jour'} /><bdi>{result.progress}%</bdi></div>}
    {message && <p role="status">{message}</p>}
  </div>;
}

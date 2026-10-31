import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppLocale } from '@/types';
import type { PwaPlatform } from '@/platform/pwaInstall';

interface PwaInstallModalProps {
  open: boolean;
  locale: AppLocale;
  platform: PwaPlatform;
  onClose: () => void;
  onConfirmInstalled: () => void;
}

const GUIDE_COPY = {
  fr: {
    title: 'Installer Mon cahier de textes',
    subtitle: 'Accédez à vos cahiers en plein écran et hors connexion directement depuis votre écran d’accueil.',
    iosTab: 'iPhone / iPad (Safari)',
    androidTab: 'Android / Navigateur',
    iosSteps: [
      'Appuyez sur l’icône Partager (carré avec flèche vers le haut) dans la barre de Safari.',
      'Faites défiler le menu et sélectionnez « Sur l’écran d’accueil ».',
      'Appuyez sur « Ajouter » en haut à droite pour terminer l’installation.',
    ],
    androidSteps: [
      'Appuyez sur le menu du navigateur (⋮ en haut à droite).',
      'Sélectionnez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
      'Confirmez l’installation pour créer le raccourci hors ligne.',
    ],
    confirmInstalled: 'J’ai installé l’application',
    close: 'Fermer',
  },
  ar: {
    title: 'تثبيت تطبيق دفتر نصوصي',
    subtitle: 'افتح دفاتر نصوصك وحصصك بملء الشاشة وبدون اتصال بالإنترنت مباشرة من الشاشة الرئيسية.',
    iosTab: 'آيفون / آيباد (Safari)',
    androidTab: 'أندرويد / المتصفح',
    iosSteps: [
      'اضغط على زر المشاركة (المربع الذي يخرج منه سهم للأعلى) في شريط متصفح Safari.',
      'مرّر لأسفل القائمة واختر «إضافة إلى الشاشة الرئيسية» (Sur l’écran d’accueil).',
      'اضغط على «إضافة» (Ajouter) في الأعلى لإتمام تثبيت التطبيق.',
    ],
    androidSteps: [
      'اضغط على قائمة المتصفح (⋮ في أعلى الشاشة).',
      'اختر «تثبيت التطبيق» (Installer l’application) أو «الإضافة إلى الشاشة الرئيسية».',
      'أكّد التثبيت ليظهر التطبيق مباشرة على شاشاتك ويعمل دون اتصال.',
    ],
    confirmInstalled: 'تم تثبيت التطبيق',
    close: 'إغلاق',
  },
  en: {
    title: 'Install Mon cahier de textes',
    subtitle: 'Access your lesson notebooks full-screen and offline directly from your Home Screen.',
    iosTab: 'iPhone / iPad (Safari)',
    androidTab: 'Android / Browser',
    iosSteps: [
      'Tap the Share icon (square with an upward arrow) in the Safari toolbar.',
      'Scroll down and tap “Add to Home Screen”.',
      'Tap “Add” in the top corner to complete installation.',
    ],
    androidSteps: [
      'Tap the browser menu icon (⋮ in the top corner).',
      'Select “Install app” or “Add to Home screen”.',
      'Confirm to install the offline application on your device.',
    ],
    confirmInstalled: 'I installed the application',
    close: 'Close',
  },
} as const;

export function PwaInstallModal({
  open,
  locale,
  platform,
  onClose,
  onConfirmInstalled,
}: PwaInstallModalProps) {
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>(platform === 'ios' ? 'ios' : 'android');

  useEffect(() => {
    setActiveTab(platform === 'ios' ? 'ios' : 'android');
  }, [platform, open]);

  const copy = GUIDE_COPY[locale];
  const steps = activeTab === 'ios' ? copy.iosSteps : copy.androidSteps;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-xs" />
        <DialogPrimitive.Content
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          lang={locale}
          className="fixed inset-0 z-[120] flex items-end justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none sm:items-center sm:p-4"
          onClick={onClose}
        >
          <div
            className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl transition-all"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <img
                src="/icons/apple-touch-icon-180.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-xl border border-border/60 object-cover shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title id="pwa-install-modal-title" className="text-base font-bold text-foreground">
                  {copy.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {copy.subtitle}
                </DialogPrimitive.Description>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={val => setActiveTab(val as 'ios' | 'android')}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              className="mt-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ios" className="min-h-11 text-xs">
                  {copy.iosTab}
                </TabsTrigger>
                <TabsTrigger value="android" className="min-h-11 text-xs">
                  {copy.androidTab}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <ol className="mt-4 space-y-2.5">
              {steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-xs leading-relaxed text-foreground"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                onClick={onConfirmInstalled}
                className="min-h-11 flex-1 rounded-xl text-xs font-semibold"
              >
                {copy.confirmInstalled}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-h-11 rounded-xl text-xs font-medium"
              >
                {copy.close}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

import React, { useState, useEffect, useRef, useCallback, useMemo, FC } from 'react';
import { cn } from '@/lib/utils';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';
import { AccountDataTab } from './components/AccountDataTab';
import { ProfileTab } from './components/ProfileTab';
import { SettingsPanel } from './components/SettingsPrimitives';
import { CalendarRange, Bell, User, Cloud, Palette, BookOpen, Save, Undo2 } from '@/components/ui/icons';

const ScheduleTab = React.lazy(() => import('./components/ScheduleTab').then(m => ({ default: m.ScheduleTab })));
const NotificationsTab = React.lazy(() => import('./components/NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const AppearanceTab = React.lazy(() => import('./components/AppearanceTab').then(m => ({ default: m.AppearanceTab })));

const preloadTabComponent = (tab: SettingsCategory) => {
  switch (tab) {
    case 'apparence':
      import('./components/AppearanceTab');
      break;
    case 'emploi':
      import('./components/ScheduleTab');
      break;
    case 'notifications':
      import('./components/NotificationsTab');
      break;
    case 'compte':
      import('./components/ArchivesSection');
      break;
    default:
      break;
  }
};

const TabLoadingSkeleton: FC = () => (
  <div className="space-y-3 py-2">
    <div className="h-6 w-40 rounded-md skeleton-shimmer" />
    <div className="h-24 w-full rounded-lg skeleton-shimmer" />
    <div className="h-36 w-full rounded-lg skeleton-shimmer" />
  </div>
);

const SETTINGS_MOBILE_DETENTS = [0.72, 0.94];

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
  onExportPlatform: () => void;
  onOpenImport: () => void;
  classes?: ClassInfo[];
  /** création de classe depuis la grille d'emploi du temps */
  onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
}

type SettingsCategory = 'emploi' | 'profil' | 'apparence' | 'notifications' | 'compte';

interface SettingMenuItem {
  id: SettingsCategory;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Cinq onglets : l'aide n'en est plus un, c'est un lien en bas du menu. */
const SETTING_ITEMS: SettingMenuItem[] = [
  { id: 'emploi', titleKey: 'settings.item.schedule', icon: CalendarRange },
  { id: 'profil', titleKey: 'settings.item.profile', icon: User },
  { id: 'apparence', titleKey: 'settings.item.appearance', icon: Palette },
  { id: 'notifications', titleKey: 'settings.item.notifications', icon: Bell },
  { id: 'compte', titleKey: 'settings.item.account', icon: Cloud },
];

/** Liens directs : les anciens identifiants d'onglets restent valides. */
const TAB_ALIASES: Record<string, SettingsCategory> = {
  emploi: 'emploi',
  profil: 'profil',
  apparence: 'apparence',
  notifications: 'notifications',
  compte: 'compte',
  donnees: 'compte',
  archives: 'compte',
};

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onOpenGuide,
  config,
  onConfigChange,
  onExportPlatform,
  onOpenImport,
  classes = [],
  onCreateClass,
}) => {
  const { isRtl, t } = useLocale();
  // Seuls les champs de profil réellement modifiés attendent « Enregistrer ».
  // Les autres onglets suivent toujours la configuration courante (synchro incluse).
  const [profileDraft, setProfileDraft] = useState<Partial<AppConfig>>({});
  const [pendingExit, setPendingExit] = useState<'close' | 'guide' | null>(null);
  const hasProfileChanges = useMemo(() => Object.entries(profileDraft).some(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(config[key as keyof AppConfig])), [profileDraft, config]);
  const finishExit = (destination: 'close' | 'guide') => {
    setProfileDraft({});
    setPendingExit(null);
    if (destination === 'guide') onOpenGuide();
    else onClose();
  };
  const requestExit = (destination: 'close' | 'guide' = 'close') => {
    if (hasProfileChanges) setPendingExit(destination);
    else finishExit(destination);
  };
  const localConfig = useMemo(() => ({ ...config, ...profileDraft }), [config, profileDraft]);
  const updateProfileDraft = (patch: Partial<AppConfig>) => {
    setProfileDraft(previous => ({ ...previous, ...patch }));
  };
  const wasOpenRef = useRef(false);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('emploi');

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setProfileDraft({});
      setPendingExit(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, config]);

  // Consomme d'éventuels liens directs (ex. « compléter l'emploi du temps »).
  useEffect(() => {
    try {
      const requested = sessionStorage.getItem('config_initial_tab_v1');
      if (requested) {
        sessionStorage.removeItem('config_initial_tab_v1');
        if (TAB_ALIASES[requested]) setActiveCategory(TAB_ALIASES[requested]);
      }
    } catch {
      // ignore
    }
  }, []);

  const applyLive = useCallback((patch: Partial<AppConfig>) => {
    onConfigChange(patch);
  }, [onConfigChange]);

  const handleSave = () => {
    if (Object.keys(profileDraft).length > 0) {
      onConfigChange(profileDraft);
    }
    setProfileDraft({});
  };

  const toggleSubject = (subject: string) => {
    setProfileDraft(prev => {
      const current = prev.selectedSubjects ?? config.selectedSubjects ?? [];
      if (current.length === 1 && current.includes(subject)) return prev;
      const next = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      return { ...prev, selectedSubjects: next, showAllSubjects: false };
    });
  };

  const toggleCycle = (cycle: Cycle) => {
    setProfileDraft(prev => {
      const current = prev.selectedCycles ?? config.selectedCycles ?? [];
      if (current.length === 1 && current.includes(cycle)) return prev;
      const next = current.includes(cycle)
        ? current.filter(c => c !== cycle)
        : [...current, cycle];
      return { ...prev, selectedCycles: next, showAllCycles: false };
    });
  };

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'profil':
        return (
          <ProfileTab
            config={localConfig}
            onDraft={updateProfileDraft}
            onToggleSubject={toggleSubject}
            onToggleCycle={toggleCycle}
          />
        );

      case 'apparence':
        return (
          <React.Suspense fallback={<TabLoadingSkeleton />}>
            <AppearanceTab config={localConfig} onConfigChange={applyLive} />
          </React.Suspense>
        );

      case 'emploi':
        return (
          <SettingsPanel title={t('settings.item.schedule')}>
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} onCreateClass={onCreateClass} />
            </React.Suspense>
          </SettingsPanel>
        );

      case 'notifications':
        return (
          <SettingsPanel title={t('settings.item.notifications')}>
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <NotificationsTab config={localConfig} onChange={applyLive} />
            </React.Suspense>
          </SettingsPanel>
        );

      case 'compte':
        return <AccountDataTab config={config} onExport={onExportPlatform} onImport={onOpenImport} />;

      default:
        return null;
    }
  };

  const footer = (
    <div className="grid w-full grid-cols-2 gap-2.5">
      <Button variant="secondary" onClick={() => setProfileDraft({})}
        className="h-auto min-h-11 whitespace-normal rounded-xl px-3 py-2 text-sm">
        <Undo2 aria-hidden className="shrink-0" />
        <span>{t('settings.resetDraft')}</span>
      </Button>
      <Button onClick={handleSave} className="h-auto min-h-11 whitespace-normal rounded-xl px-3 py-2 text-sm">
        <Save aria-hidden className="shrink-0" />
        <span>{t('settings.saveProfile')}</span>
      </Button>
    </div>
  );

  // Rail horizontal : téléphones et petites fenêtres (moins de 768 px).
  const railItems: FluidTabItem<SettingsCategory>[] = useMemo(() => SETTING_ITEMS.map(item => ({
    id: item.id,
    label: t(item.titleKey),
    icon: item.icon,
  })), [t]);

  const navRowClass = (active: boolean) => cn(
    'flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    isRtl && 'text-[15px]',
    active
      ? 'bg-muted font-semibold text-foreground'
      : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => requestExit()}
      title={t('settings.title')}
      maxWidth="xs"
      mobileDetents={SETTINGS_MOBILE_DETENTS}
      initialMobileDetent={0.94}
      className="settings-modal-frame settings-modal-sheet overflow-hidden"
      headerClassName="settings-modal-header"
      bodyClassName="settings-modal-body"
      footer={hasProfileChanges ? footer : undefined}
    >
      <div data-settings-ui className="settings-shell rtl-config-split">
        <div className="settings-rail md:hidden">
          <FluidTabRail<SettingsCategory>
            items={railItems}
            activeId={activeCategory}
            onChange={setActiveCategory}
            layoutId="settings-mobile-tab-pill"
            size="sm"
            ariaLabel={t('settings.title')}
          />
        </div>

        <nav aria-label={t('settings.title')} className="settings-nav hidden md:flex">
          <ul className="space-y-0.5">
            {SETTING_ITEMS.map(item => {
              const active = activeCategory === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setActiveCategory(item.id)}
                    onPointerEnter={() => preloadTabComponent(item.id)}
                    onFocus={() => preloadTabComponent(item.id)}
                    className={navRowClass(active)}
                  >
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'stroke-[1.75]' : 'stroke-[1.5]')} />
                    <span className="truncate">{t(item.titleKey)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto border-t border-border/60 pt-2">
            <button type="button" onClick={() => requestExit('guide')} className={navRowClass(false)}>
              <BookOpen className="h-[18px] w-[18px] shrink-0 stroke-[1.5]" />
              <span className="truncate">{t('settings.item.support')}</span>
            </button>
          </div>
        </nav>

        <div className="settings-scroll modern-scrollbar">
          <section
            key={activeCategory}
            aria-label={t(SETTING_ITEMS.find(item => item.id === activeCategory)!.titleKey)}
            className="settings-page-content"
          >
            {renderCategoryContent()}
          </section>
        </div>
      </div>
    </Modal>
    <ConfirmDialog
      open={pendingExit !== null}
      onOpenChange={open => { if (!open) setPendingExit(null); }}
      title={t('settings.discardProfileTitle')}
      description={t('settings.discardProfileDescription')}
      confirmLabel={t('settings.discardProfile')}
      cancelLabel={t('settings.keepEditing')}
      onConfirm={() => { if (pendingExit) finishExit(pendingExit); }}
      variant="destructive"
    />
    </>
  );
};

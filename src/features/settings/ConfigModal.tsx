import React, { useState, useEffect, useRef, useCallback, useMemo, FC } from 'react';
import './settingsModal.css';
import { cn } from '@/lib/utils';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { AccountDataTab } from './components/AccountDataTab';
import { ProfileTab } from './components/ProfileTab';
import { AbsencesTab } from './components/AbsencesTab';
import { SettingsPanel } from './components/SettingsPrimitives';
import { CalendarRange, Bell, User, Cloud, Palette, BookOpen, Save, Undo2, ChevronLeft, FileSignature } from '@/components/ui/icons';

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
    case 'absences':
      import('./components/AbsencesTab');
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

type SettingsCategory = 'emploi' | 'absences' | 'profil' | 'apparence' | 'notifications' | 'compte';

type SettingsTone = 'blue' | 'violet' | 'pink' | 'amber' | 'green' | 'teal' | 'rose';

interface SettingMenuItem {
  id: SettingsCategory;
  titleKey: string;
  /** Phrase courte sous le titre de la carte (téléphone et tablette). */
  hintKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Couleur propre à la rubrique : la carte, puis la rubrique, se reconnaissent d'un coup d'œil. */
  tone: SettingsTone;
}

/** Six rubriques : l'aide n'en est pas une, c'est une carte-lien (et un lien en bas du menu sur grand écran). */
const SETTING_ITEMS: SettingMenuItem[] = [
  { id: 'emploi', titleKey: 'settings.item.schedule', hintKey: 'settings.card.schedule', icon: CalendarRange, tone: 'blue' },
  { id: 'absences', titleKey: 'settings.item.absences', hintKey: 'settings.card.absences', icon: FileSignature, tone: 'rose' },
  { id: 'profil', titleKey: 'settings.item.profile', hintKey: 'settings.card.profile', icon: User, tone: 'violet' },
  { id: 'apparence', titleKey: 'settings.item.appearance', hintKey: 'settings.card.appearance', icon: Palette, tone: 'pink' },
  { id: 'notifications', titleKey: 'settings.item.notifications', hintKey: 'settings.card.notifications', icon: Bell, tone: 'amber' },
  { id: 'compte', titleKey: 'settings.item.account', hintKey: 'settings.card.account', icon: Cloud, tone: 'green' },
];
const GUIDE_TONE: SettingsTone = 'teal';

/** Liens directs : les anciens identifiants d'onglets restent valides. */
const TAB_ALIASES: Record<string, SettingsCategory> = {
  emploi: 'emploi',
  absences: 'absences',
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
  // Téléphone et tablette : l'accueil est une grille de cartes, une rubrique s'ouvre en plein cadre.
  // Sur grand écran (lg), le menu latéral reste affiché et cet état n'a aucun effet visuel.
  const [sectionOpen, setSectionOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const inSection = sectionOpen && !isDesktop;
  const openSection = useCallback((id: SettingsCategory) => { setActiveCategory(id); setSectionOpen(true); }, []);

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
        if (Object.hasOwn(TAB_ALIASES, requested)) openSection(TAB_ALIASES[requested]);
      }
    } catch {
      // ignore
    }
  }, [openSection]);

  // Téléphone et tablette : Échap / retour Android revient d'abord à la grille de cartes, puis ferme.
  // Un menu, un sélecteur ou une fenêtre ouverte par-dessus garde la main sur sa propre touche.
  useEffect(() => {
    if (!isOpen || !sectionOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isDesktop) return;
      if (document.querySelector('[role="listbox"], [role="menu"]')) return;
      if (document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]').length > 1) return;
      event.preventDefault();
      event.stopPropagation();
      setSectionOpen(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, sectionOpen, isDesktop]);

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

      case 'absences':
        return (
          <AbsencesTab config={localConfig} classes={classes} onConfigChange={applyLive} visible={isDesktop || sectionOpen} />
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
      title={inSection ? (
        <span className="hub-titlebar">
          <button type="button" onClick={() => setSectionOpen(false)} className="hub-back" aria-label={t('settings.back')}>
            <ChevronLeft aria-hidden className="hub-back__chevron" />
          </button>
          <span className="min-w-0 truncate">{t(SETTING_ITEMS.find(item => item.id === activeCategory)!.titleKey)}</span>
        </span>
      ) : <span className="hub-titlebar">{t('settings.title')}</span>}
      maxWidth="xs"
      mobileDetents={SETTINGS_MOBILE_DETENTS}
      initialMobileDetent={0.94}
      className="hub-modal settings-modal-frame settings-modal-sheet overflow-hidden"
      headerClassName="hub-modal-header"
      bodyClassName="hub-modal-body settings-modal-body"
      footer={hasProfileChanges ? footer : undefined}
    >
      <div data-settings-ui className="settings-shell rtl-config-split">
        {/* Téléphone et tablette : de grandes cartes, pas d'onglets. */}
        <div className={cn('settings-home lg:hidden', sectionOpen && 'hidden')}>
          <ul className="hub-grid" aria-label={t('settings.title')}>
            {SETTING_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="contents">
                  <button
                    type="button"
                    data-tone={item.tone}
                    onClick={() => openSection(item.id)}
                    onPointerEnter={() => preloadTabComponent(item.id)}
                    onFocus={() => preloadTabComponent(item.id)}
                    className="hub-card"
                  >
                    <span className="hub-card__icon" aria-hidden="true"><Icon /></span>
                    <span className="hub-card__title">{t(item.titleKey)}</span>
                    <span className="hub-card__hint">{t(item.hintKey)}</span>
                  </button>
                </li>
              );
            })}
            <li className="contents">
              <button type="button" data-tone={GUIDE_TONE} onClick={() => requestExit('guide')} className="hub-card">
                <span className="hub-card__icon" aria-hidden="true"><BookOpen /></span>
                <span className="hub-card__title">{t('settings.item.support')}</span>
                <span className="hub-card__hint">{t('settings.card.support')}</span>
              </button>
            </li>
          </ul>
        </div>

        <nav aria-label={t('settings.title')} className="settings-nav hidden lg:flex">
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
          <div className="settings-nav-footer mt-auto pt-2">
            <button type="button" onClick={() => requestExit('guide')} className={navRowClass(false)}>
              <BookOpen className="h-[18px] w-[18px] shrink-0 stroke-[1.5]" />
              <span className="truncate">{t('settings.item.support')}</span>
            </button>
          </div>
        </nav>

        <div className={cn('settings-scroll modern-scrollbar', !sectionOpen && 'max-lg:hidden')}>
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

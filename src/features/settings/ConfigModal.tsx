import React, { useState, useEffect, useRef, useCallback, useMemo, FC } from 'react';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeMetadata } from '@/i18n/messages';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FluidTabRail, FluidTabItem } from '@/components/ui/FluidTabRail';
import { AccountTab } from './components/AccountTab';
import { getProvincesForAcademy, MOROCCO_EDUCATION_ACADEMIES } from '@/domain/classes/moroccoEducation';
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '@/constants';
import {
  CalendarRange,
  Bell,
  Database,
  User,
  School,
  GraduationCap,
  FlaskConical,
  FolderOpen,
  CircleHelp,
  ChevronRight,
  Save,
  Palette,
  HardDriveDownload,
  HardDriveUpload,
  BookOpen,
  Undo2,
} from '@/components/ui/icons';

const ScheduleTab = React.lazy(() => import('./components/ScheduleTab').then(m => ({ default: m.ScheduleTab })));
const NotificationsTab = React.lazy(() => import('./components/NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const AppearanceTab = React.lazy(() => import('./components/AppearanceTab').then(m => ({ default: m.AppearanceTab })));
const ArchivesSection = React.lazy(() => import('./components/ArchivesSection').then(m => ({ default: m.ArchivesSection })));

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
    case 'archives':
      import('./components/ArchivesSection');
      break;
    default:
      break;
  }
};

const TabLoadingSkeleton: FC = () => (
  <div className="space-y-3 p-2 sm:p-3">
    <div className="h-24 w-full rounded-xl skeleton-shimmer border border-border/40" />
    <div className="h-36 w-full rounded-xl skeleton-shimmer border border-border/30" />
  </div>
);

const CYCLES: { key: Cycle; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'college', icon: School },
  { key: 'lycee', icon: GraduationCap },
  { key: 'prepa', icon: FlaskConical },
];

const SETTINGS_MOBILE_DETENTS = [0.72, 0.94];
const SETTINGS_INTERFACE_LOCALES = localeMetadata.filter(option => option.value === 'fr' || option.value === 'ar');

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

type SettingsCategory =
  | 'emploi'
  | 'profil'
  | 'apparence'
  | 'notifications'
  | 'compte'
  | 'donnees'
  | 'archives'
  | 'assistance';

interface SettingMenuItem {
  id: SettingsCategory;
  titleKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'main' | 'support';
}

/** Ordre de mérite pédagogique et professionnel */
const SETTING_ITEMS: SettingMenuItem[] = [
  {
    id: 'emploi',
    titleKey: 'settings.item.schedule',
    descKey: 'settings.desc.schedule',
    icon: CalendarRange,
    group: 'main',
  },
  {
    id: 'profil',
    titleKey: 'settings.item.profile',
    descKey: 'settings.desc.profile',
    icon: School,
    group: 'main',
  },
  {
    id: 'apparence',
    titleKey: 'settings.item.appearance',
    descKey: 'settings.desc.appearance',
    icon: Palette,
    group: 'main',
  },
  {
    id: 'notifications',
    titleKey: 'settings.item.notifications',
    descKey: 'settings.desc.notifications',
    icon: Bell,
    group: 'main',
  },
  {
    id: 'compte',
    titleKey: 'settings.item.account',
    descKey: 'settings.desc.account',
    icon: User,
    group: 'main',
  },
  {
    id: 'donnees',
    titleKey: 'settings.item.data',
    descKey: 'settings.desc.data',
    icon: Database,
    group: 'main',
  },
  {
    id: 'archives',
    titleKey: 'settings.item.archives',
    descKey: 'settings.desc.archives',
    icon: FolderOpen,
    group: 'support',
  },
  {
    id: 'assistance',
    titleKey: 'settings.item.support',
    descKey: 'settings.desc.support',
    icon: CircleHelp,
    group: 'support',
  },
];

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
  const { locale, isRtl, t } = useLocale();
  const currentLocale = config.applicationLocale ?? locale;
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('settings_sidebar_collapsed_v1');
      if (stored !== null) return stored === 'true';
    } catch {}
    return false;
  });
  const [subjectExpanded, setSubjectExpanded] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('settings_sidebar_collapsed_v1', String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setProfileDraft({});
      setPendingExit(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, config]);

  const handleSelectCategory = (id: SettingsCategory) => {
    setActiveCategory(id);
  };

  // Consomme d'éventuels liens directs
  useEffect(() => {
    try {
      const requested = sessionStorage.getItem('config_initial_tab_v1');
      if (requested) {
        sessionStorage.removeItem('config_initial_tab_v1');
        const mapping: Record<string, SettingsCategory> = {
          emploi: 'emploi',
          notifications: 'notifications',
          donnees: 'donnees',
          compte: 'compte',
          profil: 'profil',
          apparence: 'apparence',
          archives: 'archives',
          assistance: 'assistance',
        };
        if (mapping[requested]) {
          setActiveCategory(mapping[requested]);
        }
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

  const selectedAcademy = localConfig.academyRegion ?? '';
  const availableProvinces = getProvincesForAcademy(selectedAcademy);

  const selectedSubjects = localConfig.selectedSubjects ?? [];
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

  const languageSection = (
    <section className="rounded-lg border border-border/70 p-2.5 sm:p-3">
      <header className="mb-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-foreground">{t('language.settings.title')}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{t('language.settings.description')}</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {SETTINGS_INTERFACE_LOCALES.map(option => {
          const active = currentLocale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => applyLive({ applicationLocale: option.value as AppLocale })}
              aria-pressed={active}
              className={cn(
                'flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary',
                active
                  ? 'border-primary/30 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold shadow-xs ring-1 ring-primary/40'
                  : 'border-border/70 bg-background/80 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border'
              )}
            >
              <span lang={option.value}>{option.nativeName}</span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'compte':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            <AccountTab config={config} />
            {languageSection}
          </div>
        );

      case 'profil':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            {/* 1. Profil & Matière */}
            <section className="rounded-lg border border-border/70 p-2.5 sm:p-3">
              <header className="mb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">{t('settings.group.profile')}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('settings.subjectsHint')}</p>
              </header>

              <div className="space-y-3">
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label htmlFor="settings-teacher-name" className="block text-xs font-semibold text-foreground/80">
                      {t('settings.teacherName')}
                    </label>
                    <Input
                      id="settings-teacher-name"
                      type="text"
                      value={localConfig.defaultTeacherName || ''}
                      onChange={e => updateProfileDraft({ defaultTeacherName: e.target.value })}
                      placeholder={t('settings.teacherPlaceholder')}
                      className="h-11 rounded-lg border-border/70 bg-background/80 px-3 text-base sm:text-sm font-medium text-foreground shadow-2xs placeholder:text-muted-foreground/60 focus:border-amber-400"
                    />
                  </div>


                </div>

                <div className="space-y-1 pt-0.5">
                  <label className="block text-xs font-semibold text-foreground/80">
                    {t('settings.subjects')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBJECTS.slice(0, subjectExpanded ? SUBJECTS.length : 6).map(subject => {
                      const active = selectedSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleSubject(subject)}
                          className={cn(
                            'min-h-11 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs',
                            active
                              ? 'border-amber-500/50 bg-amber-500/15 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-100 font-bold shadow-xs ring-1 ring-amber-500/30'
                              : 'border-border/70 bg-background/60 text-muted-foreground hover:border-amber-500/30 hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          {formatLocalizedSubjectDisplayName(subject, locale)}
                        </button>
                      );
                    })}
                  </div>
                  {SUBJECTS.length > 6 && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setSubjectExpanded(v => !v)}
                        className="min-h-11 rounded-lg px-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                      >
                        {subjectExpanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Cycle & Établissement */}
            <section className="rounded-lg border border-border/70 p-2.5 sm:p-3">
              <header className="mb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">{t('settings.group.school')}</h3>
              </header>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground/80">
                    {t('settings.cycle')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CYCLES.map(c => {
                      const active = (localConfig.selectedCycles ?? []).includes(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => toggleCycle(c.key)}
                          aria-pressed={active}
                          className={cn(
                            'group flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all cursor-pointer shadow-2xs',
                            active
                              ? 'border-amber-500/50 bg-amber-500/15 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-100 font-bold shadow-xs ring-1 ring-amber-500/30'
                              : 'border-border/70 bg-background/60 text-muted-foreground hover:border-amber-500/30 hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <span className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
                            active
                              ? 'bg-amber-500/25 text-amber-900 dark:text-amber-100'
                              : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                          )}>
                            <c.icon className="h-4 w-4" />
                          </span>
                          <span className={cn(
                            'text-xs font-semibold leading-tight text-center',
                            active ? 'text-amber-950 dark:text-amber-100 font-bold' : 'text-muted-foreground group-hover:text-foreground'
                          )}>
                            {t(`settings.cycle.${c.key}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="settings-school" className="block text-sm font-medium text-foreground/80">
                    {t('settings.school')}
                  </label>
                  <Input
                    type="text"
                    id="settings-school"
                    value={localConfig.establishmentName || ''}
                    onChange={e => updateProfileDraft({ establishmentName: e.target.value })}
                    placeholder={t('settings.schoolPlaceholder')}
                    className="h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground shadow-none"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="settings-academy" className="block text-sm font-medium text-foreground/80">
                      {t('settings.academyRegion')}
                    </label>
                    <select
                      id="settings-academy"
                      value={selectedAcademy}
                      onChange={event => updateProfileDraft({
                        academyRegion: event.target.value,
                        educationProvince: '',
                      })}
                      className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                    >
                      <option value="">{t('settings.chooseAcademy')}</option>
                      {MOROCCO_EDUCATION_ACADEMIES.map(academy => (
                        <option key={academy.id} value={academy.id}>
                          {locale === 'ar' ? academy.arabicLabel : academy.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="settings-province" className="block text-sm font-medium text-foreground/80">
                      {t('settings.educationProvince')}
                    </label>
                    <select
                      id="settings-province"
                      value={localConfig.educationProvince ?? ''}
                      disabled={!selectedAcademy || availableProvinces.length === 0}
                      onChange={event => updateProfileDraft({ educationProvince: event.target.value })}
                      className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      <option value="">
                        {selectedAcademy ? t('settings.chooseProvince') : t('settings.chooseAcademyFirst')}
                      </option>
                      {availableProvinces.map(province => (
                        <option key={province.id} value={province.id}>
                          {locale === 'ar' ? province.arabicLabel : province.label}
                          {province.kind === 'prefecture' ? ` · ${t('settings.prefecture')}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'apparence':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <AppearanceTab
                config={localConfig}
                onConfigChange={applyLive}
              />
            </React.Suspense>
          </div>
        );

      case 'emploi':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} onCreateClass={onCreateClass} />
            </React.Suspense>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <NotificationsTab config={localConfig} onChange={applyLive} />
            </React.Suspense>
          </div>
        );

      case 'donnees':
        return (
          <div className="space-y-3">
            {[
              { icon: HardDriveDownload, title: 'settings.exportTitle', hint: 'settings.exportAction', action: onExportPlatform },
              { icon: HardDriveUpload, title: 'settings.importTitle', hint: 'settings.importAction', action: onOpenImport },
            ].map(({ icon: Icon, title, hint, action }) => (
              <Button key={title} variant="outline" onClick={action}
                className="h-auto min-h-20 w-full justify-start gap-3 rounded-xl p-4 text-start whitespace-normal">
                <Icon aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{t(title)}</span>
                  <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{t(hint)}</span>
                </span>
                <ChevronRight aria-hidden className={cn('h-4 w-4 shrink-0 text-muted-foreground', isRtl && 'rotate-180')} />
              </Button>
            ))}
          </div>
        );

      case 'archives':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <ArchivesSection schoolYearStart={config.schoolYearStart} />
            </React.Suspense>
          </div>
        );

      case 'assistance':
        return (
          <Button variant="outline" onClick={() => requestExit('guide')}
            className="h-auto min-h-20 w-full justify-start gap-3 rounded-xl p-4 text-start whitespace-normal">
            <BookOpen aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t('settings.support.guideTitle')}</span>
              <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{t('settings.guideHint')}</span>
            </span>
            <ChevronRight aria-hidden className={cn('h-4 w-4 shrink-0 text-muted-foreground', isRtl && 'rotate-180')} />
          </Button>
        );

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

  const mainMenuItems = SETTING_ITEMS.filter(i => i.group === 'main');
  const supportMenuItems = SETTING_ITEMS.filter(i => i.group === 'support');
  const isEffectiveCollapsed = isSidebarCollapsed;

  // Master sidebar - Format compact style Microsoft desktop avec icônes parfaitement centrées
  const menuListContent = (
    <div className="space-y-2 transition-all duration-300 h-full flex flex-col">
      {/* Sidebar Toggle Button (Desktop Only) */}
      <div className={cn('hidden lg:flex items-center pb-1', isEffectiveCollapsed ? 'justify-center' : 'justify-between px-1')}>
        {!isEffectiveCollapsed && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
            {locale === 'ar' ? 'الأقسام' : 'Sections'}
          </span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'flex items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            isEffectiveCollapsed ? 'h-8 w-8 mx-auto' : 'h-7 w-7'
          )}
          title={t(isSidebarCollapsed ? 'settings.expandMenu' : 'settings.collapseMenu')}
          aria-label={t(isSidebarCollapsed ? 'settings.expandMenu' : 'settings.collapseMenu')}
        >
          <ChevronRight className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isEffectiveCollapsed
              ? (isRtl ? 'rotate-180' : '')
              : (isRtl ? '' : 'rotate-180')
          )} />
        </button>
      </div>

      {/* Paramètres principaux */}
      <div className={cn('flex-1 space-y-1', isEffectiveCollapsed && 'space-y-1.5')}>
        {mainMenuItems.map(item => {
          const isActive = activeCategory === item.id;
          const Icon = item.icon;

          if (isEffectiveCollapsed) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCategory(item.id)}
                aria-pressed={isActive}
                onPointerDown={() => preloadTabComponent(item.id)}
                onPointerEnter={() => preloadTabComponent(item.id)}
                onFocus={() => preloadTabComponent(item.id)}
                title={t(item.titleKey)}
                aria-label={t(item.titleKey)}
                className={cn(
                  'relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95',
                  isActive
                    ? 'bg-primary/15 dark:bg-primary/25 text-primary'
                    : 'bg-transparent text-muted-foreground/75 hover:bg-muted/70 hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5 stroke-[1.85] shrink-0" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectCategory(item.id)}
              aria-pressed={isActive}
              onPointerDown={() => preloadTabComponent(item.id)}
              onPointerEnter={() => preloadTabComponent(item.id)}
              onFocus={() => preloadTabComponent(item.id)}
              title={t(item.titleKey)}
              className={cn(
                'group relative flex w-full items-center justify-between gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]',
                isActive
                  ? 'bg-primary/12 dark:bg-primary/20 text-primary font-bold'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn('block text-xs leading-snug truncate transition-colors', isRtl && 'text-sm font-semibold', isActive ? 'font-bold' : 'font-medium')}>
                    {t(item.titleKey)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 self-center flex items-center justify-center ps-1">
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200',
                    isRtl && 'rotate-180',
                    isActive && 'text-primary'
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Séparateur élégant */}
      {isEffectiveCollapsed ? (
        <div className="my-1.5 h-[1px] w-6 mx-auto bg-border/60" aria-hidden="true" />
      ) : (
        <div className="my-1 border-t border-border/50" aria-hidden="true" />
      )}

      {/* Assistance & Archives */}
      <div className={cn('space-y-1', isEffectiveCollapsed && 'space-y-1.5')}>
        {supportMenuItems.map(item => {
          const isActive = activeCategory === item.id;
          const Icon = item.icon;

          if (isEffectiveCollapsed) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCategory(item.id)}
                aria-pressed={isActive}
                onPointerDown={() => preloadTabComponent(item.id)}
                onPointerEnter={() => preloadTabComponent(item.id)}
                onFocus={() => preloadTabComponent(item.id)}
                title={t(item.titleKey)}
                aria-label={t(item.titleKey)}
                className={cn(
                  'relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95',
                  isActive
                    ? 'bg-primary/15 dark:bg-primary/25 text-primary'
                    : 'bg-transparent text-muted-foreground/75 hover:bg-muted/70 hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5 stroke-[1.85] shrink-0" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectCategory(item.id)}
              aria-pressed={isActive}
              onPointerDown={() => preloadTabComponent(item.id)}
              onPointerEnter={() => preloadTabComponent(item.id)}
              onFocus={() => preloadTabComponent(item.id)}
              title={t(item.titleKey)}
              className={cn(
                'group relative flex w-full items-center justify-between gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]',
                isActive
                  ? 'bg-primary/12 dark:bg-primary/20 text-primary font-bold'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn('block text-xs leading-snug truncate transition-colors', isRtl && 'text-sm font-semibold', isActive ? 'font-bold' : 'font-medium')}>
                    {t(item.titleKey)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 self-center flex items-center justify-center ps-1">
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200',
                    isRtl && 'rotate-180',
                    isActive && 'text-primary'
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const mobileSettingItems: FluidTabItem<SettingsCategory>[] = useMemo(() => {
    return SETTING_ITEMS.map(item => ({
      id: item.id,
      label: t(item.titleKey),
      icon: item.icon,
    }));
  }, [t]);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => requestExit()}
      title={t('settings.title')}
      description={activeCategory === 'profil' ? t('settings.profileSaveHint')
        : ['emploi', 'apparence', 'notifications', 'compte'].includes(activeCategory) ? t('settings.liveChangesHint') : undefined}
      maxWidth="5xl"
      mobileDetents={SETTINGS_MOBILE_DETENTS}
      initialMobileDetent={0.94}
      className="settings-modal-sheet overflow-hidden sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1200px] sm:rounded-2xl"
      headerClassName="border-b border-border/70 lg:px-5 lg:py-3.5"
      bodyClassName="p-3 sm:p-3.5 lg:p-4"
      footer={hasProfileChanges ? footer : undefined}
    >
      {/* Mobile Horizontal Tabs Selector avec déplacement fluide et centrage dynamique */}
      <div className="settings-mobile-navigation sticky top-0 z-20 flex lg:hidden mb-5 -mx-1 px-1 pb-3 bg-card">
        <FluidTabRail<SettingsCategory>
          items={mobileSettingItems}
          activeId={activeCategory}
          onChange={handleSelectCategory}
          layoutId="settings-mobile-tab-pill"
          size="sm"
          ariaLabel={t('settings.title')}
        />
      </div>

      <div data-settings-ui className="rtl-config-split flex flex-col lg:flex-row gap-3.5 lg:gap-5">
        {/* Desktop Sidebar Rail */}
        <aside
          aria-label={locale === 'ar' ? 'أقسام الإعدادات' : 'Catégories des paramètres'}
          className={cn(
            'hidden lg:flex flex-col shrink-0 transition-[width] duration-200 ease-out border-e border-border/60 pe-2.5 xl:pe-3.5',
            isEffectiveCollapsed ? 'w-14' : 'w-56 xl:w-64'
          )}
        >
          {menuListContent}
        </aside>

        {/* Content Zone */}
        <main className="settings-content-zone flex flex-1 flex-col min-w-0">
          <div className="flex-1">
            <section key={activeCategory} aria-label={t(SETTING_ITEMS.find(item => item.id === activeCategory)!.titleKey)} className="settings-page-content">
              {renderCategoryContent()}
            </section>
          </div>

        </main>
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

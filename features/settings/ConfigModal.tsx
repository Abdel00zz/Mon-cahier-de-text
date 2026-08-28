import React, { useState, useEffect, FC } from 'react';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { localeMetadata, useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CountryFlag } from '@/components/ui/CountryFlags';
import { AccountTab } from './components/AccountTab';
import { getProvincesForAcademy, MOROCCO_EDUCATION_ACADEMIES } from '@/utils/moroccoEducation';

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
  <div className="space-y-4 p-2 sm:p-3">
    <div className="flex items-center gap-3.5 mb-5">
      <div className="h-10 w-10 shrink-0 rounded-xl skeleton-shimmer" />
      <div className="space-y-2 flex-1 min-w-0">
        <div className="h-5 w-44 rounded-md skeleton-shimmer" />
        <div className="h-3.5 w-64 max-w-full rounded-md skeleton-shimmer" />
      </div>
    </div>
    <div className="h-28 w-full rounded-2xl skeleton-shimmer border border-border/40" />
    <div className="h-44 w-full rounded-2xl skeleton-shimmer border border-border/30" />
  </div>
);
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '@/constants';
import {
  CalendarRange,
  Bell,
  Database,
  User,
  School,
  GraduationCap,
  FlaskConical,
  Settings,
  FolderOpen,
  CircleHelp,
  ChevronRight,
  CircleCheck,
  Save,
  LogOut,
  Palette,
} from '@/components/ui/icons';

const CYCLES: { key: Cycle; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'college', icon: School },
  { key: 'lycee', icon: GraduationCap },
  { key: 'prepa', icon: FlaskConical },
];

const SETTINGS_MOBILE_DETENTS = [0.68, 0.92];

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
  onExportPlatform: () => void;
  onOpenImport: () => void;
  classes?: ClassInfo[];
  /** création de classe depuis la grille d'emploi du temps */
  onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
}

type SettingsCategory =
  | 'compte'
  | 'profil'
  | 'apparence'
  | 'emploi'
  | 'notifications'
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

const SETTING_ITEMS: SettingMenuItem[] = [
  {
    id: 'compte',
    titleKey: 'settings.item.account',
    descKey: 'settings.desc.account',
    icon: User,
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
    id: 'emploi',
    titleKey: 'settings.item.schedule',
    descKey: 'settings.desc.schedule',
    icon: CalendarRange,
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
    group: 'main',
  },
  {
    id: 'assistance',
    titleKey: 'settings.item.support',
    descKey: 'settings.desc.support',
    icon: CircleHelp,
    group: 'support',
  },
];

export const ConfigModal: FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onExportPlatform,
  onOpenImport,
  classes = [],
  onCreateClass,
}) => {
  const { locale, isRtl, t } = useLocale();
  const { user } = useAuth();
  const [localConfig, setLocalConfig] = useState(config);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('compte');
  const [mobileSubViewOpen, setMobileSubViewOpen] = useState(false);
  // Sur ordinateur : menu ouvert avec labels visibles par défaut
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [subjectExpanded, setSubjectExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  const handleSelectCategory = (id: SettingsCategory) => {
    setActiveCategory(id);
    if (window.innerWidth < 768) {
      setMobileSubViewOpen(true);
      window.history.pushState({ ...window.history.state, settingsSubView: id }, '');
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (mobileSubViewOpen && !e.state?.settingsSubView) {
        setMobileSubViewOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileSubViewOpen]);

  // Consomme d'éventuels liens directs (ex. vers l'emploi du temps)
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
        };
        if (mapping[requested]) {
          setActiveCategory(mapping[requested]);
          setMobileSubViewOpen(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const applyLive = (patch: Partial<AppConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...patch }));
    onConfigChange(patch);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const selectedAcademy = localConfig.academyRegion ?? '';
  const availableProvinces = getProvincesForAcademy(selectedAcademy);
  const sectionTitleClass = 'font-bold tracking-tight text-base sm:text-[17px]';

  // Matières enseignées (multi-sélection) : filtrent le choix de matière à la
  // création d'une classe et pilotent le domaine des types de contenu.
  const selectedSubjects = localConfig.selectedSubjects ?? [];
  const toggleSubject = (subject: string) => {
    setLocalConfig(prev => {
      const current = prev.selectedSubjects ?? [];
      // Le profil conserve toujours une matière : les écrans de création
      // peuvent ainsi l'hériter sans demander un choix redondant.
      if (current.length === 1 && current.includes(subject)) return prev;
      const next = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      return { ...prev, selectedSubjects: next, showAllSubjects: false };
    });
  };

  const toggleCycle = (cycle: Cycle) => {
    setLocalConfig(prev => {
      const current: Cycle[] = prev.selectedCycles?.length ? prev.selectedCycles : ['college'];
      if (current.includes(cycle)) {
        // Un profil doit toujours conserver au moins un cycle pédagogique.
        if (current.length === 1) return prev;
        return { ...prev, selectedCycles: current.filter(item => item !== cycle), showAllCycles: false };
      }
      return { ...prev, selectedCycles: [...current, cycle], showAllCycles: false };
    });
  };

  const languageSection = (
    <section className="settings-section-block relative overflow-hidden p-4 sm:p-5">
      <div className="mb-4 text-center">
        <h3 className="text-sm font-bold text-foreground">{t('language.settings.title')}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('language.settings.description')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {localeMetadata.map(option => {
          const active = (localConfig.applicationLocale ?? 'fr') === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocalConfig(prev => ({ ...prev, applicationLocale: option.value as AppLocale }))}
              aria-pressed={active}
              className={cn(
                'flex min-w-[110px] sm:min-w-[130px] flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-200 cursor-pointer shadow-xs',
                active
                  ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30 font-bold scale-[1.02] shadow-[0_4px_16px_rgba(6,182,212,0.18)]'
                  : 'border-white/[0.08] dark:border-white/[0.06] bg-background/60 text-muted-foreground hover:border-cyan-500/30 hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <div className="flex h-9 items-center justify-center">
                <CountryFlag code={option.value as 'fr' | 'ar' | 'en'} className="w-8 h-5.5 rounded-xs shadow-xs" />
              </div>
              <span className={cn('text-sm font-bold leading-tight', option.value === 'ar' && 'font-bold tracking-normal')}>
                {option.shortName}
              </span>
              <span className={cn('text-[11px] font-medium text-muted-foreground', active && 'text-cyan-600 dark:text-cyan-400 font-semibold')}>
                {option.nativeName}
              </span>
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
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <User className="h-4.5 w-4.5 text-primary shrink-0" />
                {t('settings.section.accountTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.accountDescription')}
              </p>
            </div>
            {languageSection}
            <AccountTab />
          </div>
        );

      case 'profil':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <School className="h-4.5 w-4.5 text-primary shrink-0" />
                {t('settings.section.profileTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.profileDescription')}
              </p>
            </div>

            {/* 1. Profil & Matière */}
            <section className="settings-section-block relative overflow-hidden p-3.5 sm:p-4.5">
              <header className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-border/50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-2xs">
                  <User className="h-4 w-4 stroke-[2]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">{t('settings.group.profile')}</h3>
                  <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">{t('settings.subjectsHint')}</p>
                </div>
              </header>

              <div className="space-y-3.5">
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                      {t('settings.teacherName')}
                    </label>
                    <Input
                      type="text"
                      value={localConfig.defaultTeacherName || ''}
                      onChange={e => setLocalConfig(prev => ({ ...prev, defaultTeacherName: e.target.value }))}
                      placeholder={t('settings.teacherPlaceholder')}
                      className="h-9 sm:h-10 rounded-xl border-border/70 bg-background/80 px-3.5 text-sm font-medium text-foreground shadow-2xs placeholder:text-muted-foreground/60 focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                      {t('settings.phone')}
                    </label>
                    <Input
                      type="tel"
                      value={user?.phone ?? ''}
                      disabled
                      readOnly
                      placeholder="—"
                      className="h-9 sm:h-10 rounded-xl border-border/40 bg-muted/40 px-3.5 text-sm shadow-2xs text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <label className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                    {t('settings.subjects')}
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {SUBJECTS.slice(0, subjectExpanded ? SUBJECTS.length : 6).map(subject => {
                      const active = selectedSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleSubject(subject)}
                          className={cn(
                            'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs',
                            active
                              ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-inset ring-cyan-500/30 shadow-[0_2px_8px_rgba(6,182,212,0.18)] scale-[1.02]'
                              : 'border-border/60 bg-background/60 text-muted-foreground hover:border-cyan-500/30 hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          {formatLocalizedSubjectDisplayName(subject, locale)}
                        </button>
                      );
                    })}
                  </div>
                  {SUBJECTS.length > 6 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSubjectExpanded(v => !v)}
                        className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        {subjectExpanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Cycle & Établissement */}
            <section className="settings-section-block relative overflow-hidden p-3.5 sm:p-4.5">
              <header className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-border/50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-2xs">
                  <School className="h-4 w-4 stroke-[2]" />
                </span>
                <h3 className="text-sm sm:text-[14.5px] font-semibold text-foreground">{t('settings.group.school')}</h3>
              </header>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                    {t('settings.cycle')}
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {CYCLES.map(c => {
                      const active = (localConfig.selectedCycles ?? ['college']).includes(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => toggleCycle(c.key)}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all duration-200 outline-none cursor-pointer',
                            active
                              ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 shadow-[0_4px_16px_rgba(6,182,212,0.18)] ring-1 ring-inset ring-cyan-500/30 scale-[1.02]'
                              : 'border-border/60 bg-background/60 hover:border-cyan-500/30 hover:bg-muted/40'
                          )}
                        >
                          <span className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 group-hover:scale-105',
                            active
                              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_2px_8px_rgba(6,182,212,0.35)]'
                              : 'bg-muted/60 text-muted-foreground'
                          )}>
                            <c.icon className="h-4 w-4" />
                          </span>
                          <span className={cn(
                            'text-xs font-semibold leading-tight text-center',
                            active ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground'
                          )}>
                            {t(`settings.cycle.${c.key}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                    {t('settings.establishment')}
                  </label>
                  <Input
                    type="text"
                    value={localConfig.establishmentName || ''}
                    onChange={e => setLocalConfig(prev => ({ ...prev, establishmentName: e.target.value }))}
                    placeholder={t('settings.establishmentPlaceholder')}
                    className="h-9 sm:h-10 rounded-xl border-border/70 bg-background/80 px-3.5 text-sm shadow-2xs focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="academy-region" className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                      {t('settings.academy')}
                    </label>
                    <select
                      id="academy-region"
                      value={selectedAcademy}
                      onChange={event => {
                        const academyRegion = event.target.value;
                        const provinces = getProvincesForAcademy(academyRegion);
                        setLocalConfig(prev => ({
                          ...prev,
                          academyRegion,
                          educationProvince: provinces.some(province => province.id === prev.educationProvince)
                            ? prev.educationProvince
                            : '',
                        }));
                      }}
                      className="h-9 sm:h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
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
                    <label htmlFor="education-province" className="block text-xs sm:text-[13px] font-semibold text-foreground/80">
                      {t('settings.province')}
                    </label>
                    <select
                      id="education-province"
                      value={localConfig.educationProvince ?? ''}
                      disabled={!selectedAcademy}
                      onChange={event => setLocalConfig(prev => ({ ...prev, educationProvince: event.target.value }))}
                      className="h-9 sm:h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
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
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <Palette className="h-4.5 w-4.5 text-primary shrink-0" />
                {t('settings.section.appearanceTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.appearanceDescription')}
              </p>
            </div>
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
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <CalendarRange className="h-4.5 w-4.5 text-primary shrink-0" />
                {t('settings.section.scheduleTitle')}
              </h2>
            </div>
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} onCreateClass={onCreateClass} />
            </React.Suspense>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <Bell className="h-4.5 w-4.5 text-primary shrink-0" />
                {t('settings.section.notificationsTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.notificationsDescription')}
              </p>
            </div>
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <NotificationsTab config={localConfig} onChange={applyLive} />
            </React.Suspense>
          </div>
        );

      case 'donnees':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <Database className="h-4.5 w-4.5 text-primary shrink-0" />
                {t('settings.section.dataTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.dataDescription')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="settings-section-block flex flex-col justify-between p-3.5 sm:p-4.5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{t('settings.exportTitle')}</h3>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.exportDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onExportPlatform}
                  className="h-10 w-full rounded-xl bg-primary font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
                >
                  {t('settings.exportAction')}
                </Button>
              </div>

              <div className="settings-section-block flex flex-col justify-between p-3.5 sm:p-4.5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground tracking-tight mb-1">{t('settings.importTitle')}</h3>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.importDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenImport}
                  className="w-full border-border bg-background/60 font-bold hover:bg-muted/60 transition-all cursor-pointer rounded-xl h-10"
                >
                  {t('settings.importAction')}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'archives':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <FolderOpen className="h-4.5 w-4.5 text-cyan-500 shrink-0" />
                {t('settings.section.archivesTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.archivesDescription')}
              </p>
            </div>
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              <ArchivesSection schoolYearStart={config.schoolYearStart} />
            </React.Suspense>
          </div>
        );

      case 'assistance':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div className="mb-3.5 sm:mb-4">
              <h2 className={cn('text-base sm:text-[17px] font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <CircleHelp className="h-4.5 w-4.5 text-cyan-500 shrink-0" />
                {t('settings.section.supportTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.supportDescription')}
              </p>
            </div>

            {/* Premium Card */}
            <div className="settings-section-block p-3.5 sm:p-4.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                    <CircleCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t('settings.support.planTitle')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.support.planDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of actions */}
            <div className="settings-section-block divide-y divide-border/50 overflow-hidden">
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-foreground">{t('settings.support.devicesTitle')}</h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    {t('settings.support.devicesDescription')}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 ring-1 ring-emerald-500/20">
                  {t('settings.support.connected')}
                </span>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{t('settings.support.guideTitle')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.support.guideDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem('open_guide_now', 'true');
                    onClose();
                  }}
                  className="text-xs font-bold cursor-pointer border-border rounded-xl"
                >
                  {t('settings.support.openGuide')}
                </Button>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{t('settings.support.feedbackTitle')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.support.feedbackDescription')}
                  </p>
                </div>
                <a
                  href="mailto:support@cahier-textes.ma"
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  {t('settings.support.contact')}
                </a>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const { logout } = useAuth();

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div>
        {activeCategory === 'compte' && user ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => logout()}
            className="h-10 rounded-lg border border-destructive/45 bg-transparent px-4 text-xs font-bold text-destructive shadow-none transition-colors hover:border-destructive/70 hover:bg-destructive/[0.06] hover:text-destructive cursor-pointer gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('account.signOut')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-xs font-bold cursor-pointer rounded-xl h-10 border border-white/[0.08]"
          >
            {t('common.cancel')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleSave}
          className="h-10 gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.99] cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );

  const getCategoryDescription = (id: SettingsCategory, userLocale: AppLocale): string => {
    const map: Record<SettingsCategory, Record<AppLocale, string>> = {
      compte: {
        fr: 'Langue, identifiants & session',
        ar: 'اللغة، المعرفات والحساب',
        en: 'Language, login & session',
      },
      profil: {
        fr: 'Nom, cycles, matière & académie',
        ar: 'الاسم، الأسلاك، المادة والأكاديمية',
        en: 'Name, cycles, subject & academy',
      },
      apparence: {
        fr: 'Couleurs, polices & styles visuels',
        ar: 'الألوان، الخطوط والتأثيرات البصرية',
        en: 'Colors, typography & visual theme',
      },
      emploi: {
        fr: 'Créneaux horaires & répartition',
        ar: 'الحصص وتوزيع الساعات الأسبوعية',
        en: 'Weekly slots & schedule balance',
      },
      notifications: {
        fr: 'Alertes intelligentes & rappels',
        ar: 'التنبيهات الذكية والإشعارات',
        en: 'Smart alerts & reminders',
      },
      donnees: {
        fr: 'Sauvegardes, export & reset',
        ar: 'النسخ الاحتياطي والاستيراد',
        en: 'Backups, export & reset',
      },
      archives: {
        fr: 'Années scolaires & historique',
        ar: 'السنوات السابقة والدفاتر المؤرشفة',
        en: 'School years & archived notebooks',
      },
      assistance: {
        fr: 'Guide d’utilisation & support',
        ar: 'دليل الاستعمال والدعم الفني',
        en: 'User guide & support',
      },
    };
    return map[id]?.[userLocale] ?? map[id]?.fr ?? '';
  };

  const mainMenuItems = SETTING_ITEMS.filter(i => i.group === 'main');
  const supportMenuItems = SETTING_ITEMS.filter(i => i.group === 'support');

  const isEffectiveCollapsed = isSidebarCollapsed;

  // Master sidebar / list view
  const menuListContent = (
    <div className="space-y-3 transition-all duration-300 h-full flex flex-col">
      {/* Sidebar Toggle Button (Desktop Only) */}
      <div className={cn("hidden md:flex items-center justify-between pb-1", isEffectiveCollapsed ? "justify-center" : "")}>
        {!isEffectiveCollapsed && (
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
            {locale === 'ar' ? 'الأقسام' : 'Sections'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border border-border/40"
          title={t(isSidebarCollapsed ? 'settings.expandMenu' : 'settings.collapseMenu')}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", (isRtl ? isSidebarCollapsed : !isSidebarCollapsed) && "rotate-180")} />
        </button>
      </div>

      {/* Mobile Header (When on Phone) */}
      <div className="block md:hidden mb-2 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          {locale === 'ar' ? 'أقسام الإعدادات' : 'Sections des paramètres'}
        </span>
      </div>

      {/* Paramètres principaux */}
      <div className="flex-1">
        <div className="space-y-2">
          {mainMenuItems.map(item => {
            const isActive = activeCategory === item.id;
            const Icon = item.icon;
            const desc = getCategoryDescription(item.id, locale);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCategory(item.id)}
                onPointerDown={() => preloadTabComponent(item.id)}
                onPointerEnter={() => preloadTabComponent(item.id)}
                onFocus={() => preloadTabComponent(item.id)}
                title={t(item.titleKey)}
                className={cn(
                  'group relative flex w-full items-center transition-all duration-200 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isEffectiveCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between gap-3 px-3.5 py-3 text-start',
                  isActive
                    ? 'border border-primary/30 bg-primary/10 text-foreground shadow-xs'
                    : 'border border-border/60 bg-card text-card-foreground hover:border-border hover:bg-accent/60'
                )}
              >
                {/* Left section: Icon + Text */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary'
                    )}
                  >
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className={cn('min-w-0 flex-1', isEffectiveCollapsed ? 'hidden md:hidden' : 'block')}>
                    <span className={cn('block text-sm leading-snug truncate transition-colors duration-200', isActive ? 'font-bold text-primary' : 'font-semibold text-foreground')}>
                      {t(item.titleKey)}
                    </span>
                    {desc && (
                      <span className="block text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                        {desc}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right section: Vertically Centered Chevron Arrow */}
                {!isEffectiveCollapsed && (
                  <div className="shrink-0 self-center flex items-center justify-center ps-1">
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5',
                        isRtl && 'rotate-180 group-hover:-translate-x-0.5',
                        isActive && 'text-primary'
                      )}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assistance & Aide */}
      <div className="pt-2">
        <div className="space-y-2">
          {supportMenuItems.map(item => {
            const isActive = activeCategory === item.id;
            const Icon = item.icon;
            const desc = getCategoryDescription(item.id, locale);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCategory(item.id)}
                onPointerDown={() => preloadTabComponent(item.id)}
                onPointerEnter={() => preloadTabComponent(item.id)}
                onFocus={() => preloadTabComponent(item.id)}
                title={t(item.titleKey)}
                className={cn(
                  'group relative flex w-full items-center transition-all duration-200 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isEffectiveCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between gap-3 px-3.5 py-3 text-start',
                  isActive
                    ? 'border border-primary/30 bg-primary/10 text-foreground shadow-xs'
                    : 'border border-border/60 bg-card text-card-foreground hover:border-border hover:bg-accent/60'
                )}
              >
                {/* Left section: Icon + Text */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary'
                    )}
                  >
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className={cn('min-w-0 flex-1', isEffectiveCollapsed ? 'hidden md:hidden' : 'block')}>
                    <span className={cn('block text-sm leading-snug truncate transition-colors duration-200', isActive ? 'font-bold text-primary' : 'font-semibold text-foreground')}>
                      {t(item.titleKey)}
                    </span>
                    {desc && (
                      <span className="block text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                        {desc}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right section: Vertically Centered Chevron Arrow */}
                {!isEffectiveCollapsed && (
                  <div className="shrink-0 self-center flex items-center justify-center ps-1">
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5',
                        isRtl && 'rotate-180 group-hover:-translate-x-0.5',
                        isActive && 'text-primary'
                      )}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <Settings className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('settings.title')}
          </span>
        </div>
      }
      description={t('settings.description')}
      maxWidth="5xl"
      swipeFromBody
      mobileDetents={SETTINGS_MOBILE_DETENTS}
      initialMobileDetent={0.68}
      className="settings-modal-sheet overflow-hidden border border-border/80 bg-card sm:max-w-5xl sm:rounded-[28px]"
      headerClassName="border-b border-border/55 bg-card px-5 py-4 sm:px-7 sm:py-4.5"
      bodyClassName="p-4 sm:p-6"
    >
      <div className="rtl-config-split grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[480px]">
        <div
          className={cn(
            'md:col-span-5 lg:col-span-4 flex flex-col',
            isRtl ? 'border-l border-border/60 pl-0 md:pl-5' : 'border-r border-border/60 pr-0 md:pr-5',
            mobileSubViewOpen ? 'hidden md:flex' : 'flex'
          )}
        >
          {menuListContent}
        </div>

        <div
          className={cn(
            'settings-content-zone md:col-span-7 lg:col-span-8 flex flex-col',
            isRtl ? 'pr-0 md:pr-1' : 'pl-0 md:pl-1',
            !mobileSubViewOpen ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="flex-1">
            <div key={activeCategory} className="settings-page-content animate-in fade-in duration-100">
              {renderCategoryContent()}
            </div>
          </div>
          
          <div className="mt-6 pt-3 border-t border-border/50">
            {footer}
          </div>
        </div>
      </div>
    </Modal>
  );
};

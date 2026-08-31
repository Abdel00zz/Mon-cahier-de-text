import React, { useState, useEffect, useRef, useCallback, useMemo, FC } from 'react';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { localeMetadata, useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CountryFlag } from '@/components/ui/CountryFlags';
import { AccountTab } from './components/AccountTab';
import { getProvincesForAcademy, MOROCCO_EDUCATION_ACADEMIES } from '@/utils/moroccoEducation';
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
  CircleCheck,
  Save,
  Palette,
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

const SETTINGS_MOBILE_DETENTS = [0.68, 0.92];
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
  const { user } = useAuth();
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [subjectExpanded, setSubjectExpanded] = useState(false);

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
    onClose();
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
    <section className="rounded-xl border border-border/80 bg-card/60 p-3 sm:p-3.5 shadow-2xs">
      <header className="mb-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-foreground">{t('language.settings.title')}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{t('language.settings.description')}</p>
      </header>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-2.5">
        {SETTINGS_INTERFACE_LOCALES.map(option => {
          const active = currentLocale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => applyLive({ applicationLocale: option.value as AppLocale })}
              aria-pressed={active}
              className={cn(
                'relative flex min-w-[105px] sm:min-w-[125px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 sm:p-3 text-center transition-all duration-200 cursor-pointer active:scale-95',
                active
                  ? 'border-amber-400 bg-[#feefc3] text-[#202124] dark:border-amber-500/50 dark:bg-[#41331c] dark:text-amber-100 font-bold shadow-xs ring-1 ring-amber-400/40'
                  : 'border-border/70 bg-card/80 text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] hover:border-amber-300/60'
              )}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#41331c]" />
              )}
              <div className="flex h-8 items-center justify-center">
                <CountryFlag code={option.value as 'fr' | 'ar' | 'en'} className="w-8 h-5 rounded-xs shadow-xs" />
              </div>
              <span className={cn('text-xs font-bold leading-tight', option.value === 'ar' && 'font-bold tracking-normal')}>
                {option.shortName}
              </span>
              <span className={cn('text-[10px] font-semibold', active ? 'text-[#202124] dark:text-amber-200' : 'text-muted-foreground')}>
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
          <div className="space-y-3 sm:space-y-3.5">
            <AccountTab />
            {languageSection}
          </div>
        );

      case 'profil':
        return (
          <div className="space-y-3 sm:space-y-3.5">
            {/* 1. Profil & Matière */}
            <section className="rounded-xl border border-border/80 bg-card/60 p-3 sm:p-4 shadow-2xs">
              <header className="mb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">{t('settings.group.profile')}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('settings.subjectsHint')}</p>
              </header>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
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

                  <div className="space-y-1">
                    <label htmlFor="settings-phone" className="block text-xs font-semibold text-foreground/80">
                      {t('settings.phone')}
                    </label>
                    <Input
                      id="settings-phone"
                      type="tel"
                      value={user?.phone ?? ''}
                      disabled
                      readOnly
                      placeholder="—"
                      className="h-11 rounded-lg border-border/40 bg-muted/40 px-3 text-base sm:text-sm shadow-2xs text-muted-foreground font-mono"
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
                            'rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs',
                            active
                              ? 'border-amber-400/80 bg-[#feefc3] text-[#202124] dark:bg-[#41331c] dark:text-amber-100 dark:border-amber-500/50 shadow-xs ring-1 ring-amber-400/30'
                              : 'border-border/60 bg-background/60 text-muted-foreground hover:border-amber-400/40 hover:bg-muted/50 hover:text-foreground'
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
                        className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                      >
                        {subjectExpanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Cycle & Établissement */}
            <section className="rounded-xl border border-border/80 bg-card/60 p-3 sm:p-4 shadow-2xs">
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
                            'keep-surface keep-choice keep-interactive group flex min-h-11 flex-col items-center justify-center gap-1 p-2 cursor-pointer'
                          )}
                        >
                          <span className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
                            active
                              ? 'bg-amber-400/30 text-amber-950 dark:text-amber-100'
                              : 'bg-muted/60 text-muted-foreground'
                          )}>
                            <c.icon className="h-3.5 w-3.5" />
                          </span>
                          <span className={cn(
                            'text-xs font-semibold leading-tight text-center',
                            active ? 'text-[#202124] dark:text-amber-100 font-bold' : 'text-muted-foreground'
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
                    className="h-11 rounded-lg border-[#e0e0e0] bg-background px-3 text-base text-foreground shadow-none dark:border-[#5f6368]"
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
                      className="h-11 w-full min-w-0 rounded-lg border border-[#e0e0e0] bg-background px-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#5f6368] cursor-pointer"
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
                      className="h-11 w-full min-w-0 rounded-lg border border-[#e0e0e0] bg-background px-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#5f6368] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
          <div className="space-y-3 sm:space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground mb-1">{t('settings.exportTitle')}</h3>
                  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                    {t('settings.exportDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onExportPlatform}
                  className="h-8.5 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 cursor-pointer"
                >
                  {t('settings.exportAction')}
                </Button>
              </div>

              <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground mb-1">{t('settings.importTitle')}</h3>
                  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                    {t('settings.importDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenImport}
                  className="w-full border-border bg-background/60 text-xs font-bold hover:bg-muted/60 transition-all cursor-pointer rounded-xl h-8.5"
                >
                  {t('settings.importAction')}
                </Button>
              </div>
            </div>
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
          <div className="space-y-3 sm:space-y-3.5">
            {/* Plan Info Card */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-300/60 bg-amber-100/90 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                  <CircleCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {t('settings.support.planTitle')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {t('settings.support.planDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* List of actions */}
            <div className="rounded-xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden divide-y-0 space-y-0.5">
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-card/40">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{t('settings.support.devicesTitle')}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t('settings.support.devicesDescription')}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 ring-1 ring-emerald-500/20 shrink-0">
                  {t('settings.support.connected')}
                </span>
              </div>

              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-card/40">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{t('settings.support.guideTitle')}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {locale === 'ar' ? 'استكشف شرح جميع الميزات' : 'Explorez le guide complet'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => requestExit('guide')}
                  className="text-xs font-medium cursor-pointer border-border rounded-lg h-11 px-3 shrink-0"
                >
                  {t('settings.support.openGuide')}
                </Button>
              </div>

              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-card/40">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{t('settings.support.feedbackTitle')}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {locale === 'ar' ? 'تواصل مع فريق الدعم والتطوير' : 'Contactez le support'}
                  </p>
                </div>
                <a
                  href="mailto:support@cahier-textes.ma"
                  className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
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

  const footer = (
    <div className="space-y-3">
    <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.liveChangesHint')}</p>
    <div className={cn(
      'flex w-full flex-col gap-3 sm:flex-row sm:items-center',
      hasProfileChanges ? 'items-stretch justify-between' : 'items-end justify-end',
    )}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => requestExit()}
        className="min-h-11 rounded-lg border border-border/60 px-4 text-xs font-medium cursor-pointer"
      >
        {t(hasProfileChanges ? 'settings.discardProfile' : 'common.close')}
      </Button>

      {hasProfileChanges && <Button
        type="button"
        onClick={handleSave}
        className="min-h-11 gap-1.5 rounded-lg bg-[#feefc3] text-[#202124] hover:bg-amber-200 dark:bg-[#41331c] dark:text-amber-100 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-500/40 px-4 text-xs font-semibold cursor-pointer"
      >
        <Save className="h-3.5 w-3.5" />
        <span>{t('settings.saveProfile')}</span>
      </Button>}
    </div>
    </div>
  );

  const mainMenuItems = SETTING_ITEMS.filter(i => i.group === 'main');
  const supportMenuItems = SETTING_ITEMS.filter(i => i.group === 'support');
  const isEffectiveCollapsed = isSidebarCollapsed;

  // Master sidebar
  const menuListContent = (
    <div className="space-y-2.5 transition-all duration-300 h-full flex flex-col">
      {/* Sidebar Toggle Button (Desktop Only) */}
      <div className={cn('hidden lg:flex items-center justify-between pb-1', isEffectiveCollapsed ? 'justify-center' : '')}>
        {!isEffectiveCollapsed && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
            {locale === 'ar' ? 'الأقسام' : 'Sections'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border border-border/40"
          title={t(isSidebarCollapsed ? 'settings.expandMenu' : 'settings.collapseMenu')}
        >
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', (isRtl ? isSidebarCollapsed : !isSidebarCollapsed) && 'rotate-180')} />
        </button>
      </div>

      {/* Paramètres principaux */}
      <div className="flex-1 space-y-1">
        {mainMenuItems.map(item => {
          const isActive = activeCategory === item.id;
          const Icon = item.icon;
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
                'group relative flex w-full items-center transition-all duration-150 cursor-pointer rounded-xl focus:outline-none',
                isEffectiveCollapsed ? 'justify-center p-2' : 'justify-between gap-2.5 px-3 py-2 text-start',
                isActive
                  ? 'bg-[#feefc3] text-[#202124] dark:bg-[#41331c] dark:text-amber-100 font-bold border border-amber-300/80 dark:border-amber-500/40 shadow-2xs'
                  : 'bg-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed]'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'text-[#202124] dark:text-amber-200' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                </div>
                <div className={cn('min-w-0 flex-1', isEffectiveCollapsed ? 'hidden lg:hidden' : 'block')}>
                  <span className={cn('block text-xs leading-snug truncate transition-colors', isActive ? 'font-bold' : 'font-medium')}>
                    {t(item.titleKey)}
                  </span>
                </div>
              </div>

              {!isEffectiveCollapsed && (
                <div className="shrink-0 self-center flex items-center justify-center ps-1">
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200',
                      isRtl && 'rotate-180',
                      isActive && 'text-[#202124] dark:text-amber-200'
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Assistance & Archives */}
      <div className="pt-1 space-y-1">
        {supportMenuItems.map(item => {
          const isActive = activeCategory === item.id;
          const Icon = item.icon;
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
                'group relative flex w-full items-center transition-all duration-150 cursor-pointer rounded-xl focus:outline-none',
                isEffectiveCollapsed ? 'justify-center p-2' : 'justify-between gap-2.5 px-3 py-2 text-start',
                isActive
                  ? 'bg-[#feefc3] text-[#202124] dark:bg-[#41331c] dark:text-amber-100 font-bold border border-amber-300/80 dark:border-amber-500/40 shadow-2xs'
                  : 'bg-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#feefc3]/40 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed]'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'text-[#202124] dark:text-amber-200' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                </div>
                <div className={cn('min-w-0 flex-1', isEffectiveCollapsed ? 'hidden lg:hidden' : 'block')}>
                  <span className={cn('block text-xs leading-snug truncate transition-colors', isActive ? 'font-bold' : 'font-medium')}>
                    {t(item.titleKey)}
                  </span>
                </div>
              </div>

              {!isEffectiveCollapsed && (
                <div className="shrink-0 self-center flex items-center justify-center ps-1">
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200',
                      isRtl && 'rotate-180',
                      isActive && 'text-[#202124] dark:text-amber-200'
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => requestExit()}
      title={t('settings.title')}
      maxWidth="5xl"
      swipeFromBody
      mobileDetents={SETTINGS_MOBILE_DETENTS}
      initialMobileDetent={0.92}
      className="settings-modal-sheet overflow-hidden border border-[#e0e0e0] dark:border-[#5f6368] bg-card text-card-foreground sm:max-w-5xl sm:rounded-[12px] shadow-2xl"
      headerClassName="border-b border-[#e0e0e0] dark:border-[#5f6368] bg-muted/20 px-4 py-2.5 sm:px-6 sm:py-3"
      bodyClassName="p-3.5 sm:p-4.5"
    >
      {/* Mobile Horizontal Tabs Selector (Direct access, NO back button) */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 -mx-1 px-1 no-scrollbar">
        {SETTING_ITEMS.map(item => {
          const isActive = activeCategory === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectCategory(item.id)}
              aria-pressed={isActive}
              className={cn(
                'flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2',
                isActive
                  ? 'bg-[#feefc3] text-[#202124] dark:bg-[#41331c] dark:text-amber-100 border border-amber-300 dark:border-amber-500/40 shadow-xs'
                  : 'border border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{t(item.titleKey)}</span>
            </button>
          );
        })}
      </div>

      <div data-settings-ui className="rtl-config-split grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[440px]">
        {/* Desktop Sidebar */}
        <div className={cn('hidden lg:flex flex-col', isEffectiveCollapsed ? 'lg:col-span-1' : 'lg:col-span-4')}>
          {menuListContent}
        </div>

        {/* Content Zone */}
        <div className={cn('settings-content-zone flex flex-col', isEffectiveCollapsed ? 'lg:col-span-11' : 'lg:col-span-8 col-span-1')}>
          <div className="flex-1">
            <section key={activeCategory} aria-label={t(SETTING_ITEMS.find(item => item.id === activeCategory)!.titleKey)} className="settings-page-content">
              {renderCategoryContent()}
            </section>
          </div>

          <div className="mt-4 pt-1">
            {footer}
          </div>
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
      variant="default"
    />
    </>
  );
};

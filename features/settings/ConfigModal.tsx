import React, { useState, useEffect, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { localeMetadata, useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CountryFlag } from '@/components/ui/CountryFlags';
import { ScheduleTab } from './components/ScheduleTab';
import { NotificationsTab } from './components/NotificationsTab';
import { AccountTab } from './components/AccountTab';
import { AppearanceTab } from './components/AppearanceTab';
import { ArchivesSection } from './components/ArchivesSection';
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
  Settings,
  FolderOpen,
  CircleHelp,
  ChevronRight,
  CircleCheck,
  ArrowLeft,
  ArrowRight,
  Save,
  LogOut,
  Palette,
} from '@/components/ui/icons';

const CYCLES: { key: Cycle; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'college', icon: School },
  { key: 'lycee', icon: GraduationCap },
  { key: 'prepa', icon: FlaskConical },
];

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
  /** rendu en PAGE plein écran (au lieu d'une modale) */
  asPage?: boolean;
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
  icon: React.ComponentType<{ className?: string }>;
  group: 'main' | 'support';
}

const SETTING_ITEMS: SettingMenuItem[] = [
  {
    id: 'compte',
    titleKey: 'settings.item.account',
    icon: User,
    group: 'main',
  },
  {
    id: 'profil',
    titleKey: 'settings.item.profile',
    icon: School,
    group: 'main',
  },
  {
    id: 'apparence',
    titleKey: 'settings.item.appearance',
    icon: Palette,
    group: 'main',
  },
  {
    id: 'emploi',
    titleKey: 'settings.item.schedule',
    icon: CalendarRange,
    group: 'main',
  },
  {
    id: 'notifications',
    titleKey: 'settings.item.notifications',
    icon: Bell,
    group: 'main',
  },
  {
    id: 'donnees',
    titleKey: 'settings.item.data',
    icon: Database,
    group: 'main',
  },
  {
    id: 'archives',
    titleKey: 'settings.item.archives',
    icon: FolderOpen,
    group: 'main',
  },
  {
    id: 'assistance',
    titleKey: 'settings.item.support',
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
  asPage = false,
}) => {
  const { locale, isRtl, t } = useLocale();
  const { user } = useAuth();
  const [localConfig, setLocalConfig] = useState(config);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('compte');
  const [mobileSubViewOpen, setMobileSubViewOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [subjectExpanded, setSubjectExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

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

  if (!asPage && !isOpen) return null;

  const selectedAcademy = localConfig.academyRegion ?? '';
  const availableProvinces = getProvincesForAcademy(selectedAcademy);
  const sectionTitleClass = isRtl ? 'font-bold tracking-normal text-xl leading-tight' : 'font-bold tracking-tight';

  // Matières enseignées (multi-sélection) : filtrent le choix de matière à la
  // création d'une classe et pilotent le domaine des types de contenu.
  const selectedSubjects = localConfig.selectedSubjects ?? [];
  const toggleSubject = (subject: string) => {
    setLocalConfig(prev => {
      const current = prev.selectedSubjects ?? [];
      const next = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      return { ...prev, selectedSubjects: next, showAllSubjects: false };
    });
  };

  const languageSection = (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-4 sm:p-5 shadow-xs backdrop-blur-xl">
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
                  ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 to-violet-600/15 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 font-bold scale-[1.02] shadow-[0_4px_16px_rgba(99,102,241,0.18)]'
                  : 'border-white/[0.08] dark:border-white/[0.06] bg-background/60 text-muted-foreground hover:border-indigo-500/30 hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <div className="flex h-9 items-center justify-center">
                <CountryFlag code={option.value as 'fr' | 'ar' | 'en'} className="w-8 h-5.5 rounded-xs shadow-xs" />
              </div>
              <span className={cn('text-sm font-bold leading-tight', option.value === 'ar' && 'font-bold tracking-normal')}>
                {option.shortName}
              </span>
              <span className={cn('text-[11px] font-medium text-muted-foreground', active && 'text-indigo-600 dark:text-indigo-400 font-semibold')}>
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
          <div className="space-y-6">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <User className="h-5 w-5 text-primary" />
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
          <div className="space-y-6">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <School className="h-5 w-5 text-primary" />
                {t('settings.section.profileTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.profileDescription')}
              </p>
            </div>

            {/* 1. Profil & Matière */}
            <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-4 sm:p-5 shadow-xs backdrop-blur-xl">
              <header className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                  <User className="h-5 w-5 stroke-[2.2]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{t('settings.group.profile')}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.subjectsHint')}</p>
                </div>
              </header>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground/80">
                      {t('settings.teacherName')}
                    </label>
                    <Input
                      type="text"
                      value={localConfig.defaultTeacherName || ''}
                      onChange={e => setLocalConfig(prev => ({ ...prev, defaultTeacherName: e.target.value }))}
                      placeholder={t('settings.teacherPlaceholder')}
                      className="h-10 rounded-xl border-white/[0.12] dark:border-white/[0.08] bg-background/70 px-3.5 text-base font-itim font-bold text-[#0056D2] dark:text-[#38bdf8] shadow-none placeholder:font-sans placeholder:font-normal placeholder:text-sm focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground/80">
                      {t('settings.phone')}
                    </label>
                    <Input
                      type="tel"
                      value={user?.phone ?? ''}
                      disabled
                      readOnly
                      placeholder="—"
                      className="h-10 rounded-xl border-white/[0.08] bg-muted/40 px-3.5 text-sm shadow-none text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-foreground/80">
                    {t('settings.subjects')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.slice(0, subjectExpanded ? SUBJECTS.length : 6).map(subject => {
                      const active = selectedSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleSubject(subject)}
                          className={cn(
                            'rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs',
                            active
                              ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/30 shadow-[0_2px_8px_rgba(99,102,241,0.18)] scale-[1.02]'
                              : 'border-white/[0.08] dark:border-white/[0.06] bg-background/60 text-muted-foreground hover:border-indigo-500/30 hover:bg-muted/50 hover:text-foreground'
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
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {subjectExpanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Cycle & Établissement */}
            <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-4 sm:p-5 shadow-xs backdrop-blur-xl">
              <header className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                  <School className="h-5 w-5 stroke-[2.2]" />
                </span>
                <h3 className="text-sm font-bold text-foreground">{t('settings.group.school')}</h3>
              </header>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground/80">
                    {t('settings.cycle')}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {CYCLES.map(c => {
                      const active = (localConfig.selectedCycles?.[0] ?? 'college') === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, selectedCycles: [c.key], showAllCycles: false }))}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all duration-200 outline-none cursor-pointer',
                            active
                              ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 to-violet-600/15 shadow-[0_4px_16px_rgba(99,102,241,0.18)] ring-1 ring-inset ring-indigo-500/30 scale-[1.02]'
                              : 'border-white/[0.08] dark:border-white/[0.06] bg-background/60 hover:border-indigo-500/30 hover:bg-muted/40'
                          )}
                        >
                          <span className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-105',
                            active
                              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]'
                              : 'bg-muted/60 text-muted-foreground'
                          )}>
                            <c.icon className="h-5 w-5" />
                          </span>
                          <span className={cn(
                            'text-xs font-bold leading-tight text-center',
                            active ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'
                          )}>
                            {t(`settings.cycle.${c.key}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground/80">
                    {t('settings.establishment')}
                  </label>
                  <Input
                    type="text"
                    value={localConfig.establishmentName || ''}
                    onChange={e => setLocalConfig(prev => ({ ...prev, establishmentName: e.target.value }))}
                    placeholder={t('settings.establishmentPlaceholder')}
                    className="h-10 rounded-xl border-white/[0.12] dark:border-white/[0.08] bg-background/70 px-3.5 text-sm shadow-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="academy-region" className="block text-xs font-bold text-foreground/80">
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
                      className="h-10 w-full rounded-xl border border-white/[0.12] dark:border-white/[0.08] bg-background/70 px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">{t('settings.chooseAcademy')}</option>
                      {MOROCCO_EDUCATION_ACADEMIES.map(academy => (
                        <option key={academy.id} value={academy.id}>
                          {locale === 'ar' ? academy.arabicLabel : academy.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="education-province" className="block text-xs font-bold text-foreground/80">
                      {t('settings.province')}
                    </label>
                    <select
                      id="education-province"
                      value={localConfig.educationProvince ?? ''}
                      disabled={!selectedAcademy}
                      onChange={event => setLocalConfig(prev => ({ ...prev, educationProvince: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-white/[0.12] dark:border-white/[0.08] bg-background/70 px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
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
          <div className="space-y-6">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <Palette className="h-5 w-5 text-primary" />
                {t('settings.section.appearanceTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.appearanceDescription')}
              </p>
            </div>
            <AppearanceTab
              config={localConfig}
              onConfigChange={(newCfg) => {
                setLocalConfig(prev => ({ ...prev, ...newCfg }));
                // Live preview for appearance changes
                applyLive(newCfg);
              }}
            />
          </div>
        );

      case 'emploi':
        return (
          <div className="space-y-5">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <CalendarRange className="h-5 w-5 text-primary" />
                {t('settings.section.scheduleTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.scheduleDescription')}
              </p>
            </div>
            <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} onCreateClass={onCreateClass} />
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-5">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <Bell className="h-5 w-5 text-primary" />
                {t('settings.section.notificationsTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.notificationsDescription')}
              </p>
            </div>
            <NotificationsTab config={localConfig} onChange={applyLive} />
          </div>
        );

      case 'donnees':
        return (
          <div className="space-y-5">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <Database className="h-5 w-5 text-primary" />
                {t('settings.section.dataTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.dataDescription')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-5 shadow-xs backdrop-blur-xl">
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{t('settings.exportTitle')}</h4>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.exportDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onExportPlatform}
                  className="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white font-bold hover:from-indigo-600 hover:to-violet-700 shadow-[0_4px_14px_rgba(99,102,241,0.3)] transition-all cursor-pointer rounded-xl h-10"
                >
                  {t('settings.exportAction')}
                </Button>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 p-5 shadow-xs backdrop-blur-xl">
                <div>
                  <h4 className="text-sm font-bold text-foreground font-bold tracking-tight mb-1">{t('settings.importTitle')}</h4>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.importDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!asPage) onClose();
                    onOpenImport();
                  }}
                  className="w-full border-white/[0.12] dark:border-white/[0.08] bg-background/60 font-bold hover:bg-muted/60 transition-all cursor-pointer rounded-xl h-10"
                >
                  {t('settings.importAction')}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'archives':
        return (
          <div className="space-y-5">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <FolderOpen className="h-5 w-5 text-indigo-500" />
                {t('settings.section.archivesTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.archivesDescription')}
              </p>
            </div>
            <ArchivesSection schoolYearStart={config.schoolYearStart} />
          </div>
        );

      case 'assistance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className={cn('text-lg font-bold text-foreground flex items-center gap-2', sectionTitleClass)}>
                <CircleHelp className="h-5 w-5 text-indigo-500" />
                {t('settings.section.supportTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.supportDescription')}
              </p>
            </div>

            {/* Premium Card */}
            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 p-5 backdrop-blur-xl shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.35)] shrink-0">
                    <CircleCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
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
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-white/[0.12] dark:border-white/[0.08] bg-card/85 backdrop-blur-xl">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{t('settings.support.devicesTitle')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
                  className="text-xs font-bold cursor-pointer border-white/[0.12] dark:border-white/[0.08] rounded-xl"
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
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
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
            className="h-10 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 transition-all cursor-pointer shadow-xs gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('account.signOut')}
          </Button>
        ) : !asPage ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-xs font-bold cursor-pointer rounded-xl h-10 border border-white/[0.08]"
          >
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleSave}
          className="h-10 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold px-6 rounded-xl cursor-pointer shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_22px_rgba(99,102,241,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
        >
          <Save className="h-4 w-4" />
          {t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );

  const mainMenuItems = SETTING_ITEMS.filter(i => i.group === 'main');
  const supportMenuItems = SETTING_ITEMS.filter(i => i.group === 'support');

  const isEffectiveCollapsed = isSidebarCollapsed;

  // Master sidebar / list view
  const menuListContent = (
    <div className="space-y-4 transition-all duration-300 py-2 h-full flex flex-col">
      {/* Sidebar Toggle Button (Desktop Only) */}
      <div className={cn("hidden md:flex mb-1", isEffectiveCollapsed ? "justify-center" : "justify-end pr-1")}>
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border border-white/[0.12] dark:border-white/[0.08]"
          title={t(isSidebarCollapsed ? 'settings.expandMenu' : 'settings.collapseMenu')}
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", (isRtl ? isSidebarCollapsed : !isSidebarCollapsed) && "rotate-180")} />
        </button>
      </div>

      {/* Paramètres principaux */}
      <div className="flex-1">
        <div className="space-y-1.5">
          {mainMenuItems.map(item => {
            const isActive = activeCategory === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveCategory(item.id);
                  setMobileSubViewOpen(true);
                }}
                title={t(item.titleKey)}
                className={cn(
                  'w-full flex items-center transition-all duration-200 cursor-pointer group rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
                  isEffectiveCollapsed
                    ? 'justify-center p-2'
                    : 'justify-start gap-3 px-3.5 py-2.5 text-start',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_12px_rgba(99,102,241,0.12)] border border-indigo-500/30'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)] scale-105'
                      : 'bg-muted/60 text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 group-hover:scale-105'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                {!isEffectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className={cn('block text-sm truncate transition-colors duration-200', isActive ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground group-hover:text-foreground')}>
                      {t(item.titleKey)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Paiements et assistance */}
      <div className="pt-4 border-t border-border/40">
        <div className="space-y-1.5">
          {supportMenuItems.map(item => {
            const isActive = activeCategory === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveCategory(item.id);
                  setMobileSubViewOpen(true);
                }}
                title={t(item.titleKey)}
                className={cn(
                  'w-full flex items-center transition-all duration-200 cursor-pointer group rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
                  isEffectiveCollapsed
                    ? 'justify-center p-2'
                    : 'justify-start gap-3 px-3.5 py-2.5 text-start',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_12px_rgba(99,102,241,0.12)] border border-indigo-500/30'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)] scale-105'
                      : 'bg-muted/60 text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 group-hover:scale-105'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                {!isEffectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className={cn('block text-sm truncate transition-colors duration-200', isActive ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground group-hover:text-foreground')}>
                      {t(item.titleKey)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Vue Plein Écran (`asPage`)
  if (asPage) {
    const BackIcon = isRtl ? ArrowRight : ArrowLeft;
    return (
      <div className="rtl-flow relative min-h-screen pb-[env(safe-area-inset-bottom,1rem)] bg-background/60">
        {/* Ambient Colorful Glows */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/15 blur-3xl opacity-40" />
          <div className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full bg-gradient-to-bl from-violet-600/20 via-fuchsia-500/15 to-indigo-600/15 blur-3xl opacity-35" />
          <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/15 to-indigo-600/15 blur-3xl opacity-35" />
        </div>

        <main className="relative mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 pb-8">
          <div className="mb-4 flex items-center justify-between px-1 text-foreground sm:mb-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                <Settings className="h-5 w-5 stroke-[2]" />
              </span>
              <h1 className={cn('font-bold tracking-tight text-foreground', isRtl ? 'font-bold tracking-normal text-xl leading-none' : 'text-lg sm:text-xl')}>
                {t('settings.title')}
              </h1>
            </div>
          </div>

          {/* Grille responsive 2 colonnes avec réducteur automatique */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* Sidebar gauche : Menu des rubriques */}
            <div
              className={cn(
                'bg-card/85 border border-white/[0.12] dark:border-white/[0.08] rounded-3xl p-3 shadow-xs backdrop-blur-xl transition-all duration-300',
                isEffectiveCollapsed
                  ? 'md:col-span-1 lg:col-span-1 xl:col-span-1'
                  : 'md:col-span-4 lg:col-span-3.5 xl:col-span-3',
                mobileSubViewOpen ? 'hidden md:block' : 'block'
              )}
            >
              {menuListContent}
            </div>

            {/* Panneau droit : Contenu de la rubrique sélectionnée */}
            <div
              className={cn(
                'flex flex-col bg-card/90 border border-white/[0.12] dark:border-white/[0.08] rounded-3xl p-4 sm:p-6 shadow-xs backdrop-blur-xl min-h-[520px] transition-all duration-300 text-card-foreground',
                isEffectiveCollapsed
                  ? 'md:col-span-11 lg:col-span-11 xl:col-span-11'
                  : 'md:col-span-8 lg:col-span-8.5 xl:col-span-9',
                !mobileSubViewOpen ? 'hidden md:block' : 'block'
              )}
            >
              {/* Mobile Back to Menu */}
              <div className="mb-4 pb-3 border-b border-border/50 md:hidden flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSubViewOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] dark:border-white/[0.08] bg-background/80 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer shadow-xs"
                >
                  <BackIcon className="h-3.5 w-3.5" />
                  {t('settings.title')}
                </button>
              </div>

              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                  >
                    {renderCategoryContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Actions au bas de la zone de contenu */}
              <div className="mt-8 pt-4 border-t border-border/50">
                {footer}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Rendu sous forme de MODALE
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
            <Settings className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-base sm:text-lg font-bold text-foreground">
            {t('settings.title')}
          </span>
        </div>
      }
      description={t('settings.description')}
      maxWidth="5xl"
      className="relative overflow-hidden sm:max-w-5xl sm:rounded-[32px] border border-white/[0.12] dark:border-white/[0.08] bg-card/95 backdrop-blur-2xl"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
    >
      <div className="rtl-config-split grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[480px]">
        <div
          className={cn(
            'md:col-span-5 lg:col-span-4',
            isRtl ? 'border-l border-border/70 pl-0 md:pl-4' : 'border-r border-border/70 pr-0 md:pr-4',
            mobileSubViewOpen ? 'hidden md:block' : 'block'
          )}
        >
          {menuListContent}
        </div>

        <div
          className={cn(
            'md:col-span-7 lg:col-span-8 flex flex-col',
            isRtl ? 'pr-0 md:pr-2' : 'pl-0 md:pl-2',
            !mobileSubViewOpen ? 'hidden md:block' : 'block'
          )}
        >
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {renderCategoryContent()}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="mt-8 pt-4 border-t border-border/60">
            {footer}
          </div>
        </div>
      </div>
    </Modal>
  );
};

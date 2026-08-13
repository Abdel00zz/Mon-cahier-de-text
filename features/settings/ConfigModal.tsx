import React, { useState, useEffect, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { localeMetadata, useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScheduleTab } from './components/ScheduleTab';
import { NotificationsTab } from './components/NotificationsTab';
import { AccountTab } from './components/AccountTab';
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
    <section className="rounded-xl border border-border/75 bg-secondary/45 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div className="mb-3 min-w-0 sm:mb-0">
        <h3 className="text-sm font-extrabold text-foreground">{t('language.settings.title')}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('language.settings.description')}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:w-[320px] sm:shrink-0">
        {localeMetadata.map(option => {
          const active = (localConfig.applicationLocale ?? 'fr') === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocalConfig(prev => ({ ...prev, applicationLocale: option.value as AppLocale }))}
              aria-pressed={active}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all cursor-pointer',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 font-bold'
                  : 'border-border/80 bg-card/90 text-muted-foreground hover:border-primary/25 hover:bg-accent/70 hover:text-foreground'
              )}
            >
              <span className={cn('text-sm font-extrabold leading-none', option.value === 'ar' && 'font-bold tracking-normal')}>
                {option.shortName}
              </span>
              <span className={cn('text-[10px] font-semibold', option.value === 'ar' && 'tracking-normal')}>
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
            <section className="rounded-2xl border border-border/70 bg-card/55 p-4 sm:p-5">
              <header className="flex items-center gap-2.5 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <User className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{t('settings.group.profile')}</h3>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{t('settings.subjectsHint')}</p>
                </div>
              </header>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('settings.teacherName')}
                    </label>
                    <Input
                      type="text"
                      value={localConfig.defaultTeacherName || ''}
                      onChange={e => setLocalConfig(prev => ({ ...prev, defaultTeacherName: e.target.value }))}
                      placeholder={t('settings.teacherPlaceholder')}
                      className="h-10 rounded-xl border-border/80 bg-card/85 px-3.5 text-sm shadow-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('settings.phone')}
                    </label>
                    <Input
                      type="tel"
                      value={user?.phone ?? ''}
                      disabled
                      readOnly
                      placeholder="—"
                      className="h-10 rounded-xl border-border/80 bg-muted/50 px-3.5 text-sm shadow-none text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                            active
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-border bg-card text-muted-foreground hover:border-blue-300 hover:text-foreground'
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
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        {subjectExpanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Cycle & Établissement */}
            <section className="rounded-2xl border border-border/70 bg-card/55 p-4 sm:p-5">
              <header className="flex items-center gap-2.5 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <School className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-sm font-bold text-foreground">{t('settings.group.school')}</h3>
              </header>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t('settings.cycle')}
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {CYCLES.map(c => {
                      const active = (localConfig.selectedCycles?.[0] ?? 'college') === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, selectedCycles: [c.key], showAllCycles: false }))}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3.5 transition-all duration-200 outline-none cursor-pointer',
                            active
                              ? 'border-blue-500 bg-blue-50/70'
                              : 'border-border bg-card hover:border-blue-200 hover:bg-blue-50/40'
                          )}
                        >
                          <span className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                            active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                          )}>
                            <c.icon className="h-5 w-5" />
                          </span>
                          <span className={cn(
                            'text-[11px] font-semibold leading-tight text-center',
                            active ? 'text-blue-700' : 'text-muted-foreground'
                          )}>
                            {t(`settings.cycle.${c.key}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t('settings.establishment')}
                  </label>
                  <Input
                    type="text"
                    value={localConfig.establishmentName || ''}
                    onChange={e => setLocalConfig(prev => ({ ...prev, establishmentName: e.target.value }))}
                    placeholder={t('settings.establishmentPlaceholder')}
                    className="h-10 rounded-xl border-border/80 bg-card/85 px-3.5 text-sm shadow-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="academy-region" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                      className="h-10 w-full rounded-xl border border-border/80 bg-card/85 px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
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
                    <label htmlFor="education-province" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('settings.province')}
                    </label>
                    <select
                      id="education-province"
                      value={localConfig.educationProvince ?? ''}
                      disabled={!selectedAcademy}
                      onChange={event => setLocalConfig(prev => ({ ...prev, educationProvince: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-border/80 bg-card/85 px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
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
              <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/82 p-5 shadow-2xs">
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{t('settings.exportTitle')}</h4>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.exportDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onExportPlatform}
                  className="w-full border-primary/30 text-primary font-bold hover:bg-primary hover:text-white transition-all cursor-pointer"
                >
                  {t('settings.exportAction')}
                </Button>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/82 p-5 shadow-2xs">
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
                  className="w-full border-border/80 font-bold hover:bg-accent/65 transition-all cursor-pointer"
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
                <FolderOpen className="h-5 w-5 text-primary" />
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
                <CircleHelp className="h-5 w-5 text-primary" />
                {t('settings.section.supportTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.section.supportDescription')}
              </p>
            </div>

            {/* Premium Card */}
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.055] to-cyan-50/55 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shrink-0">
                    <CircleCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-primary">
                      {t('settings.support.planTitle')}
                    </h3>
                    <p className="text-xs text-primary/80">
                      {t('settings.support.planDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of actions inspired by user screenshot */}
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card/86">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{t('settings.support.devicesTitle')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.support.devicesDescription')}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1">
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
                  className="text-xs font-bold cursor-pointer"
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
                  className="text-xs font-bold text-primary hover:underline"
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
    <div className="flex w-full justify-end gap-2">
      {!asPage && (
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="flex-1 text-xs font-bold sm:flex-initial cursor-pointer"
        >
          {t('common.cancel')}
        </Button>
      )}
      <Button
        type="button"
        onClick={handleSave}
        className="flex-1 bg-primary text-xs font-bold text-white hover:bg-primary/90 sm:flex-initial cursor-pointer"
      >
        {t('settings.saveChanges')}
      </Button>
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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border border-border/50"
          title={t(isSidebarCollapsed ? 'settings.expandMenu' : 'settings.collapseMenu')}
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", (isRtl ? isSidebarCollapsed : !isSidebarCollapsed) && "rotate-180")} />
        </button>
      </div>

      {/* Paramètres principaux */}
      <div className="flex-1">
        <div className="space-y-1">
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
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl focus:outline-none focus-visible:text-primary',
                  isEffectiveCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-start gap-2.5 px-3 py-2 text-start',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'text-primary scale-105'
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2.5]" />
                </div>
                {!isEffectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className={cn('block text-sm truncate transition-colors duration-200', isActive ? 'font-bold text-primary' : 'font-medium group-hover:text-foreground')}>
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
      <div className="pt-5">
        <div className="space-y-0.5">
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
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl focus:outline-none focus-visible:text-primary',
                  isEffectiveCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-start gap-2.5 px-3 py-2 text-start',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'text-primary scale-105'
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2.5]" />
                </div>
                {!isEffectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className={cn('block text-sm truncate transition-colors duration-200', isActive ? 'font-bold text-primary' : 'font-medium group-hover:text-foreground')}>
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
    return (
      <div className="rtl-flow min-h-screen pb-[env(safe-area-inset-bottom,1rem)]">
        <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-6 pb-8">
          <div className="mb-4 flex items-center gap-2 px-1 text-foreground sm:mb-5">
            <Settings className="h-4.5 w-4.5 text-primary" />
            <h1 className={cn('font-extrabold tracking-tight', isRtl ? 'font-bold tracking-normal text-2xl leading-none' : 'text-lg')}>
              {t('settings.title')}
            </h1>
          </div>

          {/* Grille responsive 2 colonnes avec réducteur automatique */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* Sidebar gauche : Menu des rubriques */}
            <div
              className={cn(
                'bg-card/88 border border-border/75 rounded-2xl p-3 shadow-[0_12px_32px_rgba(30,64,110,0.055)] backdrop-blur-sm transition-all duration-300',
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
                'flex flex-col bg-card/92 border border-border/75 rounded-2xl p-4 sm:p-5 shadow-[0_12px_32px_rgba(30,64,110,0.055)] backdrop-blur-sm min-h-[500px] transition-all duration-300 text-card-foreground',
                isEffectiveCollapsed
                  ? 'md:col-span-11 lg:col-span-11 xl:col-span-11'
                  : 'md:col-span-8 lg:col-span-8.5 xl:col-span-9',
                !mobileSubViewOpen ? 'hidden md:block' : 'block'
              )}
            >
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
              
              {/* Actions au bas de la zone de contenu (au lieu de la barre fixée) */}
              <div className="mt-8">
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
        <span className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          {t('settings.title')}
        </span>
      }
      description={t('settings.description')}
      maxWidth="4xl"
    >
      <div className="rtl-config-split grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[460px]">
        <div
          className={cn(
            'md:col-span-5',
            isRtl ? 'border-l border-border/70 pl-0 md:pl-4' : 'border-r border-border/70 pr-0 md:pr-4',
            mobileSubViewOpen ? 'hidden md:block' : 'block'
          )}
        >
          {menuListContent}
        </div>

        <div
          className={cn(
            'md:col-span-7 flex flex-col',
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
          
          <div className="mt-8">
            {footer}
          </div>
        </div>
      </div>
    </Modal>
  );
};

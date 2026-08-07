import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { localeMetadata, useLocale } from '@/i18n/LocaleProvider';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScheduleTab } from './components/ScheduleTab';
import { NotificationsTab } from './components/NotificationsTab';
import { AccountTab } from './components/AccountTab';
import { ArchivesSection } from './components/ArchivesSection';
import { getProvincesForAcademy, MOROCCO_EDUCATION_ACADEMIES } from '@/utils/moroccoEducation';
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
  ArrowLeft,
  Info,
  CircleCheck,
  FileText,
  Printer,
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

export type SettingsCategory =
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
  defaultTitle: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'main' | 'support';
}

const SETTING_ITEMS: SettingMenuItem[] = [
  {
    id: 'compte',
    titleKey: 'settings.item.account',
    defaultTitle: 'Compte & Cloud Sync',
    subtitle: 'Profil enseignant, langue de l\'application et synchronisation cloud',
    icon: User,
    group: 'main',
  },
  {
    id: 'profil',
    titleKey: 'settings.item.profile',
    defaultTitle: 'Profil & Établissement',
    subtitle: 'Nom de l\'établissement, académie, province et cycle d\'enseignement',
    icon: School,
    group: 'main',
  },
  {
    id: 'emploi',
    titleKey: 'settings.item.schedule',
    defaultTitle: 'Emploi du temps',
    subtitle: 'Jours travaillés, horaires des séances et matières enseignées',
    icon: CalendarRange,
    group: 'main',
  },
  {
    id: 'notifications',
    titleKey: 'settings.item.notifications',
    defaultTitle: 'Notifications & Alertes',
    subtitle: 'Rappels de devoirs, contrôles continu et inspections',
    icon: Bell,
    group: 'main',
  },
  {
    id: 'donnees',
    titleKey: 'settings.item.data',
    defaultTitle: 'Sauvegarde & Données',
    subtitle: 'Exporter les fichiers, importer des cahiers ou réinitialiser',
    icon: Database,
    group: 'main',
  },
  {
    id: 'archives',
    titleKey: 'settings.item.archives',
    defaultTitle: 'Archives scolaires',
    subtitle: 'Consulter et gérer les cahiers de textes des années précédentes',
    icon: FolderOpen,
    group: 'main',
  },
  {
    id: 'assistance',
    titleKey: 'settings.item.support',
    defaultTitle: 'Support & Web App',
    subtitle: 'Guide interactif, état du compte, accès multi-appareils',
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
  const { isRtl, t } = useLocale();
  const [localConfig, setLocalConfig] = useState(config);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('compte');
  const [mobileSubViewOpen, setMobileSubViewOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const languageSection = (
    <section className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div className="mb-3 min-w-0 sm:mb-0">
        <h3 className="text-sm font-extrabold text-foreground font-display">{t('language.settings.title')}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('language.settings.description')}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:w-[320px] sm:shrink-0">
        {localeMetadata.map(option => {
          const active = (localConfig.applicationLocale ?? 'fr') === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => applyLive({ applicationLocale: option.value as AppLocale })}
              aria-pressed={active}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all cursor-pointer',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 font-bold'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              <span className={cn('text-sm font-extrabold leading-none', option.value === 'ar' && 'font-ar')}>
                {option.shortName}
              </span>
              <span className={cn('text-[10px] font-semibold', option.value === 'ar' && 'font-ar')}>
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
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Compte & Synchronisation
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gérez vos informations de compte, votre langue et l'état de synchronisation cloud.
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
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                Profil & Établissement
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configurez les détails officiels de votre établissement pour l'en-tête de vos fiches et impressions.
              </p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('settings.establishment')}
                </label>
                <Input
                  type="text"
                  value={localConfig.establishmentName || ''}
                  onChange={e => setLocalConfig(prev => ({ ...prev, establishmentName: e.target.value }))}
                  placeholder={t('settings.establishmentPlaceholder')}
                  className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 text-sm shadow-none"
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
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="">{t('settings.chooseAcademy')}</option>
                    {MOROCCO_EDUCATION_ACADEMIES.map(academy => (
                      <option key={academy.id} value={academy.id}>
                        {academy.label}
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
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:opacity-60"
                  >
                    <option value="">
                      {selectedAcademy ? t('settings.chooseProvince') : t('settings.chooseAcademyFirst')}
                    </option>
                    {availableProvinces.map(province => (
                      <option key={province.id} value={province.id}>
                        {province.label}
                        {province.kind === 'prefecture' ? ' · préfecture' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('settings.teacherName')}
                </label>
                <Input
                  type="text"
                  value={localConfig.defaultTeacherName || ''}
                  onChange={e => setLocalConfig(prev => ({ ...prev, defaultTeacherName: e.target.value }))}
                  placeholder={t('settings.teacherPlaceholder')}
                  className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 text-sm shadow-none"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('settings.cycle')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {CYCLES.map(c => {
                    const active = (localConfig.selectedCycles?.[0] ?? 'college') === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setLocalConfig(prev => ({ ...prev, selectedCycles: [c.key], showAllCycles: false }))}
                        className={cn(
                          'flex min-h-[60px] flex-col items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer',
                          active
                            ? 'border-primary/40 bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        )}
                      >
                        <c.icon className="h-4 w-4" />
                        {t(`settings.cycle.${c.key}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 'emploi':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Emploi du temps & Plages
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Définissez la structure de votre emploi du temps hebdomadaire et vos créneaux.
              </p>
            </div>
            <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} onCreateClass={onCreateClass} />
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications & Alertes
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recevez des rappels pour vos évaluations, contrôles et échéances importantes.
              </p>
            </div>
            <NotificationsTab config={localConfig} onChange={applyLive} />
          </div>
        );

      case 'donnees':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Sauvegarde & Restauration
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conservez vos données en sécurité ou transférez vos séances vers un autre appareil.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
                <div>
                  <h4 className="text-sm font-bold text-foreground font-display mb-1">{t('settings.exportTitle')}</h4>
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

              <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
                <div>
                  <h4 className="text-sm font-bold text-foreground font-display mb-1">{t('settings.importTitle')}</h4>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.importDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenImport();
                  }}
                  className="w-full border-zinc-300 dark:border-zinc-700 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
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
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Archives des Années Scolaires
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consultez et rouvrez les cahiers de textes archivés des années scolaires précédentes.
              </p>
            </div>
            <ArchivesSection />
          </div>
        );

      case 'assistance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
                <CircleHelp className="h-5 w-5 text-primary" />
                Paiements & Assistance
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Informations d'abonnement, accès Web App et assistance aux enseignants.
              </p>
            </div>

            {/* Premium Card */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
                    <CircleCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-blue-950 dark:text-blue-200 font-display">
                      Version Éducation Enseignant Pro
                    </h3>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                      Toutes les fonctionnalités sont actives (Cahier interactif, export PDF, sync offline).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of actions inspired by user screenshot */}
            <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Web App & Multi-supports</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Accédez à vos données Cloud Sync depuis votre Mac, votre PC ou votre tablette iOS/Android.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1">
                  Connecté
                </span>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Guide d'utilisation interactif</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consultez les astuces de saisie rapide, le calcul de progression et les raccourcis.
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
                  Ouvrir le guide
                </Button>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Remarques & Assistance</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Une idée d'amélioration ou un conseil pour la gestion des séances ?
                  </p>
                </div>
                <a
                  href="mailto:support@cahier-textes.ma"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Contactez-nous
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
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="flex-1 text-xs font-bold sm:flex-initial cursor-pointer"
      >
        {asPage ? t('settings.back') : t('common.cancel')}
      </Button>
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
          className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border border-border/50"
          title={isSidebarCollapsed ? "Déplier le menu" : "Réduire le menu"}
        >
          <ChevronRight className={cn("h-2.5 w-2.5 transition-transform duration-200", !isSidebarCollapsed && "rotate-180")} />
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
                title={item.defaultTitle}
                className={cn(
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl',
                  isEffectiveCollapsed
                    ? 'justify-center p-2.5'
                    : 'gap-3 px-3 py-2 text-left',
                  isActive
                    ? 'bg-muted/60 text-foreground font-semibold shadow-xs'
                    : 'hover:bg-muted/40 text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2.5]" />
                </div>
                {!isEffectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className={cn('block text-sm truncate transition-colors duration-200', isActive ? 'font-bold text-foreground' : 'font-medium group-hover:text-foreground')}>
                      {item.defaultTitle}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Paiements et assistance */}
      <div className="pt-2">
        <div className="h-px w-full bg-border/50 mb-3" />
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
                title={item.defaultTitle}
                className={cn(
                  'w-full flex items-center transition-all cursor-pointer group rounded-xl',
                  isEffectiveCollapsed
                    ? 'justify-center p-2.5'
                    : 'gap-3 px-3 py-2 text-left',
                  isActive
                    ? 'bg-muted/60 text-foreground font-semibold shadow-xs'
                    : 'hover:bg-muted/40 text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105'
                  )}
                >
                  <Icon className="h-4 w-4 stroke-[2.5]" />
                </div>
                {!isEffectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className={cn('block text-sm truncate transition-colors duration-200', isActive ? 'font-bold text-foreground' : 'font-medium group-hover:text-foreground')}>
                      {item.defaultTitle}
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
      <div className="rtl-flow min-h-screen bg-zinc-50/70 dark:bg-zinc-950 safe-bottom">
        <header className="sticky top-0 z-20 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">
                {t('settings.title')}
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-5 pb-8">
          {/* Grille responsive 2 colonnes avec réducteur automatique */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* Sidebar gauche : Menu des rubriques */}
            <div
              className={cn(
                'bg-card border border-border rounded-3xl p-3 shadow-xs transition-all duration-300',
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
                'flex flex-col bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-xs min-h-[500px] transition-all duration-300 text-card-foreground',
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
              <div className="mt-8 pt-5 border-t border-border">
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[460px]">
        <div
          className={cn(
            'md:col-span-5 border-r border-zinc-200/80 dark:border-zinc-800 pr-0 md:pr-4',
            mobileSubViewOpen ? 'hidden md:block' : 'block'
          )}
        >
          {menuListContent}
        </div>

        <div
          className={cn(
            'md:col-span-7 pl-0 md:pl-2 flex flex-col',
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
          
          <div className="mt-8 pt-5 border-t border-border">
            {footer}
          </div>
        </div>
      </div>
    </Modal>
  );
};

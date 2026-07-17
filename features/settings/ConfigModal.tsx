import React, { useState, useEffect, FC } from 'react';
import { AppConfig, AppLocale, ClassInfo, Cycle } from '@/types';
import { localeMetadata, useLocale } from '@/i18n/LocaleProvider';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type ConfigTab = 'profil' | 'emploi' | 'notifications' | 'donnees' | 'compte';

const TABS: { id: ConfigTab; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profil', icon: GraduationCap },
  { id: 'emploi', icon: CalendarRange },
  { id: 'notifications', icon: Bell },
  { id: 'donnees', icon: Database },
  { id: 'compte', icon: User },
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
  const [activeTab, setActiveTab] = useState<ConfigTab>('profil');
  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  // Ouverture ciblée sur un onglet (ex. « Emploi du temps » depuis la bannière
  // de l'éditeur) : signal transitoire posé par l'appelant, consommé une fois.
  useEffect(() => {
    try {
      const requested = sessionStorage.getItem('config_initial_tab_v1');
      if (requested) {
        sessionStorage.removeItem('config_initial_tab_v1');
        const valid: ConfigTab[] = ['profil', 'emploi', 'notifications', 'donnees', 'compte'];
        if (valid.includes(requested as ConfigTab)) setActiveTab(requested as ConfigTab);
      }
    } catch {
      // sessionStorage indisponible : reste sur l'onglet par défaut
    }
  }, []);

  // L'emploi du temps, les notifications et le compte s'appliquent immédiatement.
  const applyLive = (patch: Partial<AppConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...patch }));
    onConfigChange(patch);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  if (!asPage && !isOpen) return null;

  const tabCopy = (id: ConfigTab) => {
    const key = id === 'profil' ? 'profile' : id === 'emploi' ? 'schedule' : id === 'donnees' ? 'data' : id === 'compte' ? 'account' : id;
    return {
      label: t(`settings.tab.${key}`),
      description: t(`settings.tab.${key}Description`),
    };
  };

  const footer = (
    <div className="flex w-full justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="flex-1 text-xs font-bold sm:flex-initial"
      >
        {asPage ? t('settings.back') : t('common.cancel')}
      </Button>
      <Button
        type="button"
        onClick={handleSave}
        className="flex-1 bg-primary text-xs font-bold text-white hover:bg-primary/90 sm:flex-initial"
      >
        {t('settings.saveChanges')}
      </Button>
    </div>
  );

  const activeTabDetails = TABS.find(tab => tab.id === activeTab);
  const selectedAcademy = localConfig.academyRegion ?? '';
  const availableProvinces = getProvincesForAcademy(selectedAcademy);

  const tabContent = (
    <div className="space-y-4">
      {/* Tab Header for Context */}
      <div className="border-b border-border/40 pb-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
          {activeTabDetails && <activeTabDetails.icon className="h-5 w-5 text-primary" />}
          {activeTabDetails ? tabCopy(activeTabDetails.id).label : ''}
        </h2>
        <p className="text-xs text-muted-foreground font-sans mt-1">{activeTabDetails ? tabCopy(activeTabDetails.id).description : ''}</p>
      </div>

      {activeTab === 'emploi' && (
        <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} onCreateClass={onCreateClass} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab config={localConfig} onChange={applyLive} />
      )}
      {activeTab === 'compte' && <AccountTab />}

      {activeTab === 'profil' && (
        <div className="max-w-xl space-y-5">
          <section className="rounded-2xl border border-border/70 bg-secondary/25 p-3.5 sm:p-4">
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-foreground font-display">{t('language.settings.title')}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('language.settings.description')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {localeMetadata.map(option => {
                const active = (localConfig.applicationLocale ?? 'fr') === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyLive({ applicationLocale: option.value as AppLocale })}
                    aria-pressed={active}
                    className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center transition-all ${
                      active
                        ? 'border-primary/35 bg-primary text-primary-foreground shadow-[0_5px_14px_rgba(0,86,210,0.18)]'
                        : 'border-border/80 bg-card text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.03] hover:text-foreground'
                    }`}
                  >
                    <span className={`text-base font-extrabold leading-none ${option.value === 'ar' ? 'font-ar' : ''}`}>{option.shortName}</span>
                    <span className={`text-[10px] font-bold ${option.value === 'ar' ? 'font-ar' : ''}`}>{option.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('settings.establishment')}
            </label>
            <Input
              type="text"
              value={localConfig.establishmentName || ''}
              onChange={e => setLocalConfig(prev => ({ ...prev, establishmentName: e.target.value }))}
              placeholder={t('settings.establishmentPlaceholder')}
              className="h-10 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="academy-region" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                    educationProvince: provinces.some(province => province.id === prev.educationProvince) ? prev.educationProvince : '',
                  }));
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{t('settings.chooseAcademy')}</option>
                {MOROCCO_EDUCATION_ACADEMIES.map(academy => (
                  <option key={academy.id} value={academy.id}>{academy.label}</option>
                ))}
              </select>
              <p className="text-[10px] leading-snug text-muted-foreground/60">{t('settings.academyHint')}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="education-province" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('settings.province')}
              </label>
              <select
                id="education-province"
                value={localConfig.educationProvince ?? ''}
                disabled={!selectedAcademy}
                onChange={event => setLocalConfig(prev => ({ ...prev, educationProvince: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{selectedAcademy ? t('settings.chooseProvince') : t('settings.chooseAcademyFirst')}</option>
                {availableProvinces.map(province => (
                  <option key={province.id} value={province.id}>{province.label}{province.kind === 'prefecture' ? ' · préfecture' : ''}</option>
                ))}
              </select>
              <p className="text-[10px] leading-snug text-muted-foreground/60">{t('settings.provinceHint')}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('settings.teacherName')}
            </label>
            <Input
              type="text"
              value={localConfig.defaultTeacherName || ''}
              onChange={e => setLocalConfig(prev => ({ ...prev, defaultTeacherName: e.target.value }))}
              placeholder={t('settings.teacherPlaceholder')}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('settings.cycle')}
            </label>
            <div className="grid max-w-sm grid-cols-3 gap-2">
              {CYCLES.map(c => {
                const active = (localConfig.selectedCycles?.[0] ?? 'college') === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setLocalConfig(prev => ({ ...prev, selectedCycles: [c.key], showAllCycles: false }))}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 text-[11px] font-bold transition-all ${
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/50 hover:text-foreground'
                    }`}
                  >
                    <c.icon className="h-4 w-4" />
                    {t(`settings.cycle.${c.key}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground/60">
              {t('settings.cycleHint')}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'donnees' && (
        <div className="space-y-4">
          {/* Section Gestion des données */}
          <div className="relative space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="relative">
              <h3 className="text-base font-bold text-foreground font-display mb-2">{t('settings.backupTitle')}</h3>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                {t('settings.backupDescription')}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/40 p-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground font-display mb-1.5">{t('settings.exportTitle')}</h4>
                    <p className="mb-3 text-[11px] font-medium leading-relaxed text-muted-foreground">
                      {t('settings.exportDescription')}
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onExportPlatform} 
                    className="w-full border-border text-xs text-primary transition-all hover:bg-primary hover:text-white"
                  >
                    {t('settings.exportAction')}
                  </Button>
                </div>
                
                <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/40 p-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground font-display mb-1.5">{t('settings.importTitle')}</h4>
                    <p className="mb-3 text-[11px] font-medium leading-relaxed text-muted-foreground">
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
                    className="w-full border-border text-xs text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                  >
                    {t('settings.importAction')}
                  </Button>
                </div>
              </div>

              {/* Années scolaires passées : archivage, consultation, téléchargement */}
              <ArchivesSection />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Rendu en PAGE plein écran ──────────────────────────────────────────
  if (asPage) {
    return (
      <div className="rtl-flow min-h-screen bg-background safe-bottom">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-card/95 backdrop-blur shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">
                  {t('settings.title')}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground font-sans truncate">{t('settings.description')}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6">
          {/* Navigation par onglets sur ordinateur, barre segmentée sur mobile. */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Navigation latérale pour les écrans moyens et larges. */}
            <aside className="w-full md:w-64 shrink-0 hidden md:block">
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ConfigTab)}>
                <TabsList className="flex flex-col h-auto w-full border border-border bg-card p-2 shadow-sm gap-1 rounded-2xl items-stretch">
                  {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        dir={isRtl ? 'ltr' : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isRtl ? 'justify-end text-right' : 'justify-start text-left'}`}
                      >
                        {isRtl ? (
                          <>
                            <span dir="rtl">{tabCopy(tab.id).label}</span>
                            <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                          </>
                        ) : (
                          <>
                            <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                            <span>{tabCopy(tab.id).label}</span>
                          </>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </aside>

            {/* Top segment control for mobile screens */}
            <div className="w-full md:hidden overflow-x-auto no-scrollbar py-1">
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ConfigTab)} className="w-max">
                <TabsList className="flex gap-1 bg-secondary/60 border border-border/80 p-1 rounded-2xl">
                  {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        dir={isRtl ? 'ltr' : undefined}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {isRtl ? (
                          <>
                            <span dir="rtl">{tabCopy(tab.id).label}</span>
                            <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                          </>
                        ) : (
                          <>
                            <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                            <span>{tabCopy(tab.id).label}</span>
                          </>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            {/* Core Settings Content Container */}
            <div className="flex-1 w-full bg-card rounded-3xl border border-border/60 p-6 md:p-8 shadow-sm relative min-h-[480px]">
              <div className="relative">
                {tabContent}
              </div>
            </div>

          </div>
        </div>

        {/* Fixed Sticky Footer for Actions */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-4 backdrop-blur shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-6xl px-2 sm:px-4">{footer}</div>
        </div>
      </div>
    );
  }

  // ── Rendu en MODALE (rétro-compatibilité) ──────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.configuration')}
      description={t('settings.preferences')}
      maxWidth="3xl"
      footer={footer}
    >
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ConfigTab)} className="mb-3">
        <TabsList className="flex h-auto w-full gap-1 overflow-x-auto rounded-lg border border-border/60 bg-secondary p-1 md:flex-row md:flex-wrap">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                <span>{tabCopy(tab.id).label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <div>
        {tabContent}
      </div>
    </Modal>
  );
};

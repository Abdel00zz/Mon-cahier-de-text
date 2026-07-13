import React, { useState, useEffect, FC } from 'react';
import { AppConfig, ClassInfo, Cycle } from '@/types';
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

const CYCLES: { key: Cycle; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'college', label: 'Collège', icon: School },
  { key: 'lycee', label: 'Lycée', icon: GraduationCap },
  { key: 'prepa', label: 'Prépa', icon: FlaskConical },
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

const TABS: { id: ConfigTab; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profil', label: 'Profil & infos', description: 'Académie, direction, établissement et enseignant', icon: GraduationCap },
  { id: 'emploi', label: 'Emploi du temps', description: 'Compositions, heures et devoirs', icon: CalendarRange },
  { id: 'notifications', label: 'Notifications', description: 'Alertes de retard et absences', icon: Bell },
  { id: 'donnees', label: 'Données', description: 'Sauvegarde et restauration', icon: Database },
  { id: 'compte', label: 'Compte', description: 'Profil enseignant et synchronisation', icon: User },
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

  const footer = (
    <div className="flex w-full justify-end gap-2.5">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="flex-1 sm:flex-initial h-10 text-xs font-bold rounded-full"
      >
        {asPage ? 'Retour' : 'Annuler'}
      </Button>
      <Button
        type="button"
        onClick={handleSave}
        className="flex-1 sm:flex-initial h-10 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-full"
      >
        Enregistrer les modifications
      </Button>
    </div>
  );

  const activeTabDetails = TABS.find(t => t.id === activeTab);
  const selectedAcademy = localConfig.academyRegion ?? '';
  const availableProvinces = getProvincesForAcademy(selectedAcademy);

  const tabContent = (
    <div className="space-y-6">
      {/* Tab Header for Context */}
      <div className="border-b border-border/40 pb-4">
        <h2 className="text-xl font-extrabold text-foreground font-display flex items-center gap-2">
          {activeTabDetails && <activeTabDetails.icon className="h-5 w-5 text-primary" />}
          {activeTabDetails?.label}
        </h2>
        <p className="text-xs text-muted-foreground font-sans mt-1">{activeTabDetails?.description}</p>
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
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Établissement d'enseignement
            </label>
            <Input
              type="text"
              value={localConfig.establishmentName || ''}
              onChange={e => setLocalConfig(prev => ({ ...prev, establishmentName: e.target.value }))}
              placeholder="Ex : Lycée Ibn al-Haytham"
              className="h-10 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="academy-region" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Académie régionale (AREF)
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
                <option value="">Sélectionner une académie…</option>
                {MOROCCO_EDUCATION_ACADEMIES.map(academy => (
                  <option key={academy.id} value={academy.id}>{academy.label}</option>
                ))}
              </select>
              <p className="text-[10px] leading-snug text-muted-foreground/60">Le choix alimente automatiquement l'en-tête du document imprimé.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="education-province" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Direction provinciale
              </label>
              <select
                id="education-province"
                value={localConfig.educationProvince ?? ''}
                disabled={!selectedAcademy}
                onChange={event => setLocalConfig(prev => ({ ...prev, educationProvince: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{selectedAcademy ? 'Sélectionner une province / préfecture…' : 'Choisir d’abord une académie'}</option>
                {availableProvinces.map(province => (
                  <option key={province.id} value={province.id}>{province.label}{province.kind === 'prefecture' ? ' · préfecture' : ''}</option>
                ))}
              </select>
              <p className="text-[10px] leading-snug text-muted-foreground/60">Les préfectures sont proposées dans la même liste administrative.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Nom de l'enseignant (M. ou Mme)
            </label>
            <Input
              type="text"
              value={localConfig.defaultTeacherName || ''}
              onChange={e => setLocalConfig(prev => ({ ...prev, defaultTeacherName: e.target.value }))}
              placeholder="Ex : M. Ahmed Benali"
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Cycle d'enseignement principal
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
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground/60">
              Ces informations personnalisent l'accueil et pré-remplissent la création de vos classes. La matière se choisit par classe.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'donnees' && (
        <div className="space-y-6">
          {/* Section Gestion des données */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-4 relative">
            <div className="relative">
              <h3 className="text-base font-bold text-foreground font-display mb-2">Sauvegarde & Restauration</h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                Protégez votre travail en exportant périodiquement vos cahiers de textes. Vous pourrez restaurer l'intégralité de vos cours sur n'importe quel appareil.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-secondary/40 rounded-2xl p-4 border border-border/80 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground font-display mb-1.5">Exporter mon cahier</h4>
                    <p className="text-[11px] text-muted-foreground font-medium mb-4 leading-relaxed">
                      Téléchargez un fichier de sauvegarde crypté contenant toutes vos classes, leçons et configurations.
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onExportPlatform} 
                    className="w-full text-xs h-10 border-border text-primary hover:bg-primary hover:text-white rounded-full transition-all"
                  >
                    Sauvegarder localement
                  </Button>
                </div>
                
                <div className="bg-secondary/40 rounded-2xl p-4 border border-border/80 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground font-display mb-1.5">Restaurer des données</h4>
                    <p className="text-[11px] text-muted-foreground font-medium mb-4 leading-relaxed">
                      Remplacez les données actuelles de cet appareil par celles d'un fichier de sauvegarde préexistant.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenImport();
                    }}
                    className="w-full text-xs h-10 border-border text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-all"
                  >
                    Choisir une sauvegarde
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
      <div className="min-h-screen bg-background safe-bottom">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-card/95 backdrop-blur shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">
                  Paramètres de l'application
                </h1>
              </div>
              <p className="text-xs text-muted-foreground font-sans truncate">Gérez votre emploi du temps, vos notifications, affichages et données</p>
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
                        className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                        <span>{tab.label}</span>
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
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                        <span>{tab.label}</span>
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
      title="Configuration"
      description="Préférences d'affichage et gestion des données"
      maxWidth="3xl"
      footer={footer}
    >
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ConfigTab)} className="mb-4">
        <TabsList className="flex flex-col gap-1 bg-secondary border border-border/60 p-1 rounded-xl overflow-x-auto md:flex-row md:flex-wrap h-auto w-full">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <div className="py-2">
        {tabContent}
      </div>
    </Modal>
  );
};

import React, { useState, useEffect, useRef, FC } from 'react';
import { motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '../../types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, BADGE_TOOLTIP_MAP } from '../../constants';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { ScheduleTab } from '../config/ScheduleTab';
import { NotificationsTab } from '../config/NotificationsTab';
import { AccountTab } from '../config/AccountTab';
import { ArchivesSection } from '../config/ArchivesSection';
import { 
  Eye, 
  CalendarRange, 
  Bell, 
  Database, 
  User, 
  ChevronUp, 
  ChevronDown, 
  Download, 
  Upload, 
  ArrowLeft,
  Settings,
  Info
} from '../ui/icons';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
  onExportPlatform: () => void;
  onOpenImport: () => void;
  onOpenWelcome?: () => void;
  classes?: ClassInfo[];
  /** rendu en PAGE plein écran (au lieu d'une modale) */
  asPage?: boolean;
}

type ConfigTab = 'affichage' | 'emploi' | 'notifications' | 'donnees' | 'compte';

const TABS: { id: ConfigTab; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'affichage', label: 'Affichage', description: 'Visibilité des types sur écran et PDF', icon: Eye },
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
  onOpenWelcome,
  classes = [],
  asPage = false,
}) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [activeTab, setActiveTab] = useState<ConfigTab>('affichage');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  // L'emploi du temps, les notifications et le compte s'appliquent immédiatement.
  const applyLive = (patch: Partial<AppConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...patch }));
    onConfigChange(patch);
  };

  const [showScreenTypes, setShowScreenTypes] = useState(false);
  const [showPrintTypes, setShowPrintTypes] = useState(false);

  const getUniqueTypes = () => {
    return Array.from(new Set(Object.values(TYPE_MAP)));
  };

  const defaultSelected = ['exemple', 'application'];

  const handleDescriptionModeChange = (context: 'screen' | 'print', mode: 'all' | 'none' | 'custom') => {
    setLocalConfig(prev => {
      const prevTypes = prev[`${context}DescriptionTypes`] || [];
      const nextTypes = mode === 'all' ? getUniqueTypes()
        : mode === 'none' ? []
        : (prevTypes.length > 0 ? prevTypes : defaultSelected);
      return {
        ...prev,
        [`${context}DescriptionMode`]: mode,
        [`${context}DescriptionTypes`]: nextTypes,
      };
    });
  };

  const handleDescriptionTypeToggle = (context: 'screen' | 'print', type: string) => {
    setLocalConfig(prev => {
      const currentTypes = prev[`${context}DescriptionTypes`] || [];
      const newTypes = currentTypes.includes(type) 
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      return {
        ...prev,
        [`${context}DescriptionTypes`]: newTypes,
        [`${context}DescriptionMode`]: newTypes.length === 0 ? 'none' : 
                                       newTypes.length === getUniqueTypes().length ? 'all' : 'custom'
      };
    });
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  if (!asPage && !isOpen) return null;

  const footer = (
    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (onOpenWelcome) {
            onClose();
            onOpenWelcome();
          }
        }}
        className="w-full sm:w-auto h-10 text-xs font-bold border-border text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full"
      >
        Modifier mes informations d'accueil
      </Button>
      <div className="flex gap-2.5 w-full sm:w-auto">
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
    </div>
  );

  const activeTabDetails = TABS.find(t => t.id === activeTab);

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
        <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab config={localConfig} onChange={applyLive} />
      )}
      {activeTab === 'compte' && <AccountTab />}

      {activeTab === 'affichage' && (
        <div className="space-y-6">
          {/* Section Configuration Générale */}
          <div className="relative overflow-hidden rounded-[20px] border border-border/60 bg-secondary/40 p-5 shadow-sm">
            <div className="relative flex gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-foreground font-display mb-1">Configuration Générale</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Les préférences d'affichage globales telles que le nom de votre établissement, l'académie et votre nom d'enseignant sont gérées via l'écran d'accueil en cliquant sur le bouton ci-dessous ou sur "Modifier mes informations d'accueil".
                </p>
              </div>
            </div>
          </div>

          {/* Section Contenu visible */}
          <div className="rounded-[24px] border border-border/60 bg-card p-6 shadow-sm space-y-5 relative">
            <div className="relative">
              <h3 className="text-base font-bold text-foreground font-display mb-4">Contenu visible par contexte</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Application Context */}
                <div className="rounded-xl p-4 border border-border/80 bg-secondary/30 space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Application (à l'écran)
                  </h4>

                  <div className="space-y-3">
                    <div className="flex gap-1 bg-card p-1 rounded-lg border border-border/60">
                      {(['all', 'none', 'custom'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            handleDescriptionModeChange('screen', mode);
                            if (mode === 'custom') setShowScreenTypes(true);
                            else setShowScreenTypes(false);
                          }}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                            (localConfig.screenDescriptionMode || 'all') === mode
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-muted-foreground hover:bg-secondary/40'
                          }`}
                        >
                          {mode === 'all' && 'Tout'}
                          {mode === 'none' && 'Aucune'}
                          {mode === 'custom' && 'Sélection'}
                        </button>
                      ))}
                    </div>

                    {/* Afficher/cacher liste des types */}
                    {(localConfig.screenDescriptionMode || 'all') === 'custom' && (
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowScreenTypes(!showScreenTypes)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card text-left hover:bg-secondary/40 transition-colors"
                        >
                          <span className="text-xs font-bold text-muted-foreground font-sans">
                            Types sélectionnés ({(localConfig.screenDescriptionTypes || []).length})
                          </span>
                          {showScreenTypes ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                        </button>

                        {showScreenTypes && (
                          <div className="space-y-2.5 mt-2 animate-in fade-in duration-200">
                            <div className="flex flex-wrap gap-1.5 p-2 bg-card rounded-xl border border-border">
                              {getUniqueTypes().map(type => {
                                const isSelected = (localConfig.screenDescriptionTypes || []).includes(type);
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleDescriptionTypeToggle('screen', type)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                                      isSelected
                                        ? `${BADGE_COLOR_MAP[type] || 'bg-muted text-foreground'} ring-1 ring-border`
                                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary border border-border/60'
                                    }`}
                                    title={BADGE_TOOLTIP_MAP[type] || type}
                                  >
                                    {BADGE_TEXT_MAP[type] || type}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-bold text-primary px-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    screenDescriptionTypes: getUniqueTypes(),
                                    screenDescriptionMode: 'all'
                                  }));
                                }}
                                className="hover:underline"
                              >
                                Tout sélectionner
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    screenDescriptionTypes: [],
                                    screenDescriptionMode: 'none'
                                  }));
                                }}
                                className="hover:underline"
                              >
                                Tout désélectionner
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Print Context */}
                <div className="rounded-xl p-4 border border-border/80 bg-secondary/30 space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Impression (Export PDF)
                  </h4>

                  <div className="space-y-3">
                    <div className="flex gap-1 bg-card p-1 rounded-lg border border-border/60">
                      {(['all', 'none', 'custom'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            handleDescriptionModeChange('print', mode);
                            if (mode === 'custom') setShowPrintTypes(true);
                            else setShowPrintTypes(false);
                          }}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                            (localConfig.printDescriptionMode || 'all') === mode
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-muted-foreground hover:bg-secondary/40'
                          }`}
                        >
                          {mode === 'all' && 'Tout'}
                          {mode === 'none' && 'Aucune'}
                          {mode === 'custom' && 'Sélection'}
                        </button>
                      ))}
                    </div>

                    {/* Afficher/cacher liste des types */}
                    {(localConfig.printDescriptionMode || 'all') === 'custom' && (
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowPrintTypes(!showPrintTypes)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card text-left hover:bg-secondary/40 transition-colors"
                        >
                          <span className="text-xs font-bold text-muted-foreground font-sans">
                            Types sélectionnés ({(localConfig.printDescriptionTypes || []).length})
                          </span>
                          {showPrintTypes ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                        </button>

                        {showPrintTypes && (
                          <div className="space-y-2.5 mt-2 animate-in fade-in duration-200">
                            <div className="flex flex-wrap gap-1.5 p-2 bg-card rounded-xl border border-border">
                              {getUniqueTypes().map(type => {
                                const isSelected = (localConfig.printDescriptionTypes || []).includes(type);
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleDescriptionTypeToggle('print', type)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                                      isSelected
                                        ? `${BADGE_COLOR_MAP[type] || 'bg-muted text-foreground'} ring-1 ring-border`
                                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary border border-border/60'
                                    }`}
                                    title={BADGE_TOOLTIP_MAP[type] || type}
                                  >
                                    <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-extrabold ${
                                      isSelected ? 'bg-card/30 text-white' : 'bg-border text-muted-foreground'
                                    }`}>
                                      {BADGE_TEXT_MAP[type]?.charAt(0) || type.charAt(0).toUpperCase()}
                                    </span>
                                    {BADGE_TEXT_MAP[type] || type}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-bold text-primary px-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    printDescriptionTypes: getUniqueTypes(),
                                    printDescriptionMode: 'all'
                                  }));
                                }}
                                className="hover:underline"
                              >
                                Tout sélectionner
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    printDescriptionTypes: [],
                                    printDescriptionMode: 'none'
                                  }));
                                }}
                                className="hover:underline"
                              >
                                Tout désélectionner
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'donnees' && (
        <div className="space-y-6">
          {/* Section Gestion des données */}
          <div className="rounded-[24px] border border-border/60 bg-card p-6 shadow-sm space-y-4 relative">
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
                    <Download className="mr-1.5 h-4 w-4" /> Sauvegarder localement
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
                    <Upload className="mr-1.5 h-4 w-4" /> Choisir une sauvegarde
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
          {/* Dual layout: Sidebar on desktop/tablet, segment bar on mobile */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Left navigation sidebar for md+ screens */}
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
            <div className="flex-1 w-full bg-card rounded-[28px] border border-border/60 p-6 md:p-8 shadow-sm relative min-h-[480px]">
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

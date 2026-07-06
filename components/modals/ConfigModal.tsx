import React, { useState, useEffect, useRef, FC } from 'react';
import { motion } from 'framer-motion';
import { AppConfig, ClassInfo } from '../../types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, BADGE_TOOLTIP_MAP } from '../../constants';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScheduleTab } from '../config/ScheduleTab';
import { NotificationsTab } from '../config/NotificationsTab';
import { AccountTab } from '../config/AccountTab';
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
        className="w-full sm:w-auto h-10 text-xs font-bold border-[#E4D3AC] text-[#69604F] hover:bg-[#FCF6EA] hover:text-[#2B241D] rounded-full"
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
          className="flex-1 sm:flex-initial h-10 text-xs font-bold bg-[#B8935A] text-white hover:bg-[#9E7A46] rounded-full"
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
      <div className="border-b border-[#E4D3AC]/40 pb-4">
        <h2 className="text-xl font-extrabold text-[#2B241D] font-display flex items-center gap-2">
          {activeTabDetails && <activeTabDetails.icon className="h-5 w-5 text-[#B8935A]" />}
          {activeTabDetails?.label}
        </h2>
        <p className="text-xs text-[#69604F] font-sans mt-1">{activeTabDetails?.description}</p>
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
          <div className="relative overflow-hidden rounded-[20px] border border-[#E4D3AC]/60 bg-[#FCF6EA]/40 p-5 shadow-sm">
            <div className="relative flex gap-3">
              <Info className="h-5 w-5 text-[#B8935A] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#2B241D] font-display mb-1">Configuration Générale</h3>
                <p className="text-xs text-[#69604F] leading-relaxed font-medium">
                  Les préférences d'affichage globales telles que le nom de votre établissement, l'académie et votre nom d'enseignant sont gérées via l'écran d'accueil en cliquant sur le bouton ci-dessous ou sur "Modifier mes informations d'accueil".
                </p>
              </div>
            </div>
          </div>

          {/* Section Contenu visible */}
          <div className="rounded-[24px] border border-[#E4D3AC]/60 bg-[#FFFDF7] p-6 shadow-sm space-y-5 relative">
            <div className="relative">
              <h3 className="text-base font-bold text-[#2B241D] font-display mb-4">Contenu visible par contexte</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Application Context */}
                <div className="rounded-xl p-4 border border-[#E4D3AC]/80 bg-[#FCF6EA]/30 space-y-4">
                  <h4 className="text-xs font-bold text-[#69604F] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8935A]" />
                    Application (à l'écran)
                  </h4>

                  <div className="space-y-3">
                    <div className="flex gap-1 bg-[#FFFDF7] p-1 rounded-lg border border-[#E4D3AC]/60">
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
                              ? 'bg-[#B8935A] text-white shadow-sm'
                              : 'text-[#69604F] hover:bg-[#FCF6EA]/40'
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
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E4D3AC] bg-[#FFFDF7] text-left hover:bg-[#FCF6EA]/40 transition-colors"
                        >
                          <span className="text-xs font-bold text-[#69604F] font-sans">
                            Types sélectionnés ({(localConfig.screenDescriptionTypes || []).length})
                          </span>
                          {showScreenTypes ? <ChevronUp className="h-4 w-4 text-[#B8935A]" /> : <ChevronDown className="h-4 w-4 text-[#B8935A]" />}
                        </button>

                        {showScreenTypes && (
                          <div className="space-y-2.5 mt-2 animate-in fade-in duration-200">
                            <div className="flex flex-wrap gap-1.5 p-2 bg-[#FFFDF7] rounded-xl border border-[#E4D3AC]">
                              {getUniqueTypes().map(type => {
                                const isSelected = (localConfig.screenDescriptionTypes || []).includes(type);
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleDescriptionTypeToggle('screen', type)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                                      isSelected
                                        ? `${BADGE_COLOR_MAP[type] || 'bg-slate-200 text-slate-800'} ring-1 ring-slate-300`
                                        : 'bg-[#FCF6EA]/40 text-[#69604F] hover:bg-[#FCF6EA] border border-[#E4D3AC]/60'
                                    }`}
                                    title={BADGE_TOOLTIP_MAP[type] || type}
                                  >
                                    {BADGE_TEXT_MAP[type] || type}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-bold text-[#B8935A] px-1">
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
                <div className="rounded-xl p-4 border border-[#E4D3AC]/80 bg-[#FCF6EA]/30 space-y-4">
                  <h4 className="text-xs font-bold text-[#69604F] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8935A]" />
                    Impression (Export PDF)
                  </h4>

                  <div className="space-y-3">
                    <div className="flex gap-1 bg-[#FFFDF7] p-1 rounded-lg border border-[#E4D3AC]/60">
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
                              ? 'bg-[#B8935A] text-white shadow-sm'
                              : 'text-[#69604F] hover:bg-[#FCF6EA]/40'
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
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E4D3AC] bg-[#FFFDF7] text-left hover:bg-[#FCF6EA]/40 transition-colors"
                        >
                          <span className="text-xs font-bold text-[#69604F] font-sans">
                            Types sélectionnés ({(localConfig.printDescriptionTypes || []).length})
                          </span>
                          {showPrintTypes ? <ChevronUp className="h-4 w-4 text-[#B8935A]" /> : <ChevronDown className="h-4 w-4 text-[#B8935A]" />}
                        </button>

                        {showPrintTypes && (
                          <div className="space-y-2.5 mt-2 animate-in fade-in duration-200">
                            <div className="flex flex-wrap gap-1.5 p-2 bg-[#FFFDF7] rounded-xl border border-[#E4D3AC]">
                              {getUniqueTypes().map(type => {
                                const isSelected = (localConfig.printDescriptionTypes || []).includes(type);
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleDescriptionTypeToggle('print', type)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                                      isSelected
                                        ? `${BADGE_COLOR_MAP[type] || 'bg-slate-200 text-slate-800'} ring-1 ring-slate-300`
                                        : 'bg-[#FCF6EA]/40 text-[#69604F] hover:bg-[#FCF6EA] border border-[#E4D3AC]/60'
                                    }`}
                                    title={BADGE_TOOLTIP_MAP[type] || type}
                                  >
                                    <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-extrabold ${
                                      isSelected ? 'bg-white/30 text-white' : 'bg-[#E4D3AC] text-[#69604F]'
                                    }`}>
                                      {BADGE_TEXT_MAP[type]?.charAt(0) || type.charAt(0).toUpperCase()}
                                    </span>
                                    {BADGE_TEXT_MAP[type] || type}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-bold text-[#B8935A] px-1">
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
          <div className="rounded-[24px] border border-[#E4D3AC]/60 bg-[#FFFDF7] p-6 shadow-sm space-y-4 relative">
            <div className="relative">
              <h3 className="text-base font-bold text-[#2B241D] font-display mb-2">Sauvegarde & Restauration</h3>
              <p className="text-xs text-[#69604F] mb-6 leading-relaxed">
                Protégez votre travail en exportant périodiquement vos cahiers de textes. Vous pourrez restaurer l'intégralité de vos cours sur n'importe quel appareil.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-[#FCF6EA]/40 rounded-2xl p-4 border border-[#E4D3AC]/80 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#2B241D] font-display mb-1.5">Exporter mon cahier</h4>
                    <p className="text-[11px] text-[#69604F] font-medium mb-4 leading-relaxed">
                      Téléchargez un fichier de sauvegarde crypté contenant toutes vos classes, leçons et configurations.
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onExportPlatform} 
                    className="w-full text-xs h-10 border-[#E4D3AC] text-[#B8935A] hover:bg-[#B8935A] hover:text-white rounded-full transition-all"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Sauvegarder localement
                  </Button>
                </div>
                
                <div className="bg-[#FCF6EA]/40 rounded-2xl p-4 border border-[#E4D3AC]/80 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#2B241D] font-display mb-1.5">Restaurer des données</h4>
                    <p className="text-[11px] text-[#69604F] font-medium mb-4 leading-relaxed">
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
                    className="w-full text-xs h-10 border-[#E4D3AC] text-[#69604F] hover:bg-[#FCF6EA] hover:text-[#2B241D] rounded-full transition-all"
                  >
                    <Upload className="mr-1.5 h-4 w-4" /> Choisir une sauvegarde
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Rendu en PAGE plein écran ──────────────────────────────────────────
  if (asPage) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--accent)),transparent_34rem)] safe-bottom bg-[#FFFDF7]/10">
        <header className="sticky top-0 z-20 border-b border-[#E4D3AC]/60 bg-[#FFFDF7]/95 backdrop-blur shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#B8935A]" />
                <h1 className="text-xl font-extrabold text-[#2B241D] font-display tracking-tight">
                  Paramètres de l'application
                </h1>
              </div>
              <p className="text-xs text-[#69604F] font-sans truncate">Gérez votre emploi du temps, vos notifications, affichages et données</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6">
          {/* Dual layout: Sidebar on desktop/tablet, segment bar on mobile */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Left navigation sidebar for md+ screens */}
            <aside className="w-full md:w-64 shrink-0 hidden md:block space-y-1">
              <div className="rounded-2xl border border-[#E4D3AC] bg-[#FFFDF7] p-2 shadow-sm space-y-1">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'bg-[#B8935A] text-white shadow-md'
                          : 'text-[#69604F] hover:bg-[#FCF6EA] hover:text-[#2B241D]'
                      }`}
                    >
                      <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#B8935A]'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Top segment control for mobile screens */}
            <div className="w-full md:hidden overflow-x-auto no-scrollbar py-1">
              <div className="flex gap-1 bg-[#FCF6EA]/60 border border-[#E4D3AC]/80 p-1 rounded-2xl w-max">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-[#B8935A] text-white shadow-sm'
                          : 'text-[#69604F] hover:bg-white'
                      }`}
                    >
                      <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-[#B8935A]'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Settings Content Container */}
            <div className="flex-1 w-full bg-[#FFFDF7] rounded-[28px] border border-[#E4D3AC]/60 p-6 md:p-8 shadow-sm relative min-h-[480px]">
              <div className="relative">
                {tabContent}
              </div>
            </div>

          </div>
        </div>

        {/* Fixed Sticky Footer for Actions */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E4D3AC] bg-[#FFFDF7]/95 px-4 py-4 backdrop-blur shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-6xl px-2 sm:px-4">{footer}</div>
        </div>
      </div>
    );
  }

  // ── Rendu en MODALE (rétro-compatibilité) ──────────────────────────────
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration"
      description="Préférences d'affichage et gestion des données"
      maxWidth="3xl"
      footer={footer}
    >
      <div className="flex flex-col gap-1 bg-[#FCF6EA] border border-[#E4D3AC]/60 p-1 rounded-xl mb-4 overflow-x-auto md:flex-row md:flex-wrap">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#B8935A] text-white shadow-sm'
                  : 'text-[#69604F] hover:bg-white'
              }`}
            >
              <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-[#B8935A]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="py-2">
        {tabContent}
      </div>
    </Dialog>
  );
};

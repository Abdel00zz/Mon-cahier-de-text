import React, { useState, useEffect, useRef, FC } from 'react';
import { AppConfig, ClassInfo } from '../../types';
import { TYPE_MAP, BADGE_TEXT_MAP, BADGE_COLOR_MAP, BADGE_TOOLTIP_MAP } from '../../constants';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScheduleTab } from '../config/ScheduleTab';
import { NotificationsTab } from '../config/NotificationsTab';
import { AccountTab } from '../config/AccountTab';
import { Eye, CalendarRange, Bell, Database, User, ChevronUp, ChevronDown, Download, Upload } from '../ui/icons';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
  onExportPlatform: () => void;
  onOpenImport: () => void;
  onOpenWelcome?: () => void;
  classes?: ClassInfo[];
}

type ConfigTab = 'affichage' | 'emploi' | 'notifications' | 'donnees' | 'compte';

const TABS: { id: ConfigTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'affichage', label: 'Affichage', icon: Eye },
  { id: 'emploi', label: 'Emploi du temps', icon: CalendarRange },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'donnees', label: 'Données', icon: Database },
  { id: 'compte', label: 'Compte', icon: User },
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration"
      description="Préférences d'affichage et gestion des données"
      maxWidth="3xl"
      footer={
        <div className="flex justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onOpenWelcome) {
                onClose();
                onOpenWelcome();
              }
            }}
          >
            Modifier mes informations
          </Button>
          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </div>
      }
    >
      <div ref={modalRef} className="py-1">
        {/* Barre d'onglets */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'emploi' && (
          <ScheduleTab classes={classes} config={localConfig} onChange={applyLive} />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab config={localConfig} onChange={applyLive} />
        )}
        {activeTab === 'compte' && <AccountTab />}

        {activeTab === 'affichage' && (
        <div className="space-y-4">
        {/* Section Configuration Générale */}
        <div className="bg-slate-50 rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Configuration Générale</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Les préférences d'affichage globales de votre établissement et de l'enseignant sont gérées via l'écran d'accueil ("Modifier mes informations").
          </p>
        </div>

        {/* Section Contenu visible */}
        <div className="bg-slate-50 rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Contenu visible</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Application Context */}
            <div className="rounded-xl p-3 border border-border bg-white space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Application (écran)
              </h4>

              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['all', 'none', 'custom'] as const).map(mode => (
                    <Button
                      key={mode}
                      type="button"
                      variant={(localConfig.screenDescriptionMode || 'all') === mode ? 'default' : 'outline'}
                      onClick={() => {
                        handleDescriptionModeChange('screen', mode);
                        if (mode === 'custom') setShowScreenTypes(true);
                        else setShowScreenTypes(false);
                      }}
                      className="flex-1 py-1.5 h-8 text-xs font-medium"
                    >
                      {mode === 'all' && 'Tout'}
                      {mode === 'none' && 'Aucune'}
                      {mode === 'custom' && 'Sélection'}
                    </Button>
                  ))}
                </div>

                {/* Afficher/cacher liste des types */}
                {(localConfig.screenDescriptionMode || 'all') === 'custom' && (
                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowScreenTypes(!showScreenTypes)}
                      className="w-full flex items-center justify-between px-3 py-1.5 h-8"
                    >
                      <span className="text-xs font-semibold text-slate-600">
                        Types sélectionnés ({(localConfig.screenDescriptionTypes || []).length})
                      </span>
                      {showScreenTypes ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                    </Button>

                    {showScreenTypes && (
                      <div className="space-y-2 mt-2">
                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-border">
                          {getUniqueTypes().map(type => {
                            const isSelected = (localConfig.screenDescriptionTypes || []).includes(type);
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleDescriptionTypeToggle('screen', type)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? `${BADGE_COLOR_MAP[type] || 'bg-slate-200 text-slate-800'} ring-1 ring-slate-300`
                                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                                data-tippy-content={BADGE_TOOLTIP_MAP[type] || type}
                              >
                                {BADGE_TEXT_MAP[type] || type}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setLocalConfig(prev => ({
                                ...prev,
                                screenDescriptionTypes: getUniqueTypes(),
                                screenDescriptionMode: 'all'
                              }));
                            }}
                            className="hover:text-primary"
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
                            className="hover:text-primary"
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
            <div className="rounded-xl p-3 border border-border bg-white space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Impression (PDF)
              </h4>

              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['all', 'none', 'custom'] as const).map(mode => (
                    <Button
                      key={mode}
                      type="button"
                      variant={(localConfig.printDescriptionMode || 'all') === mode ? 'default' : 'outline'}
                      onClick={() => {
                        handleDescriptionModeChange('print', mode);
                        if (mode === 'custom') setShowPrintTypes(true);
                        else setShowPrintTypes(false);
                      }}
                      className="flex-1 py-1.5 h-8 text-xs font-medium"
                    >
                      {mode === 'all' && 'Tout'}
                      {mode === 'none' && 'Aucune'}
                      {mode === 'custom' && 'Sélection'}
                    </Button>
                  ))}
                </div>

                {/* Afficher/cacher liste des types */}
                {(localConfig.printDescriptionMode || 'all') === 'custom' && (
                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPrintTypes(!showPrintTypes)}
                      className="w-full flex items-center justify-between px-3 py-1.5 h-8"
                    >
                      <span className="text-xs font-semibold text-slate-600">
                        Types sélectionnés ({(localConfig.printDescriptionTypes || []).length})
                      </span>
                      {showPrintTypes ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                    </Button>

                    {showPrintTypes && (
                      <div className="space-y-2 mt-2">
                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-border">
                          {getUniqueTypes().map(type => {
                            const isSelected = (localConfig.printDescriptionTypes || []).includes(type);
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleDescriptionTypeToggle('print', type)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? `${BADGE_COLOR_MAP[type] || 'bg-slate-200 text-slate-800'} ring-1 ring-slate-300`
                                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                                data-tippy-content={BADGE_TOOLTIP_MAP[type] || type}
                              >
                                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold ${
                                  isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {BADGE_TEXT_MAP[type]?.charAt(0) || type.charAt(0).toUpperCase()}
                                </span>
                                {BADGE_TEXT_MAP[type] || type}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setLocalConfig(prev => ({
                                ...prev,
                                printDescriptionTypes: getUniqueTypes(),
                                printDescriptionMode: 'all'
                              }));
                            }}
                            className="hover:text-primary"
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
                            className="hover:text-primary"
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
        )}

        {activeTab === 'donnees' && (
        <div className="space-y-4">
        {/* Section Gestion des données */}
        <div className="bg-slate-50 rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Gestion des données</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="bg-white rounded-xl p-3 border border-border flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-1">Sauvegarder les classes</h4>
                <p className="text-[11px] text-slate-400 font-medium mb-3 leading-relaxed">
                  Exportez un fichier de sauvegarde contenant l'ensemble de vos classes et configurations.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={onExportPlatform} className="w-full text-xs h-9">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter la sauvegarde
              </Button>
            </div>
            
            <div className="bg-white rounded-xl p-3 border border-border flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-1">Restaurer des données</h4>
                <p className="text-[11px] text-slate-400 font-medium mb-3 leading-relaxed">
                  Restaurez vos classes et configurations à partir d'un fichier exporté précédemment.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="w-full text-xs h-9"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Importer une sauvegarde
              </Button>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>
    </Dialog>
  );
};
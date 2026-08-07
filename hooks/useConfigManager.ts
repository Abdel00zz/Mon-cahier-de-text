import { useCallback, useEffect, useState } from 'react';
import { useImmer } from 'use-immer';
import { AppConfig } from '../types';
import { logger } from '../utils/logger';
import { effectiveSchedules } from '../utils/timetable';
import { SYNCABLE_KEYS } from '../utils/syncSettings';
import { markClassesListDirty, notifyConfigChanged, subscribe, touchSettingsSyncMeta } from '../utils/syncBus';

const CONFIG_STORAGE_KEY = 'appConfig_v1';

export const defaultNotificationSettings = {
    enabled: true,
    pushEnabled: false,
    gapThreshold: 2,
    inactivityThresholdDays: 5,
    quietDuringVacations: true,
    // rappels locaux de fin de séance : opt-in, spécifique à l'appareil
    sessionVibration: false,
} as const;

const defaultConfig: AppConfig = {
    applicationLocale: 'fr',
    establishmentName: '',
    defaultTeacherName: '',
    academyRegion: '',
    educationProvince: '',
    printShowDescriptions: true,
    screenDescriptionMode: 'all',
    screenDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
    printDescriptionMode: 'all',
    printDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
    selectedCycles: ['college'], // Un seul cycle par défaut
    selectedSubjects: [], // Aucune matière par défaut (toutes affichées)
    showAllCycles: false, // false car on a une sélection spécifique
    showAllSubjects: true, // true car aucune matière sélectionnée
    hasCompletedWelcome: false,
    schedules: [],
    timetable: [],
    notificationSettings: { ...defaultNotificationSettings },
    absences: [],
    assessmentDates: {},
    pedagogicalEvents: {},
};

export const useConfigManager = () => {
    const [config, setConfig] = useImmer<AppConfig>(defaultConfig);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
            if (storedConfig) {
                const loadedConfig = JSON.parse(storedConfig);
                const loadedPrintDescriptionMode: AppConfig['printDescriptionMode'] =
                    loadedConfig.printDescriptionMode === 'all' || loadedConfig.printDescriptionMode === 'none' || loadedConfig.printDescriptionMode === 'custom'
                        ? loadedConfig.printDescriptionMode
                        : loadedConfig.printShowDescriptions === false ? 'none' : 'all';
                setConfig(() => ({
                    ...defaultConfig,
                    ...loadedConfig,
                    printShowDescriptions: loadedConfig.printShowDescriptions ?? (loadedConfig.printDescriptionMode === 'none' ? false : (loadedConfig.printDescriptionMode === 'all' ? true : true)),
                    screenDescriptionMode: loadedConfig.screenDescriptionMode ?? 'all',
                    screenDescriptionTypes: loadedConfig.screenDescriptionTypes && loadedConfig.screenDescriptionTypes.length > 0
                        ? loadedConfig.screenDescriptionTypes
                        : ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
                    // Migration explicite de l'ancien booléen printShowDescriptions.
                    printDescriptionMode: loadedPrintDescriptionMode,
                    printDescriptionTypes: loadedConfig.printDescriptionTypes && loadedConfig.printDescriptionTypes.length > 0
                        ? loadedConfig.printDescriptionTypes
                        : ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
                    selectedCycles: loadedConfig.selectedCycles ?? ['college', 'lycee', 'prepa'],
                    selectedSubjects: loadedConfig.selectedSubjects ?? [],
                    showAllCycles: loadedConfig.showAllCycles ?? true,
                    showAllSubjects: loadedConfig.showAllSubjects ?? true,
                    hasCompletedWelcome: loadedConfig.hasCompletedWelcome ?? false,
                    // toujours re-dérivé de la grille (source de vérité, règle évolutive)
                    schedules: effectiveSchedules(loadedConfig),
                    timetable: loadedConfig.timetable ?? [],
                    notificationSettings: { ...defaultNotificationSettings, ...(loadedConfig.notificationSettings ?? {}) },
                    absences: loadedConfig.absences ?? [],
                    assessmentDates: loadedConfig.assessmentDates ?? {},
                    pedagogicalEvents: loadedConfig.pedagogicalEvents ?? {},
                    schoolYearStart: loadedConfig.schoolYearStart,
                    applicationLocale: loadedConfig.applicationLocale === 'en' || loadedConfig.applicationLocale === 'ar' ? loadedConfig.applicationLocale : 'fr',
                }));
            } else {
                setConfig(currentConfig => ({
                    ...currentConfig,
                    printShowDescriptions: true,
                    screenDescriptionMode: 'all',
                    screenDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
                    printDescriptionMode: 'all',
                    printDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
                    selectedCycles: ['college', 'lycee', 'prepa'],
                    selectedSubjects: [],
                    showAllCycles: true,
                    showAllSubjects: true,
                    hasCompletedWelcome: false,
                }));
            }
        } catch (error) {
            logger.error("Failed to load config from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, [setConfig]);

    // ── Rechargement quand un pull cloud a réécrit le localStorage ─────────
    useEffect(() => {
        const reload = () => {
            try {
                const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
                if (stored) {
                    const loaded = JSON.parse(stored);
                    setConfig(draft => {
                        Object.assign(draft, loaded);
                        draft.schedules = effectiveSchedules(loaded);
                    });
                }
            } catch (error) {
                logger.error('Failed to reload config after cloud pull', error);
            }
        };
        const unsubscribePull = subscribe('pull-applied', reload);
        const unsubscribeConfig = subscribe('config-changed', reload);
        return () => {
            unsubscribePull();
            unsubscribeConfig();
        };
    }, [setConfig]);

    const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
        setConfig(draft => {
            Object.assign(draft, newConfig);
            try {
                localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(draft));
            } catch (error) {
                logger.error("Failed to save config to localStorage", error);
            }
        });
        /*
         * TOUT réglage synchronisé (emploi du temps, absences, devoirs,
         * établissement, cycles/matières, préférences d'affichage, notifications)
         * voyage avec le blob classes : la liste des clés vient de syncSettings
         * (source de vérité unique) — plus aucune clé oubliée du circuit.
         */
        const touchesSyncable =
            newConfig.notificationSettings !== undefined ||
            SYNCABLE_KEYS.some(key => newConfig[key as keyof AppConfig] !== undefined);
        if (touchesSyncable) {
            touchSettingsSyncMeta();
            markClassesListDirty();
        }
        notifyConfigChanged();
    }, [setConfig]);

    return { config, updateConfig, isLoading };
};

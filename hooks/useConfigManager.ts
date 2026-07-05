import { useCallback, useEffect, useState } from 'react';
import { useImmer } from 'use-immer';
import { AppConfig } from '../types';
import { logger } from '../utils/logger';
import { markClassesListDirty, subscribe } from '../utils/syncBus';

const CONFIG_STORAGE_KEY = 'appConfig_v1';

export const defaultNotificationSettings = {
    enabled: true,
    pushEnabled: false,
    gapThreshold: 2,
    inactivityThresholdDays: 5,
    quietDuringVacations: true,
} as const;

const defaultConfig: AppConfig = {
    establishmentName: '',
    defaultTeacherName: '',
    printShowDescriptions: false,
    theme: 'system',
    screenDescriptionMode: 'custom',
    screenDescriptionTypes: ['exemple', 'application'],
    printDescriptionMode: 'custom',
    printDescriptionTypes: ['exemple', 'application'],
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
};

export const useConfigManager = () => {
    const [config, setConfig] = useImmer<AppConfig>(defaultConfig);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
            if (storedConfig) {
                const loadedConfig = JSON.parse(storedConfig);
                setConfig(() => ({
                    ...defaultConfig,
                    ...loadedConfig,
                    printShowDescriptions: loadedConfig.printShowDescriptions ?? loadedConfig.printDescriptionMode === 'none' ? false : (loadedConfig.printDescriptionMode === 'all' ? true : (typeof loadedConfig.printShowDescriptions === 'boolean' ? loadedConfig.printShowDescriptions : false)),
                    screenDescriptionMode: loadedConfig.screenDescriptionMode ?? 'all',
                    screenDescriptionTypes: loadedConfig.screenDescriptionTypes ?? [],
                    printDescriptionMode: loadedConfig.printDescriptionMode ?? (typeof loadedConfig.printShowDescriptions === 'boolean' ? (loadedConfig.printShowDescriptions ? 'all' : 'none') : 'all'),
                    printDescriptionTypes: loadedConfig.printDescriptionTypes ?? [],
                    selectedCycles: loadedConfig.selectedCycles ?? ['college', 'lycee', 'prepa'],
                    selectedSubjects: loadedConfig.selectedSubjects ?? [],
                    showAllCycles: loadedConfig.showAllCycles ?? true,
                    showAllSubjects: loadedConfig.showAllSubjects ?? true,
                    hasCompletedWelcome: loadedConfig.hasCompletedWelcome ?? false,
                    schedules: loadedConfig.schedules ?? [],
                    timetable: loadedConfig.timetable ?? [],
                    notificationSettings: { ...defaultNotificationSettings, ...(loadedConfig.notificationSettings ?? {}) },
                    absences: loadedConfig.absences ?? [],
                    assessmentDates: loadedConfig.assessmentDates ?? {},
                    schoolYearStart: loadedConfig.schoolYearStart,
                }));
            } else {
                setConfig(currentConfig => ({
                    ...currentConfig,
                    printShowDescriptions: false,
                    screenDescriptionMode: 'custom',
                    screenDescriptionTypes: ['exemple', 'application'],
                    printDescriptionMode: 'custom',
                    printDescriptionTypes: ['exemple', 'application'],
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
        return subscribe('pull-applied', () => {
            try {
                const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
                if (stored) {
                    const loaded = JSON.parse(stored);
                    setConfig(draft => { Object.assign(draft, loaded); });
                }
            } catch (error) {
                logger.error('Failed to reload config after cloud pull', error);
            }
        });
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
        // l'emploi du temps, les absences, les dates de devoirs et les préférences
        // de notification voyagent avec le blob classes (synchro cloud)
        if (newConfig.schedules || newConfig.timetable || newConfig.notificationSettings || newConfig.absences || newConfig.assessmentDates || newConfig.schoolYearStart) {
            markClassesListDirty();
        }
    }, [setConfig]);

    return { config, updateConfig, isLoading };
};


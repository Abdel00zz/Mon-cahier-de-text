import { useCallback, useEffect, useRef, useState } from 'react';
import { useImmer } from 'use-immer';
import { AppConfig, AppLocale } from '../types';
import { logger } from '../utils/logger';
import { effectiveSchedules } from '../utils/timetable';
import { SYNCABLE_KEYS } from '../utils/syncSettings';
import { markClassesListDirty, notifyConfigChanged, subscribe, touchSettingsSyncMeta } from '../utils/syncBus';

const CONFIG_STORAGE_KEY = 'appConfig_v1';

const normalizeApplicationLocale = (value: unknown): AppLocale =>
    value === 'fr' || value === 'en' || value === 'ar' ? value : 'ar';

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
    theme: 'light',
    contentFontLatin: 'fira',
    contentFontArabic: 'ibm-plex',
    applicationLocale: 'ar',
    establishmentName: '',
    defaultTeacherName: '',
    academyRegion: '',
    educationProvince: '',
    printShowDescriptions: true,
    screenDescriptionMode: 'all',
    screenDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
    printDescriptionMode: 'all',
    printDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
    selectedCycles: [], // Choix explicite pendant l'onboarding
    selectedSubjects: [], // Aucune matière par défaut (toutes affichées)
    showAllCycles: false, // false car on a une sélection spécifique
    showAllSubjects: true, // true car aucune matière sélectionnée
    hasCompletedWelcome: false,
    schedules: [],
    timetable: [],
    notificationSettings: { ...defaultNotificationSettings },
    notificationDismissals: {},
    absences: [],
    assessmentDates: {},
    assessmentAbsences: {},
    pedagogicalEvents: {},
    manualAssessments: {},
    removedAssessments: {},
    assessmentOrder: {},
};

export const parseStoredConfig = (storedConfig: string | null): AppConfig => {
    if (!storedConfig) {
        return {
            ...defaultConfig,
            printShowDescriptions: true,
            screenDescriptionMode: 'all',
            screenDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
            printDescriptionMode: 'all',
            printDescriptionTypes: ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
            selectedCycles: [],
            selectedSubjects: [],
            showAllCycles: false,
            showAllSubjects: true,
            hasCompletedWelcome: false,
        };
    }
    try {
        const loadedConfig = JSON.parse(storedConfig);
        const loadedPrintDescriptionMode: AppConfig['printDescriptionMode'] =
            loadedConfig.printDescriptionMode === 'all' || loadedConfig.printDescriptionMode === 'none' || loadedConfig.printDescriptionMode === 'custom'
                ? loadedConfig.printDescriptionMode
                : loadedConfig.printShowDescriptions === false ? 'none' : 'all';
        const loadedTeacherName = loadedConfig.defaultTeacherName === 'Prof Dev' ? '' : (loadedConfig.defaultTeacherName ?? '');
        return {
            ...defaultConfig,
            ...loadedConfig,
            defaultTeacherName: loadedTeacherName,
            printShowDescriptions: loadedConfig.printShowDescriptions ?? (loadedConfig.printDescriptionMode === 'none' ? false : (loadedConfig.printDescriptionMode === 'all' ? true : true)),
            screenDescriptionMode: loadedConfig.screenDescriptionMode ?? 'all',
            screenDescriptionTypes: loadedConfig.screenDescriptionTypes && loadedConfig.screenDescriptionTypes.length > 0
                ? loadedConfig.screenDescriptionTypes
                : ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
            printDescriptionMode: loadedPrintDescriptionMode,
            printDescriptionTypes: loadedConfig.printDescriptionTypes && loadedConfig.printDescriptionTypes.length > 0
                ? loadedConfig.printDescriptionTypes
                : ['définition', 'théorème', 'proposition', 'lemme', 'corollaire', 'remarque', 'preuve', 'exemple', 'exercice', 'activité', 'application'],
            selectedCycles: loadedConfig.selectedCycles ?? [],
            selectedSubjects: loadedConfig.selectedSubjects ?? [],
            showAllCycles: loadedConfig.showAllCycles ?? true,
            showAllSubjects: loadedConfig.showAllSubjects ?? true,
            hasCompletedWelcome: loadedConfig.hasCompletedWelcome ?? false,
            schedules: effectiveSchedules(loadedConfig),
            timetable: loadedConfig.timetable ?? [],
            notificationSettings: { ...defaultNotificationSettings, ...(loadedConfig.notificationSettings ?? {}) },
            notificationDismissals: loadedConfig.notificationDismissals ?? {},
            absences: loadedConfig.absences ?? [],
            assessmentDates: loadedConfig.assessmentDates ?? {},
            assessmentAbsences: loadedConfig.assessmentAbsences ?? {},
            pedagogicalEvents: loadedConfig.pedagogicalEvents ?? {},
            manualAssessments: loadedConfig.manualAssessments ?? {},
            removedAssessments: loadedConfig.removedAssessments ?? {},
            assessmentOrder: loadedConfig.assessmentOrder ?? {},
            schoolYearStart: loadedConfig.schoolYearStart,
            theme: loadedConfig.theme ?? 'light',
            contentFontLatin: loadedConfig.contentFontLatin ?? 'fira',
            contentFontArabic: loadedConfig.contentFontArabic ?? 'ibm-plex',
            applicationLocale: normalizeApplicationLocale(loadedConfig.applicationLocale),
        };
    } catch (error) {
        logger.error("Failed to parse config from localStorage", error);
        return defaultConfig;
    }
};

export const useConfigManager = () => {
    const [config, setConfig] = useImmer<AppConfig>(() => {
        if (typeof window !== 'undefined') {
            return parseStoredConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
        }
        return defaultConfig;
    });
    const [isLoading, setIsLoading] = useState(false);
    const configRef = useRef<AppConfig>(config);
    const configSourceRef = useRef(Symbol('config-manager'));

    useEffect(() => {
        configRef.current = config;
    }, [config]);

    useEffect(() => {
        try {
            const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
            if (storedConfig) {
                setConfig(parseStoredConfig(storedConfig));
            }
        } catch (error) {
            logger.error("Failed to load config from localStorage", error);
        }
    }, [setConfig]);

    // ── Rechargement quand un pull cloud a réécrit le localStorage ─────────
    useEffect(() => {
        const reload = (source?: symbol) => {
            // L'instance qui vient d'écrire possède déjà la valeur exacte en
            // mémoire. Seules les autres vues doivent relire le stockage.
            if (source === configSourceRef.current) return;
            try {
                const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
                if (stored) {
                    const loaded = JSON.parse(stored);
                    setConfig(draft => {
                        Object.assign(draft, loaded);
                        draft.schedules = effectiveSchedules(loaded);
                        draft.applicationLocale = normalizeApplicationLocale(loaded.applicationLocale);
                    });
                } else {
                    // Après une déconnexion ou une inscription, aucun réglage
                    // de l'ancien compte ne doit rester vivant en mémoire.
                    setConfig(() => ({
                        ...defaultConfig,
                        selectedCycles: [],
                        selectedSubjects: [],
                        showAllCycles: false,
                        showAllSubjects: true,
                        schedules: [],
                        timetable: [],
                        notificationSettings: { ...defaultNotificationSettings },
                        notificationDismissals: {},
                        absences: [],
                        assessmentDates: {},
                        assessmentAbsences: {},
                        pedagogicalEvents: {},
                        manualAssessments: {},
                        removedAssessments: {},
                        assessmentOrder: {},
                    }));
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
        // La persistance doit précéder l'événement `config-changed` : plusieurs
        // vues possèdent leur propre instance du hook et relisent le stockage
        // dès cet événement. Une écriture différée par React les faisait donc
        // relire l'ancienne valeur et imposait un second clic à l'utilisateur.
        const nextConfig: AppConfig = { ...configRef.current, ...newConfig };
        configRef.current = nextConfig;
        try {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
        } catch (error) {
            logger.error("Failed to save config to localStorage", error);
        }
        setConfig(() => nextConfig);
        /*
         * TOUT réglage synchronisé (emploi du temps, absences, devoirs,
         * établissement, cycles/matières, préférences d'affichage, notifications)
         * voyage avec le blob classes : la liste des clés vient de syncSettings
         * (source de vérité unique), plus aucune clé oubliée du circuit.
         */
        const touchesSyncable =
            newConfig.notificationSettings !== undefined ||
            SYNCABLE_KEYS.some(key => newConfig[key as keyof AppConfig] !== undefined);
        if (touchesSyncable) {
            touchSettingsSyncMeta();
            markClassesListDirty();
        }
        notifyConfigChanged(configSourceRef.current);
    }, [setConfig]);

    return { config, updateConfig, isLoading };
};

import React, { useState } from 'react';
import { useClassManager } from '../hooks/useClassManager';
import { useConfigManager } from '../hooks/useConfigManager';
import { ConfigModal } from './modals/ConfigModal';
import { ImportPlatformModal } from './modals/ImportPlatformModal';
import { WelcomeModal } from './modals/WelcomeModal';
import { downloadBackup, restoreBackup } from '../utils/backup';
import { logger } from '../utils/logger';
import { DashboardSkeleton } from './ui/PageSkeleton';

interface SettingsPageProps {
    onBack: () => void;
}

/**
 * Paramètres en PAGE plein écran (au lieu d'une modale) : plus structuré,
 * plus confortable, avec barre d'actions collante. Réutilise entièrement le
 * contenu (onglets Affichage / Emploi du temps / Notifications / Données /
 * Compte) via `ConfigModal asPage`.
 */
export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
    const { classes, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isImportOpen, setImportOpen] = useState(false);
    const [isWelcomeOpen, setWelcomeOpen] = useState(false);

    if (isClassesLoading || isConfigLoading) return <DashboardSkeleton />;

    const handleImport = (fileContent: string) => {
        try {
            const count = restoreBackup(JSON.parse(fileContent));
            alert(`Importation réussie (${count} classe(s)) ! L'application va se recharger.`);
            window.location.reload();
        } catch (error) {
            logger.error('Import failed', error);
            alert(`L'importation a échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
        setImportOpen(false);
    };

    return (
        <>
            <ConfigModal
                asPage
                isOpen
                onClose={onBack}
                config={config}
                onConfigChange={updateConfig}
                onExportPlatform={() => {
                    try {
                        downloadBackup();
                    } catch (error) {
                        logger.error('Export failed', error);
                        alert("L'exportation a échoué.");
                    }
                }}
                onOpenImport={() => setImportOpen(true)}
                onOpenWelcome={() => setWelcomeOpen(true)}
                classes={classes}
            />
            <ImportPlatformModal isOpen={isImportOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
            <WelcomeModal
                isOpen={isWelcomeOpen}
                onClose={() => setWelcomeOpen(false)}
                config={config}
                onConfigChange={updateConfig}
            />
        </>
    );
};

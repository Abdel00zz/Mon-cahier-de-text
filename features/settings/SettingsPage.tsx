import React, { Suspense, useCallback, useEffect, useRef, useState, lazy } from 'react';
import { ConfigModal } from './ConfigModal';
import { downloadBackup, restoreBackup } from '@/utils/backup';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { AppConfig, ClassInfo, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';

const ImportPlatformModal = lazy(() => import('./ImportPlatformModal').then(m => ({ default: m.ImportPlatformModal })));

interface SettingsPageProps {
    onBack: () => void;
    onOpenGuide: () => void;
    config: AppConfig;
    onConfigChange: (config: Partial<AppConfig>) => void;
    classes: ClassInfo[];
    addClass: (details: { name: string; subject: string; cycle?: Cycle; teacherName?: string }) => ClassInfo;
}

/** Paramètres présentés comme une sheet modale au-dessus de la vue d'origine. */
export const SettingsPage: React.FC<SettingsPageProps> = ({
    onBack,
    onOpenGuide,
    config,
    onConfigChange: updateConfig,
    classes,
    addClass,
}) => {
    const { t } = useLocale();
    const [isImportOpen, setImportOpen] = useState(false);
    const [isSheetOpen, setSheetOpen] = useState(true);
    const closeTimerRef = useRef<number | null>(null);

    const requestClose = useCallback((afterClose?: () => void) => {
        if (!isSheetOpen) return;
        setSheetOpen(false);
        closeTimerRef.current = window.setTimeout(() => {
            onBack();
            afterClose?.();
        }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
    }, [isSheetOpen, onBack]);

    useEffect(() => () => {
        if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    }, []);

    const handleImport = (fileContent: string) => {
        try {
            const count = restoreBackup(JSON.parse(fileContent));
            toast.success(t('settings.toast.importSuccess', { count }));
            setTimeout(() => window.location.reload(), 900);
        } catch (error) {
            logger.error('Import failed', error);
            toast.error(t('settings.toast.importFailed', {
                reason: error instanceof Error ? error.message : t('settings.toast.unknownError'),
            }));
        }
        setImportOpen(false);
    };

    return (
        <>
            <ConfigModal
                isOpen={isSheetOpen}
                onClose={requestClose}
                onOpenGuide={() => requestClose(onOpenGuide)}
                config={config}
                onConfigChange={updateConfig}
                onExportPlatform={() => {
                    try {
                        downloadBackup();
                        toast.success(t('settings.toast.backupDownloaded'));
                    } catch (error) {
                        logger.error('Export failed', error);
                        toast.error(t('settings.toast.exportFailed'));
                    }
                }}
                onOpenImport={() => setImportOpen(true)}
                classes={classes}
                onCreateClass={details =>
                    addClass({
                        ...details,
                        cycle: details.cycle ?? (config.selectedCycles?.[0] as Cycle) ?? 'lycee',
                        teacherName: config.defaultTeacherName || t('settings.defaultTeacherName'),
                    })
                }
            />
            {isImportOpen && (
                <Suspense fallback={null}>
                    <ImportPlatformModal isOpen={isImportOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
                </Suspense>
            )}
        </>
    );
};

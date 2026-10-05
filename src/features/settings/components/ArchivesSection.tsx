import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    ArchiveMeta,
    createArchive,
    currentYearLabel,
    deleteArchive,
    downloadArchive,
    listArchives,
} from '@/infrastructure/storage/archives';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Download, Trash2, CalendarCheck, FolderArchive } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { AppConfig } from '@/types';
import { SettingsRow, SettingsSection, settingsButtonClass } from './SettingsPrimitives';

/**
 * Paramètres ▸ Données ▸ Archives des années scolaires.
 * Fige l'état complet de l'année (config + cahiers + journaux) sous une
 * étiquette d'année ; les archives restent consultables, téléchargeables
 * (format ré-importable) et supprimables, la mémoire des années passées.
 */
export const ArchivesSection: React.FC<Pick<AppConfig, 'schoolYearStart'>> = ({ schoolYearStart }) => {
    const { locale, t } = useLocale();
    const { impact } = useHapticFeedback();
    const [archives, setArchives] = useState<ArchiveMeta[]>(() => listArchives());
    const [pendingDelete, setPendingDelete] = useState<ArchiveMeta | null>(null);
    const yearLabel = currentYearLabel(schoolYearStart);

    const refresh = () => setArchives(listArchives());

    const handleCreate = () => {
        impact('medium');
        const meta = createArchive(yearLabel);
        if (meta) {
            toast.success(t('archives.created', { year: meta.yearLabel, count: meta.classCount, plural: meta.classCount > 1 && locale !== 'ar' ? 's' : '' }));
            refresh();
        } else {
            toast.error(t('archives.storageError'));
        }
    };

    const handleDelete = (meta: ArchiveMeta) => {
        deleteArchive(meta.id);
        refresh();
        toast.success(t('archives.deleted'));
    };

    const formatSize = (bytes: number) => {
        const megabytes = bytes / 1_000_000;
        const value = bytes > 1_000_000
            ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(megabytes)
            : new Intl.NumberFormat(locale).format(Math.max(1, Math.round(bytes / 1000)));
        return t(bytes > 1_000_000 ? 'archives.sizeMb' : 'archives.sizeKb', { value });
    };

    const formatClassCount = (count: number) => t(
        count === 1 ? 'archives.classCount.one' : count === 2 ? 'archives.classCount.two' : 'archives.classCount.many',
        { count },
    );

    return (
        <>
            <SettingsSection
                title={t('archives.title')}
                hint={t('archives.description')}
                action={
                    <button type="button" onClick={handleCreate} className={settingsButtonClass}>
                        <CalendarCheck className="h-[18px] w-[18px] stroke-[1.5]" />
                        <span>{t('archives.action', { year: yearLabel })}</span>
                    </button>
                }
            >
                {archives.length > 0 ? archives.map(meta => (
                    <SettingsRow
                        key={meta.id}
                        label={t('archives.year', { year: meta.yearLabel })}
                        hint={`${formatClassCount(meta.classCount)} · ${formatSize(meta.bytes)} · ${new Date(meta.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                impact('light');
                                if (!downloadArchive(meta)) toast.error(t('archives.missing'));
                            }}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            title={t('archives.download')}
                            aria-label={t('archives.download')}
                        >
                            <Download className="h-[18px] w-[18px] stroke-[1.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                impact('light');
                                setPendingDelete(meta);
                            }}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            title={t('archives.delete')}
                            aria-label={t('archives.delete')}
                        >
                            <Trash2 className="h-[18px] w-[18px] stroke-[1.5]" />
                        </button>
                    </SettingsRow>
                )) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <FolderArchive className="h-7 w-7 stroke-[1.5] text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                            {locale === 'ar' ? 'لا توجد أرشيفات بعد' : 'Aucune archive pour l’instant'}
                        </p>
                        <p className="max-w-sm text-[13px] leading-snug text-muted-foreground">
                            {locale === 'ar'
                                ? 'أرشف السنة الحالية للاحتفاظ بدروسك وسجلاتك.'
                                : 'Archivez l’année en cours pour garder vos cours et journaux.'}
                        </p>
                    </div>
                )}
            </SettingsSection>
            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
                title={pendingDelete ? t('archives.deleteTitle', { year: pendingDelete.yearLabel }) : ''}
                description={t('archives.deleteDescription')}
                confirmLabel={t('archives.delete')}
                onConfirm={() => { if (pendingDelete) handleDelete(pendingDelete); }}
            />
        </>
    );
};

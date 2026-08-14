import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    ArchiveMeta,
    createArchive,
    currentYearLabel,
    deleteArchive,
    downloadArchive,
    listArchives,
} from '@/utils/archives';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Download, Trash2, CalendarCheck } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import type { AppConfig } from '@/types';

/**
 * Paramètres ▸ Données ▸ Archives des années scolaires.
 * Fige l'état complet de l'année (config + cahiers + journaux) sous une
 * étiquette d'année ; les archives restent consultables, téléchargeables
 * (format ré-importable) et supprimables, la mémoire des années passées.
 */
export const ArchivesSection: React.FC<Pick<AppConfig, 'schoolYearStart'>> = ({ schoolYearStart }) => {
    const { locale, t } = useLocale();
    const [archives, setArchives] = useState<ArchiveMeta[]>(() => listArchives());
    const [pendingDelete, setPendingDelete] = useState<ArchiveMeta | null>(null);
    const yearLabel = currentYearLabel(schoolYearStart);

    const refresh = () => setArchives(listArchives());

    const handleCreate = () => {
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
        <div className="rounded-2xl border border-border/70 bg-card/65 p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/50">
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground">{t('archives.title')}</h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t('archives.description')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreate}
                    className="h-9.5 shrink-0 rounded-xl border-primary/30 bg-primary/10 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-2xs"
                >
                    <CalendarCheck className="h-4 w-4" /> {t('archives.action', { year: yearLabel })}
                </Button>
            </div>

            {archives.length > 0 ? (
                <ul className="mt-3.5 space-y-2">
                    {archives.map(meta => (
                        <li
                            key={meta.id}
                            className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 shadow-2xs"
                        >
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-foreground">{t('archives.year', { year: meta.yearLabel })}</span>
                                <span className="ms-2 text-[11px] font-medium text-muted-foreground">
                                    {formatClassCount(meta.classCount)} · {formatSize(meta.bytes)} ·{' '}
                                    {new Date(meta.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!downloadArchive(meta)) toast.error(t('archives.missing'));
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary cursor-pointer"
                                    title={t('archives.download')}
                                    aria-label={t('archives.download')}
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPendingDelete(meta)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                    title={t('archives.delete')}
                                    aria-label={t('archives.delete')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
                title={pendingDelete ? t('archives.deleteTitle', { year: pendingDelete.yearLabel }) : ''}
                description={t('archives.deleteDescription')}
                confirmLabel={t('archives.delete')}
                onConfirm={() => { if (pendingDelete) handleDelete(pendingDelete); }}
            />
        </div>
    );
};

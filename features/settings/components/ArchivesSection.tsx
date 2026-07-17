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

/**
 * Paramètres ▸ Données ▸ Archives des années scolaires.
 * Fige l'état complet de l'année (config + cahiers + journaux) sous une
 * étiquette d'année ; les archives restent consultables, téléchargeables
 * (format ré-importable) et supprimables — la mémoire des années passées.
 */
export const ArchivesSection: React.FC = () => {
    const { locale, t } = useLocale();
    const [archives, setArchives] = useState<ArchiveMeta[]>(() => listArchives());
    const [pendingDelete, setPendingDelete] = useState<ArchiveMeta | null>(null);
    const yearLabel = currentYearLabel();

    const refresh = () => setArchives(listArchives());

    const handleCreate = () => {
        const meta = createArchive(yearLabel);
        if (meta) {
            toast.success(t('archives.created', { year: meta.yearLabel, count: meta.classCount, plural: meta.classCount > 1 && locale !== 'ar' ? 's' : '' }));
            refresh();
        } else {
            toast.error(
                'Stockage local insuffisant pour conserver cette archive sur l\'appareil — téléchargez plutôt une sauvegarde totale.'
            );
        }
    };

    const handleDelete = (meta: ArchiveMeta) => {
        deleteArchive(meta.id);
        refresh();
        toast.success(t('archives.deleted'));
    };

    const formatSize = (bytes: number) =>
        bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1000))} Ko`;

    return (
        <div className="mt-4 rounded-2xl border border-border/80 bg-secondary/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="mb-1.5 text-sm font-bold text-foreground font-display">{t('archives.title')}</h4>
                    <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                        {t('archives.description')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreate}
                    className="h-10 shrink-0 rounded-full border-border text-xs text-primary transition-all hover:bg-primary hover:text-white"
                >
                    <CalendarCheck className="mr-1.5 h-4 w-4" /> {t('archives.action', { year: yearLabel })}
                </Button>
            </div>

            {archives.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                    {archives.map(meta => (
                        <li
                            key={meta.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/70 px-3 py-2"
                        >
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-foreground font-display">{t('archives.year', { year: meta.yearLabel })}</span>
                                <span className="ml-2 text-[10px] font-semibold text-muted-foreground/60 font-mono">
                                    {meta.classCount} classe(s) · {formatSize(meta.bytes)} ·{' '}
                                    {new Date(meta.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!downloadArchive(meta)) toast.error(t('archives.missing'));
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                                    title={t('archives.download')}
                                    aria-label={t('archives.download')}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPendingDelete(meta)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    title={t('archives.delete')}
                                    aria-label={t('archives.delete')}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

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

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
import { motion, useReducedMotion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { AppConfig } from '@/types';

/**
 * Paramètres ▸ Données ▸ Archives des années scolaires.
 * Fige l'état complet de l'année (config + cahiers + journaux) sous une
 * étiquette d'année ; les archives restent consultables, téléchargeables
 * (format ré-importable) et supprimables, la mémoire des années passées.
 */
export const ArchivesSection: React.FC<Pick<AppConfig, 'schoolYearStart'>> = ({ schoolYearStart }) => {
    const { locale, t } = useLocale();
    const { impact } = useHapticFeedback();
  const reducedMotion = useReducedMotion();
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
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground">{t('archives.title')}</h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t('archives.description')}
                    </p>
                </div>
                <motion.button
                    type="button"
                    onClick={handleCreate}
                    whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                    whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-xs select-none"
                >
                    <CalendarCheck className="h-4 w-4 stroke-[2.2]" />
                    <span>{t('archives.action', { year: yearLabel })}</span>
                </motion.button>
            </div>

            {archives.length > 0 ? (
                <ul className="space-y-2">
                    {archives.map(meta => (
                        <li
                            key={meta.id}
                            className="settings-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border/60 bg-background/80"
                        >
                            <div className="min-w-0">
                                <span className="text-xs sm:text-sm font-bold text-foreground">{t('archives.year', { year: meta.yearLabel })}</span>
                                <span className="ms-2 text-[11px] font-medium text-muted-foreground">
                                    {formatClassCount(meta.classCount)} · {formatSize(meta.bytes)} ·{' '}
                                    {new Date(meta.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <motion.button
                                    type="button"
                                    whileTap={reducedMotion ? undefined : { scale: 0.90 }}
                                    onClick={() => {
                                        impact('light');
                                        if (!downloadArchive(meta)) toast.error(t('archives.missing'));
                                    }}
                                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer shadow-2xs"
                                    title={t('archives.download')}
                                    aria-label={t('archives.download')}
                                >
                                    <Download className="h-4.5 w-4.5 stroke-[2]" />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    whileTap={reducedMotion ? undefined : { scale: 0.90 }}
                                    onClick={() => {
                                        impact('light');
                                        setPendingDelete(meta);
                                    }}
                                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive cursor-pointer shadow-2xs"
                                    title={t('archives.delete')}
                                    aria-label={t('archives.delete')}
                                >
                                    <Trash2 className="h-4.5 w-4.5 stroke-[2]" />
                                </motion.button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center py-7 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/20">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground border border-border/70 mb-3 shadow-2xs">
                        <FolderArchive className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                        {locale === 'ar' ? 'لا توجد سنوات مؤرشفة حالياً' : 'Aucune archive pour l’instant'}
                    </p>
                    <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground/80 max-w-sm leading-relaxed">
                        {locale === 'ar'
                            ? 'يمكنك أرشفة وحفظ الحالة الكاملة للسنة الدراسية الحالية بنقرة زر واحدة.'
                            : 'Figez l’état complet de l’année scolaire courante pour conserver l’historique de vos cours et journaux.'}
                    </p>
                </div>
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

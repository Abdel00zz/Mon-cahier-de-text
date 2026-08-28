import React, { useEffect, useRef, useState } from 'react';
import { AppConfig, TopLevelItem } from '@/types';
import { Modal } from '@/components/ui/modal';
import { ArrowDown, ArrowUp, ChevronDown, FolderOpen, Trash2, TriangleAlert } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MathText } from '@/components/ui/math-text';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { DescriptionVisibilityControl, DescriptionMode } from '@/features/settings/components/DescriptionVisibilityControl';
import { useLocale } from '@/i18n/LocaleProvider';

interface ManageLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (lessons: TopLevelItem[]) => void;
  lessons: TopLevelItem[];
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
}

interface PendingDelete {
  index: number;
  item: TopLevelItem;
  nestedCount: number;
}

const countNestedContents = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 0;
  const node = value as Record<string, unknown>;
  return ['sections', 'subsections', 'subsubsections', 'items'].reduce((total, key) => {
    const children = node[key];
    if (!Array.isArray(children)) return total;
    return total + children.reduce((sum, child) => sum + 1 + countNestedContents(child), 0);
  }, 0);
};

export const ManageLessonsModal: React.FC<ManageLessonsModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  lessons,
  config,
  onConfigChange,
}) => {
  const { t } = useLocale();
  const [localLessons, setLocalLessons] = useState<TopLevelItem[]>([]);
  const [localDesc, setLocalDesc] = useState<{ mode: DescriptionMode; types: string[] }>({ mode: 'all', types: [] });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const stableKeys = useRef(new WeakMap<TopLevelItem, string>());

  useEffect(() => {
    if (!isOpen) return;
    setLocalLessons([...lessons]);
    setLocalDesc({
      mode: config.screenDescriptionMode ?? 'all',
      types: config.screenDescriptionTypes ?? [],
    });
    setPendingDelete(null);
  }, [isOpen, lessons, config.screenDescriptionMode, config.screenDescriptionTypes]);

  const lessonsChanged = localLessons.length !== lessons.length
    || localLessons.some((item, index) => item !== lessons[index]);
  const descriptionsChanged = localDesc.mode !== (config.screenDescriptionMode ?? 'all')
    || localDesc.types.length !== (config.screenDescriptionTypes ?? []).length
    || localDesc.types.some(type => !(config.screenDescriptionTypes ?? []).includes(type));
  const hasChanges = lessonsChanged || descriptionsChanged;

  const itemKey = (item: TopLevelItem): string => {
    if (item._tempId) return item._tempId;
    const existing = stableKeys.current.get(item);
    if (existing) return existing;
    const key = crypto.randomUUID();
    stableKeys.current.set(item, key);
    return key;
  };

  const requestDelete = (index: number) => {
    const item = localLessons[index];
    if (!item) return;
    setPendingDelete({ index, item, nestedCount: countNestedContents(item) });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setLocalLessons(current => current.filter((_, index) => index !== pendingDelete.index));
    setPendingDelete(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setLocalLessons(current => {
      const copy = [...current];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === localLessons.length - 1) return;
    setLocalLessons(current => {
      const copy = [...current];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleSubmit = () => {
    if (descriptionsChanged) {
      onConfigChange({ screenDescriptionMode: localDesc.mode, screenDescriptionTypes: localDesc.types });
    }
    if (lessonsChanged) {
      onUpdate(localLessons);
      return;
    }
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <FolderOpen className="h-5 w-5 stroke-[2.2]" />
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {t('manageLessons.title')}
            </span>
          </div>
        }
        description={t('manageLessons.description')}
        maxWidth="2xl"
        className="sm:max-w-3xl sm:rounded-[32px]"
        headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
        footer={(
          <div className="flex w-full items-center justify-end gap-2.5">
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges}
              className="rounded-xl bg-primary px-5 h-10 text-xs sm:text-sm font-bold shadow-sm hover:bg-primary/90 text-primary-foreground"
            >
              {t('common.save')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <details open className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-xs font-bold text-foreground transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                {t('manageLessons.descriptionSettings')}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 stroke-[2.2]" aria-hidden />
            </summary>
            <DescriptionVisibilityControl
              context="screen"
              mode={localDesc.mode}
              types={localDesc.types}
              onChange={setLocalDesc}
              className="border-0 border-t border-border/60 bg-transparent p-4 shadow-none"
            />
          </details>

          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/40 px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-foreground sm:text-sm">{t('manageLessons.contents')}</h3>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-muted-foreground">
                  {t('manageLessons.orderHint')}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 font-mono text-[10px] font-bold text-muted-foreground">
                {t('manageLessons.itemsCount', { count: localLessons.length })}
              </span>
            </div>

            {localLessons.length > 0 ? (
              <ul className="space-y-2 p-3">
                {localLessons.map((item, index) => {
                  const itemConfig = TOP_LEVEL_TYPE_CONFIG[item.type];
                  const nestedCount = countNestedContents(item);

                  if (!itemConfig) {
                    return (
                      <li key={itemKey(item)} className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                        <TriangleAlert className="h-4 w-4 shrink-0 text-rose-600 stroke-[2.2]" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-rose-800 dark:text-rose-200">
                          {t('manageLessons.corrupted', { title: item.title })}
                        </span>
                        <Button type="button" variant="destructive" onClick={() => requestDelete(index)} className="h-9 w-9 rounded-xl p-0" title={t('manageLessons.delete')}>
                          <Trash2 className="h-3.5 w-3.5 stroke-[2.2]" />
                        </Button>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={itemKey(item)}
                      className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 shadow-2xs transition-all hover:border-border hover:shadow-xs"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60">
                        <itemConfig.icon className={`${itemConfig.color} h-4.5 w-4.5 stroke-[2.2]`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-foreground">
                          <MathText source={item.title} inline>{item.title || t('manageLessons.untitled')}</MathText>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                          {t(`manageLessons.type.${item.type}`)}{nestedCount > 0 ? ` · ${t('manageLessons.nestedCount', { count: nestedCount })}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="flex overflow-hidden rounded-xl border border-border/80 bg-muted/30">
                          <Button type="button" variant="ghost" disabled={index === 0} onClick={() => moveUp(index)} className="h-9 w-9 rounded-none border-0 p-0 hover:bg-muted disabled:opacity-25" title={t('manageLessons.moveUp')} aria-label={t('manageLessons.moveUp')}>
                            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground stroke-[2.2]" />
                          </Button>
                          <Button type="button" variant="ghost" disabled={index === localLessons.length - 1} onClick={() => moveDown(index)} className="h-9 w-9 rounded-none border-0 border-s border-border/80 p-0 hover:bg-muted disabled:opacity-25" title={t('manageLessons.moveDown')} aria-label={t('manageLessons.moveDown')}>
                            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground stroke-[2.2]" />
                          </Button>
                        </span>
                        <Button type="button" variant="ghost" onClick={() => requestDelete(index)} className="h-9 w-9 rounded-xl border border-border/80 bg-background p-0 text-muted-foreground hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title={t('manageLessons.delete')} aria-label={t('manageLessons.delete')}>
                          <Trash2 className="h-3.5 w-3.5 stroke-[2.2]" />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="m-3 rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
                <FolderOpen className="mx-auto mb-2 h-5 w-5 text-muted-foreground stroke-[2.2]" />
                <p className="text-xs font-bold text-foreground">{t('manageLessons.emptyTitle')}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">{t('manageLessons.emptyHint')}</p>
              </div>
            )}
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={open => { if (!open) setPendingDelete(null); }}
        title={t('manageLessons.deleteTitle')}
        description={pendingDelete
          ? t(pendingDelete.nestedCount > 0 ? 'manageLessons.deleteDescription' : 'manageLessons.deleteDescriptionEmpty', {
              title: pendingDelete.item.title || t('manageLessons.untitled'),
              count: pendingDelete.nestedCount,
            })
          : ''}
        confirmLabel={t('manageLessons.deleteConfirm')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
};

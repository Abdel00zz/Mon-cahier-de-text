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
        title={t('manageLessons.title')}
        description={t('manageLessons.description')}
        maxWidth="xl"
        bodyClassName="bg-card"
        footerClassName="bg-card"
        footer={(
          <>
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-lg">
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges}
              className="rounded-lg bg-primary px-5 font-semibold shadow-sm hover:bg-primary/90"
            >
              {t('common.save')}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <details open className="group overflow-hidden rounded-xl border border-border bg-muted/55">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-card px-3.5 py-2.5 text-xs font-bold text-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                {t('manageLessons.descriptionSettings')}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <DescriptionVisibilityControl
              context="screen"
              mode={localDesc.mode}
              types={localDesc.types}
              onChange={setLocalDesc}
              className="border-0 border-t border-border bg-transparent p-3 shadow-none"
            />
          </details>

          <section className="overflow-hidden rounded-xl border border-border bg-muted/55">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">{t('manageLessons.contents')}</h3>
                <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-muted-foreground">
                  {t('manageLessons.orderHint')}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-bold text-muted-foreground">
                {t('manageLessons.itemsCount', { count: localLessons.length })}
              </span>
            </div>

            {localLessons.length > 0 ? (
              <ul className="space-y-2 p-2 sm:p-3">
                {localLessons.map((item, index) => {
                  const itemConfig = TOP_LEVEL_TYPE_CONFIG[item.type];
                  const nestedCount = countNestedContents(item);

                  if (!itemConfig) {
                    return (
                      <li key={itemKey(item)} className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                        <TriangleAlert className="h-4 w-4 shrink-0 text-rose-600" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-rose-800">
                          {t('manageLessons.corrupted', { title: item.title })}
                        </span>
                        <Button type="button" variant="destructive" onClick={() => requestDelete(index)} className="h-10 w-10 rounded-lg p-0 sm:h-9 sm:w-9" title={t('manageLessons.delete')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={itemKey(item)}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 shadow-xs transition-colors hover:border-border sm:px-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted">
                        <itemConfig.icon className={`${itemConfig.color} h-4 w-4`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          <MathText source={item.title} inline>{item.title || t('manageLessons.untitled')}</MathText>
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] font-medium text-muted-foreground">
                          {t(`manageLessons.type.${item.type}`)}{nestedCount > 0 ? ` · ${t('manageLessons.nestedCount', { count: nestedCount })}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="flex overflow-hidden rounded-lg border border-border bg-card">
                          <Button type="button" variant="ghost" disabled={index === 0} onClick={() => moveUp(index)} className="h-11 w-9 rounded-none border-0 p-0 hover:bg-muted disabled:opacity-25 sm:h-10 sm:w-10" title={t('manageLessons.moveUp')} aria-label={t('manageLessons.moveUp')}>
                            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button type="button" variant="ghost" disabled={index === localLessons.length - 1} onClick={() => moveDown(index)} className="h-11 w-9 rounded-none border-0 border-s border-border p-0 hover:bg-muted disabled:opacity-25 sm:h-10 sm:w-10" title={t('manageLessons.moveDown')} aria-label={t('manageLessons.moveDown')}>
                            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </span>
                        <Button type="button" variant="ghost" onClick={() => requestDelete(index)} className="h-11 w-9 rounded-lg border border-border bg-card p-0 text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:h-10 sm:w-10" title={t('manageLessons.delete')} aria-label={t('manageLessons.delete')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="m-3 rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
                <FolderOpen className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
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

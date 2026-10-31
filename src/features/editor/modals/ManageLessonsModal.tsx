import React, { useEffect, useRef, useState } from 'react';
import { dequal } from 'dequal';
import { sumBy } from 'es-toolkit';
import { AppConfig, type ContentNumbering, TopLevelItem } from '@/types';
import { Modal } from '@/components/ui/modal';
import { ChevronDown, ChevronUp, Eye, FolderTree, Hash, Layers, TriangleAlert } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MathText } from '@/components/ui/math-text';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { DescriptionVisibilityControl, DescriptionMode } from '@/features/settings/components/DescriptionVisibilityControl';
import { Switch } from '@/components/ui/switch';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
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
  return sumBy(['sections', 'subsections', 'subsubsections', 'items'], key => {
    const children = node[key];
    if (!Array.isArray(children)) return 0;
    return sumBy(children, child => 1 + countNestedContents(child));
  });
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
  const [localNumbering, setLocalNumbering] = useState<ContentNumbering>({ enabled: true });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const stableKeys = useRef(new WeakMap<TopLevelItem, string>());

  useEffect(() => {
    if (!isOpen) return;
    setLocalLessons([...lessons]);
    setLocalDesc({
      mode: config.screenDescriptionMode ?? 'all',
      types: config.screenDescriptionTypes ?? [],
    });
    setLocalNumbering(config.contentNumbering ?? { enabled: true });
    setPendingDelete(null);
  }, [isOpen, lessons, config.screenDescriptionMode, config.screenDescriptionTypes, config.contentNumbering]);

  const lessonsChanged = localLessons.length !== lessons.length
    || localLessons.some((item, index) => item !== lessons[index]);
  const descriptionsChanged = !dequal(localDesc, {
    mode: config.screenDescriptionMode ?? 'all',
    types: config.screenDescriptionTypes ?? [],
  });
  const numberingChanged = !dequal(localNumbering, config.contentNumbering ?? { enabled: true });
  const hasChanges = lessonsChanged || descriptionsChanged || numberingChanged;

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
    if (numberingChanged) {
      onConfigChange({ contentNumbering: localNumbering });
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Layers className="h-5 w-5 stroke-[2.2]" />
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {t('manageLessons.title')}
            </span>
          </div>
        }
        maxWidth="2xl"
        className="sm:max-w-3xl sm:rounded-2xl"
        headerClassName="border-b-0 bg-background"
        bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
        footerClassName="border-t-0 bg-background"
        footer={(
          <div className="flex w-full items-center justify-end gap-2.5">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm transition-transform active:scale-95"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges}
              className="rounded-xl bg-primary px-5 h-10 text-xs sm:text-sm font-bold shadow-sm hover:bg-primary/90 text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
            >
              {t('common.save')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-xs">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                  <Hash className="h-4.5 w-4.5 stroke-[2.2]" />
                </span>
                <div className="min-w-0">
                  <label htmlFor="contentNumberingSwitch" className="text-xs font-bold text-foreground sm:text-sm cursor-pointer select-none">
                    {t('manageLessons.numbering.title')}
                  </label>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-muted-foreground">
                    {t('manageLessons.numbering.hint')}
                  </p>
                </div>
              </div>
              <Switch
                id="contentNumberingSwitch"
                checked={localNumbering.enabled}
                onCheckedChange={enabled => setLocalNumbering(current => ({ ...current, enabled }))}
                aria-label={t('manageLessons.numbering.title')}
              />
            </div>
            {localNumbering.enabled && (
              <div className="grid gap-3.5 border-t border-border/60 bg-muted/20 px-4 py-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>{t('manageLessons.numbering.structure')}</span>
                  <div className="relative">
                    <select
                      className="h-10 w-full appearance-none rounded-xl border border-border/80 bg-background hover:bg-muted/30 pl-3 pr-8 text-xs font-medium text-foreground transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
                      value={localNumbering.structureStyle ?? 'legacy'}
                      onChange={event => setLocalNumbering(current => ({ ...current, structureStyle: event.target.value as ContentNumbering['structureStyle'] }))}
                    >
                      <option value="legacy">A · 1 · i</option>
                      <option value="decimal">1 · 1.1 · 1.1.1</option>
                      <option value="roman">I · I.1 · I.1.1</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-[2.2]" aria-hidden />
                  </div>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>{t('manageLessons.numbering.badges')}</span>
                  <div className="relative">
                    <select
                      className="h-10 w-full appearance-none rounded-xl border border-border/80 bg-background hover:bg-muted/30 pl-3 pr-8 text-xs font-medium text-foreground transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
                      value={localNumbering.badgeStyle ?? 'decimal'}
                      onChange={event => setLocalNumbering(current => ({ ...current, badgeStyle: event.target.value as ContentNumbering['badgeStyle'] }))}
                    >
                      <option value="decimal">1, 2, 3…</option>
                      <option value="roman">I, II, III…</option>
                      <option value="hierarchical">1.1, 1.2, 2.1…</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-[2.2]" aria-hidden />
                  </div>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>{t('manageLessons.numbering.scope')}</span>
                  <div className="relative">
                    <select
                      className="h-10 w-full appearance-none rounded-xl border border-border/80 bg-background hover:bg-muted/30 pl-3 pr-8 text-xs font-medium text-foreground transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
                      value={localNumbering.scope ?? 'chapter'}
                      onChange={event => setLocalNumbering(current => ({ ...current, scope: event.target.value as ContentNumbering['scope'] }))}
                    >
                      <option value="chapter">{t('manageLessons.numbering.chapter')}</option>
                      <option value="section">{t('manageLessons.numbering.section')}</option>
                      <option value="document">{t('manageLessons.numbering.document')}</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-[2.2]" aria-hidden />
                  </div>
                </label>
              </div>
            )}
          </section>

          <details open className="group overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 text-xs font-bold text-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
                  <Eye className="h-4.5 w-4.5 stroke-[2.2]" />
                </span>
                <span className="text-xs font-bold text-foreground sm:text-sm">
                  {t('descriptionVisibility.screen.title')}
                </span>
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-transform duration-200 group-open:rotate-180">
                <ChevronDown className="h-4 w-4 stroke-[2.2]" aria-hidden />
              </span>
            </summary>
            <DescriptionVisibilityControl
              context="screen"
              mode={localDesc.mode}
              types={localDesc.types}
              onChange={setLocalDesc}
              hideTitle
              className="border-0 border-t border-border/60 bg-transparent p-4 shadow-none"
            />
          </details>

          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/30 px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                  <FolderTree className="h-4.5 w-4.5 stroke-[2.2]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground sm:text-sm">{t('manageLessons.contents')}</h3>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-muted-foreground">
                    {t('manageLessons.orderHint')}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-border/70 bg-muted/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                {localLessons.length === 1
                  ? t('manageLessons.itemsCountOne', { count: 1 })
                  : localLessons.length === 2
                    ? t('manageLessons.itemsCountTwo', { count: 2 })
                    : t('manageLessons.itemsCount', { count: localLessons.length })}
              </span>
            </div>

            {localLessons.length > 0 ? (
              <ul className="space-y-2 p-3 sm:p-4">
                {localLessons.map((item, index) => {
                  const itemConfig = item.type === 'free'
                    ? { icon: Layers, color: 'text-primary' }
                    : TOP_LEVEL_TYPE_CONFIG[item.type];
                  const nestedCount = countNestedContents(item);

                  if (!itemConfig) {
                    return (
                      <li key={itemKey(item)} className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                        <TriangleAlert className="h-4 w-4 shrink-0 text-rose-600 stroke-[2.2]" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-rose-800 dark:text-rose-200">
                          {t('manageLessons.corrupted', { title: item.title })}
                        </span>
                        <AnimatedTrashButton
                          iconOnly
                          size="sm"
                          variant="destructive"
                          onClick={() => requestDelete(index)}
                          className="h-9 w-9 rounded-xl p-0"
                          title={t('manageLessons.delete')}
                          aria-label={t('manageLessons.delete')}
                        />
                      </li>
                    );
                  }

                  return (
                    <li
                      key={itemKey(item)}
                      className="group/item flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-background/90 p-3 shadow-2xs transition-all hover:border-border hover:shadow-xs"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 shadow-2xs">
                        <itemConfig.icon className={`${itemConfig.color} h-4.5 w-4.5 stroke-[2.2]`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span dir="auto" className="block break-words text-start text-xs sm:text-sm font-semibold text-foreground">
                          <MathText source={item.title} inline>{item.title || t('manageLessons.untitled')}</MathText>
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-muted-foreground">
                          {t(item.type === 'free' ? 'addContent.free' : `manageLessons.type.${item.type}`)}{nestedCount > 0 ? ` · ${t('manageLessons.nestedCount', { count: nestedCount })}` : ''}
                        </span>
                      </span>
                      <span className="flex w-full shrink-0 items-center justify-end gap-1.5 border-t border-border/50 pt-2 sm:w-auto sm:border-0 sm:pt-0">
                        <div className="flex items-center rounded-xl border border-border/70 bg-muted/40 p-0.5 shadow-2xs">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveUp(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-background hover:text-foreground hover:shadow-2xs active:scale-90 disabled:pointer-events-none disabled:opacity-25"
                            title={t('manageLessons.moveUp')}
                            aria-label={t('manageLessons.moveUp')}
                          >
                            <ChevronUp className="h-4 w-4 stroke-[2.4]" />
                          </button>
                          <button
                            type="button"
                            disabled={index === localLessons.length - 1}
                            onClick={() => moveDown(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-background hover:text-foreground hover:shadow-2xs active:scale-90 disabled:pointer-events-none disabled:opacity-25"
                            title={t('manageLessons.moveDown')}
                            aria-label={t('manageLessons.moveDown')}
                          >
                            <ChevronDown className="h-4 w-4 stroke-[2.4]" />
                          </button>
                        </div>
                        <AnimatedTrashButton
                          iconOnly
                          size="sm"
                          variant="icon"
                          onClick={() => requestDelete(index)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 active:scale-90 shadow-2xs"
                          title={t('manageLessons.delete')}
                          aria-label={t('manageLessons.delete')}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="m-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground/80 shadow-2xs">
                  <Layers className="h-6 w-6 stroke-[1.8]" />
                </div>
                <p className="text-xs font-bold text-foreground sm:text-sm">{t('manageLessons.emptyTitle')}</p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">{t('manageLessons.emptyHint')}</p>
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

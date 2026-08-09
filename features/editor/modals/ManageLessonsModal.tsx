import React, { useEffect, useRef, useState } from 'react';
import { AppConfig, TopLevelItem } from '@/types';
import { Modal } from '@/components/ui/modal';
import { ArrowDown, ArrowUp, Book, FolderOpen, Plus, Trash2, TriangleAlert } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [chapterTitle, setChapterTitle] = useState('');
  const [createError, setCreateError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const stableKeys = useRef(new WeakMap<TopLevelItem, string>());

  useEffect(() => {
    if (!isOpen) return;
    setLocalLessons([...lessons]);
    setLocalDesc({
      mode: config.screenDescriptionMode ?? 'all',
      types: config.screenDescriptionTypes ?? [],
    });
    setChapterTitle('');
    setCreateError('');
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

  const addChapter = (event: React.FormEvent) => {
    event.preventDefault();
    const title = chapterTitle.trim();
    if (!title) {
      setCreateError(t('manageLessons.chapterRequired'));
      return;
    }
    const duplicate = localLessons.some(item => item.type === 'chapter' && item.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase());
    if (duplicate) {
      setCreateError(t('manageLessons.chapterDuplicate'));
      return;
    }

    setLocalLessons(current => [
      ...current,
      { type: 'chapter', title, sections: [], _tempId: crypto.randomUUID() },
    ]);
    setChapterTitle('');
    setCreateError('');
    window.requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
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
        bodyClassName="bg-white"
        footerClassName="bg-white"
        footer={(
          <>
            <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges}
              className="rounded-xl bg-primary px-5 font-semibold shadow-sm hover:bg-primary/90"
            >
              {t('common.save')}
            </Button>
          </>
        )}
      >
        <div className="space-y-5">
          <section className="rounded-xl border border-zinc-200/70 bg-zinc-50/65 p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-primary shadow-xs">
                <Book className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-800">{t('manageLessons.createTitle')}</h3>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-zinc-500">{t('manageLessons.createHint')}</p>
              </div>
            </div>
            <form onSubmit={addChapter} className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <Input
                  value={chapterTitle}
                  onChange={event => {
                    setChapterTitle(event.target.value);
                    if (createError) setCreateError('');
                  }}
                  maxLength={160}
                  placeholder={t('manageLessons.chapterPlaceholder')}
                  aria-label={t('manageLessons.chapterPlaceholder')}
                  aria-invalid={!!createError}
                  className="h-11 rounded-lg border-zinc-200 bg-white text-sm"
                />
                {createError && <p className="mt-1.5 text-[10px] font-semibold text-rose-600" role="alert">{createError}</p>}
              </div>
              <Button type="submit" disabled={!chapterTitle.trim()} className="h-11 shrink-0 rounded-lg px-4 font-semibold sm:min-w-28">
                <Plus className="h-3.5 w-3.5" />
                {t('manageLessons.addChapter')}
              </Button>
            </form>
          </section>

          <details className="group rounded-xl border border-zinc-200/60 bg-zinc-50/65 px-3 py-2.5">
            <summary className="cursor-pointer text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-800">
              {t('manageLessons.descriptionSettings')}
            </summary>
            <DescriptionVisibilityControl
              context="screen"
              mode={localDesc.mode}
              types={localDesc.types}
              onChange={setLocalDesc}
              className="mt-3 border-0 bg-transparent p-0 shadow-none"
            />
          </details>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
              <h3 className="font-mono text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">
                {t('manageLessons.contents')}
              </h3>
              <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-[9px] font-bold text-zinc-500">
                {localLessons.length}
              </span>
            </div>

            {localLessons.length > 0 ? (
              <ul className="space-y-2">
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
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-xs transition-colors hover:border-zinc-300 hover:bg-zinc-50/60"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50">
                        <itemConfig.icon className={`${itemConfig.color} h-4 w-4`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-zinc-800">
                          <MathText source={item.title} inline>{item.title || t('manageLessons.untitled')}</MathText>
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] font-medium text-zinc-400">
                          {t(`manageLessons.type.${item.type}`)}{nestedCount > 0 ? ` · ${t('manageLessons.nestedCount', { count: nestedCount })}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Button type="button" variant="ghost" disabled={index === 0} onClick={() => moveUp(index)} className="h-11 w-10 rounded-lg border border-zinc-200 bg-white p-0 hover:bg-zinc-50 disabled:opacity-25 sm:h-9 sm:w-9" title={t('manageLessons.moveUp')}>
                          <ArrowUp className="h-3.5 w-3.5 text-zinc-500" />
                        </Button>
                        <Button type="button" variant="ghost" disabled={index === localLessons.length - 1} onClick={() => moveDown(index)} className="h-11 w-10 rounded-lg border border-zinc-200 bg-white p-0 hover:bg-zinc-50 disabled:opacity-25 sm:h-9 sm:w-9" title={t('manageLessons.moveDown')}>
                          <ArrowDown className="h-3.5 w-3.5 text-zinc-500" />
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => requestDelete(index)} className="h-11 w-10 rounded-lg border border-zinc-200 bg-white p-0 text-zinc-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:h-9 sm:w-9" title={t('manageLessons.delete')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center">
                <FolderOpen className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
                <p className="text-xs font-bold text-zinc-600">{t('manageLessons.emptyTitle')}</p>
                <p className="mt-1 text-[10px] font-medium text-zinc-400">{t('manageLessons.emptyHint')}</p>
              </div>
            )}
            <div ref={listEndRef} />
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={open => { if (!open) setPendingDelete(null); }}
        title={t('manageLessons.deleteTitle')}
        description={pendingDelete
          ? t('manageLessons.deleteDescription', {
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

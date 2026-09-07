import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentDirection, LessonItem, TopLevelItem, Section, SubSection, SubSubSection } from '@/types';
import { TYPE_MAP, getContentTypesForSubject } from '@/constants';
import { translateLocaleMessage, useLocale } from '@/i18n/LocaleProvider';
import { ContextualDescriptionEditor } from './ContextualDescriptionEditor';

interface EditContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LessonItem | TopLevelItem | Section | SubSection | SubSubSection | null;
  onSave: (value: Partial<LessonItem> & { name?: string }) => void;
  subject?: string;
  contentDirection?: ContentDirection;
  titleOnly?: boolean;
  titleField?: 'title' | 'name';
}

type EditField = keyof LessonItem | 'name';
type EditValue = Partial<LessonItem> & { name?: string };

const FIELDS: EditField[] = ['type', 'number', 'page', 'title', 'description'];
const ALL_TYPES = [...new Set(Object.values(TYPE_MAP))].sort((a, b) => a.localeCompare(b));

export const EditContentModal: React.FC<EditContentModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  subject,
  contentDirection,
  titleOnly = false,
  titleField = 'title',
}) => {
  const { t } = useLocale();
  const contentLocale = contentDirection === 'rtl' ? 'ar' : 'fr';
  const tc = (key: string): string => translateLocaleMessage(contentLocale, key);
  const [formData, setFormData] = useState<EditValue>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const activeFields: EditField[] = titleOnly ? [titleField] : FIELDS;

  useEffect(() => {
    if (!isOpen || !item) return;
    const source = item as unknown as Record<string, unknown>;
    const fields: EditField[] = titleOnly ? [titleField] : FIELDS;
    setFormData(Object.fromEntries(fields.map(field => [field, source[field] ?? ''])) as EditValue);
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, item, titleField, titleOnly]);

  const typeOptions = useMemo(() => {
    const values = new Set(subject ? getContentTypesForSubject(subject) : ALL_TYPES);
    if (formData.type) values.add(String(formData.type));
    return [...values].sort((a, b) => (
      translateLocaleMessage(contentLocale, `contentType.${a}`).localeCompare(
        translateLocaleMessage(contentLocale, `contentType.${b}`),
      )
    ));
  }, [contentLocale, formData.type, subject]);

  const itemRecord = item as unknown as Record<string, unknown> | null;
  const isDirty = Boolean(itemRecord) && activeFields.some(field => String(formData[field] ?? '') !== String(itemRecord?.[field] ?? ''));
  const update = (field: EditField, value: string) => setFormData(current => ({ ...current, [field]: value }));
  const reset = () => itemRecord && setFormData(Object.fromEntries(activeFields.map(field => [field, itemRecord[field] ?? ''])) as EditValue);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!item || !isDirty) return;
    onSave(formData);
  };
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground';
  const fieldClass = 'h-11 rounded-xl border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary';
  const description = String(formData.description ?? '');
  const editedTitleField: 'title' | 'name' = titleOnly ? titleField : 'title';
  const editedTitle = String(formData[editedTitleField] ?? '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(titleOnly ? 'editContent.titleOnlyTitle' : 'editContent.title')}
      maxWidth={titleOnly ? 'lg' : '2xl'}
      className={titleOnly ? 'sm:max-w-2xl sm:rounded-2xl' : 'sm:max-w-4xl sm:rounded-2xl'}
      headerClassName="border-b border-border/60 bg-card/60 backdrop-blur-xs"
      bodyClassName="px-5 py-5 sm:px-7"
      footerClassName="border-t border-border/60 bg-card/60"
      footer={(
        <div className="flex w-full items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={reset} disabled={!isDirty} className="h-9 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground">
            {t('editContent.reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="h-9 rounded-xl px-4 text-xs">{t('common.cancel')}</Button>
            <Button type="submit" variant="default" form="edit-content-form" disabled={!isDirty} className="h-9 rounded-xl px-5 text-xs font-bold">{t('common.save')}</Button>
          </div>
        </div>
      )}
    >
      <form id="edit-content-form" onSubmit={submit} className="space-y-4" dir={contentDirection}>
        {titleOnly ? (
          <div className="grid grid-cols-1 gap-4">
            <section className="min-w-0">
              <label className={labelClass}>{t('editor.title')}</label>
              <Input
                ref={titleRef}
                value={editedTitle}
                onChange={event => update(editedTitleField, event.target.value)}
                className={`${fieldClass} font-semibold`}
              />
            </section>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_.45fr_.45fr]">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelClass}>{t('addContent.contentType')}</label>
                <Select value={String(formData.type ?? '')} onValueChange={value => update('type', value)}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map(type => <SelectItem key={type} value={type}>{tc(`contentType.${type}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>{t('addContent.number')}</label>
                <Input value={String(formData.number ?? '')} onChange={event => update('number', event.target.value)} className={fieldClass} placeholder="N°" />
              </div>
              <div>
                <label className={labelClass}>{t('editor.page')}</label>
                <Input value={String(formData.page ?? '')} onChange={event => update('page', event.target.value)} className={fieldClass} placeholder="42" />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className={labelClass}>{t('editor.title')}</label>
                <Input ref={titleRef} value={editedTitle} onChange={event => update('title', event.target.value)} className={`${fieldClass} font-semibold`} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4">
              <section className="min-w-0">
                <label className={labelClass}>{t('editor.description')}</label>
                <ContextualDescriptionEditor
                  value={description}
                  onChange={value => update('description', value)}
                  placeholder={t('descriptionModal.placeholder')}
                />
              </section>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

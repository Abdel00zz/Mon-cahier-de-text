import React, { useId, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/ui/math-text';
import { ContextualDescriptionEditor } from './ContextualDescriptionEditor';
import { BADGE_TEXT_MAP, TYPE_MAP, contentBadgeClass, getContentTypesForSubject } from '@/constants';
import { translateLocaleMessage, useLocale } from '@/i18n/LocaleProvider';
import { hasMathSyntax } from '@/utils/math';
import { renderDescriptionWithBold } from '@/utils/textFormat';
import type { ContentDirection } from '@/types';
import type { ContentDraft, ContentField } from '@/utils/contentDraft';

const ALL_TYPES = [...new Set(Object.values(TYPE_MAP))];
interface ContentFieldsProps {
  value: ContentDraft;
  onChange: (value: ContentDraft) => void;
  subject?: string;
  contentDirection?: ContentDirection;
  titleOnly?: boolean;
  titleField?: 'title' | 'name';
  titleLabel?: string;
  titleRequired?: boolean;
  titleRef?: React.Ref<HTMLInputElement>;
}

/** Formulaire identique en saisie et en modification, y compris pour les lignes libres. */
export function ContentFields({ value, onChange, subject, contentDirection, titleOnly = false,
  titleField = 'title', titleLabel, titleRequired = false, titleRef }: ContentFieldsProps) {
  const { t } = useLocale();
  const id = useId();
  const contentLocale = contentDirection === 'rtl' ? 'ar' : 'fr';
  const free = value.type === 'free';
  const options = useMemo(() => {
    const types = new Set(subject ? getContentTypesForSubject(subject) : ALL_TYPES);
    if (value.type) types.add(value.type);
    return [...types].sort((a, b) => translateLocaleMessage(contentLocale, `contentType.${a}`)
      .localeCompare(translateLocaleMessage(contentLocale, `contentType.${b}`), contentLocale));
  }, [subject, contentLocale, value.type]);
  const update = (field: ContentField, text: string) => onChange({ ...value, [field]: text });
  const title = String(value[titleField] ?? '');
  const description = String(value.description ?? '');
  const source = titleOnly ? title : `${title}\n${description}`;
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground';
  const fieldClass = 'h-11 rounded-xl border-border';
  return <div className="space-y-4" dir={contentDirection}>
    {!titleOnly && !free && <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_.45fr_.45fr]">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={`${id}-type`} className={labelClass}>{t('addContent.contentType')}</label>
          <Select value={value.type ?? ''} onValueChange={type => update('type', type)} required>
            <SelectTrigger id={`${id}-type`} className={fieldClass}><SelectValue placeholder={t('addContent.choose')} /></SelectTrigger>
            <SelectContent>{options.map(type => <SelectItem key={type} value={type}>
              <div className="flex items-center gap-2"><span className={contentBadgeClass(type)}>{BADGE_TEXT_MAP[type] || type}</span>
                <span>{translateLocaleMessage(contentLocale, `contentType.${type}`)}</span></div>
            </SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label htmlFor={`${id}-number`} className={labelClass}>{t('addContent.number')}</label>
          <Input id={`${id}-number`} value={value.number ?? ''} onChange={event => update('number', event.target.value)}
            className={fieldClass} aria-describedby={`${id}-number-hint`} placeholder={t('addContent.numberPlaceholder')} /></div>
        <div><label htmlFor={`${id}-page`} className={labelClass}>{t('editor.page')}</label>
          <Input id={`${id}-page`} value={value.page ?? ''} onChange={event => update('page', event.target.value)}
            className={fieldClass} placeholder={t('editor.pagePlaceholder')} /></div>
      </div>
      <p id={`${id}-number-hint`} className="text-xs leading-relaxed text-muted-foreground">{t('addContent.numberAutoHint')}</p>
    </>}
    <div><label htmlFor={`${id}-title`} className={labelClass}>{titleLabel ?? t('editor.title')}</label>
      <Input id={`${id}-title`} ref={titleRef} value={title} dir="auto" onChange={event => update(titleField, event.target.value)}
        required={titleRequired} className={fieldClass} placeholder={titleRequired ? undefined : t('addContent.optionalTitlePlaceholder')} /></div>
    {!titleOnly && <div>
      <label htmlFor={`${id}-description`} className={labelClass}>{t('addContent.descriptionLabel')}</label>
      <ContextualDescriptionEditor id={`${id}-description`} value={description} onChange={text => update('description', text)}
        dir="auto" rows={5} className="min-h-[130px]" placeholder={t(free ? 'addContent.freeHint' : 'addContent.descriptionPlaceholder')} />
      {free && <p className="mt-2 text-xs text-muted-foreground">{t('addContent.freeHelp')}</p>}
    </div>}
    {hasMathSyntax(source) && <section className="rounded-xl border border-border bg-muted/40 p-3" aria-label={t('descriptionModal.preview')}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('descriptionModal.preview')}</p>
      <div className="overflow-x-auto whitespace-pre-wrap break-words text-sm">
        <MathText source={source}>{title && <div dir="auto">{title}</div>}
          {!titleOnly && description && <div dir="auto">{renderDescriptionWithBold(description)}</div>}</MathText>
      </div>
    </section>}
  </div>;
}

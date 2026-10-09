import React, { useId, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/ui/math-text';
import { CalendarDays, X, Plus } from '@/components/ui/icons';
import { ContextualDescriptionEditor } from './ContextualDescriptionEditor';
import { BADGE_TEXT_MAP, TYPE_MAP, contentBadgeClass, getContentTypesForSubject } from '@/constants';
import { useLocale } from '@/i18n/LocaleProvider';
import { translateLocaleMessage } from '@/i18n/messages';
import { hasMathSyntax } from '@/lib/text/math';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import { cn } from '@/lib/utils';
import { formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import type { ContentDirection } from '@/types';
import type { ContentDraft, ContentField } from '@/domain/notebook/contentDraft';

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
  canEditDate?: boolean;
}

/** Formulaire identique en saisie et en modification, y compris pour les lignes libres. */
export function ContentFields({ value, onChange, subject, contentDirection, titleOnly = false,
  titleField = 'title', titleLabel, titleRequired = false, titleRef, canEditDate = false }: ContentFieldsProps) {
  const { t, isRtl } = useLocale();
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
  // Les libellés suivent la langue de l'interface. Seul le texte saisi suit le contenu :
  // un champ vide garde le sens de l'interface pour que le repère d'aide soit bien orienté.
  const uiDir = isRtl ? 'rtl' : 'ltr';
  const fieldDir = (text: string) => (text ? 'auto' : uiDir);
  const [showRange, setShowRange] = useState(Boolean(value.endDate || value.type === 'evaluation_diagnostic'));
  const isRange = Boolean(showRange || value.endDate || value.type === 'evaluation_diagnostic');
  const labelClass = 'mb-2 block text-sm font-medium text-foreground';
  const fieldClass = 'h-11 rounded-xl border-border';
  return <div className="space-y-4">
    {!titleOnly && !free && <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_.45fr_.45fr]">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={`${id}-type`} className={labelClass}>{t('addContent.contentType')} :</label>
          <Select value={value.type ?? ''} onValueChange={type => update('type', type)} required>
            <SelectTrigger id={`${id}-type`} className={fieldClass}><SelectValue placeholder={t('addContent.choose')} /></SelectTrigger>
            <SelectContent>{options.map(type => <SelectItem key={type} value={type}>
              <div className="flex items-center gap-1.5"><span className={contentBadgeClass(type)}>{BADGE_TEXT_MAP[type] || type}</span>
                <span dir={contentDirection}>{translateLocaleMessage(contentLocale, `contentType.${type}`)}</span></div>
            </SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label htmlFor={`${id}-number`} className={labelClass}>{t('addContent.number')} :</label>
          <Input id={`${id}-number`} value={value.number ?? ''} dir={fieldDir(String(value.number ?? ''))} onChange={event => update('number', event.target.value)}
            className={fieldClass} aria-describedby={`${id}-number-hint`} placeholder={t('addContent.numberPlaceholder')} /></div>
        <div><label htmlFor={`${id}-page`} className={labelClass}>{t('editor.page')} :</label>
          <Input id={`${id}-page`} value={value.page ?? ''} dir={fieldDir(String(value.page ?? ''))} onChange={event => update('page', event.target.value)}
            className={fieldClass} placeholder={t('editor.pagePlaceholder')} /></div>
      </div>
      <p id={`${id}-number-hint`} className="text-xs leading-relaxed text-muted-foreground">{t('addContent.numberAutoHint')}</p>
    </>}
    <div><label htmlFor={`${id}-title`} className={labelClass}>{titleLabel ? `${titleLabel} :` : `${t('editor.title')} :`}</label>
      <Input id={`${id}-title`} ref={titleRef} value={title} dir={fieldDir(title)} onChange={event => update(titleField, event.target.value)}
        required={titleRequired} className={fieldClass} placeholder={titleRequired ? undefined : t('addContent.optionalTitlePlaceholder')} /></div>
    {canEditDate && (
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" />
            <span>{isRange ? t('editor.dateRange') : t('editor.startDate')}</span>
          </label>
          {!isRange ? (
            <button
              type="button"
              onClick={() => {
                setShowRange(true);
                if (!value.endDate && value.date) {
                  onChange({ ...value, endDate: value.date });
                }
              }}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{t('editor.defineRange')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowRange(false);
                const next = { ...value };
                delete next.endDate;
                onChange(next);
              }}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
              title={t('editor.removeRange')}
              aria-label={t('editor.removeRange')}
            >
              <X className="size-3.5" />
              <span>{t('editor.removeRange')}</span>
            </button>
          )}
        </div>

        <div className={cn("grid gap-3", isRange ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-date`} className="block text-xs font-medium text-foreground">
              {isRange ? t('editor.startDate') : t('assignDate.chooseDate')} :
            </label>
            <Input
              id={`${id}-date`}
              type="date"
              value={value.date ?? ''}
              onChange={event => onChange({ ...value, date: event.target.value })}
              className={fieldClass}
            />
          </div>

          {isRange && (
            <div className="space-y-1.5">
              <label htmlFor={`${id}-end-date`} className="block text-xs font-medium text-foreground">
                {t('editor.endDate')} :
              </label>
              <Input
                id={`${id}-end-date`}
                type="date"
                min={value.date || undefined}
                value={value.endDate ?? ''}
                onChange={event => onChange({ ...value, endDate: event.target.value })}
                className={fieldClass}
              />
            </div>
          )}
        </div>

        {value.date && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="font-semibold text-foreground px-2.5 py-1 rounded-lg bg-background border border-border/80 shadow-2xs text-xs">
              {formatPedagogicalDateCell(value.date, value.endDate, contentLocale)}
            </span>
          </div>
        )}
      </div>
    )}
    {!titleOnly && <div>
      <label htmlFor={`${id}-description`} className={labelClass}>{t('addContent.descriptionLabel')} :</label>
      <ContextualDescriptionEditor id={`${id}-description`} value={description} onChange={text => update('description', text)}
        dir={fieldDir(description)} rows={5} className="min-h-[130px]" placeholder={t(free ? 'addContent.freeHint' : 'addContent.descriptionPlaceholder')} />
      {free && <p className="mt-2 text-xs text-muted-foreground">{t('addContent.freeHelp')}</p>}
    </div>}
    {hasMathSyntax(source) && <section className="rounded-xl border border-border bg-muted/40 p-3" aria-label="Aperçu">
      <div className="overflow-x-auto whitespace-pre-wrap break-words text-sm">
        <MathText source={source}>{title && <div dir="auto">{title}</div>}
          {!titleOnly && description && <div dir="auto">{renderDescriptionWithBold(description)}</div>}</MathText>
      </div>
    </section>}
  </div>;
}

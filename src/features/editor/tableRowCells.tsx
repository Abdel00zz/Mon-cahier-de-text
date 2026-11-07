import { uniq } from 'es-toolkit';
import type { DateMergeMeta } from '@/domain/notebook/tableRows';
import { FC, memo } from 'react';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { numberFormat } from '@/lib/formatters';
import { parseDateInput } from '@/domain/notebook/dataUtils';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { hasHomeworkMention, splitRemarkContent } from '@/domain/evaluations/homeworkNumbering';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { SessionDocuments } from './SessionDocuments';
import { CalendarDays, MessageSquare } from 'lucide-react';

const DATE_CARD_NUMBER_OPTIONS: Intl.NumberFormatOptions = { minimumIntegerDigits: 2, useGrouping: false };
const dateCardNumberFormatters = new Map<AppLocale, Intl.NumberFormat>();

/**
 * Formateur jour/mois partagé par toutes les lignes. L'ancien appel créait un
 * objet d'options puis une clé JSON à CHAQUE cellule datée et à chaque rendu ;
 * la carte de date n'a pourtant que trois locales possibles.
 */
const dateCardNumberFormat = (locale: AppLocale): Intl.NumberFormat => {
  let formatter = dateCardNumberFormatters.get(locale);
  if (!formatter) {
    formatter = numberFormat(locale, DATE_CARD_NUMBER_OPTIONS);
    dateCardNumberFormatters.set(locale, formatter);
  }
  return formatter;
};

const parseDate = (dateStr: string | undefined, locale: AppLocale) => {
  try {
    // Un seul parseur pour tout le cahier (ISO, jj/mm/aaaa, horodatage).
    const dateObj = parseDateInput(dateStr);
    if (!dateObj) return null;

    if (isNaN(dateObj.getTime())) return null;

    const numberFormatter = dateCardNumberFormat(locale);
    return {
      day: numberFormatter.format(dateObj.getDate()),
      numericMonth: numberFormatter.format(dateObj.getMonth() + 1),
    };
  } catch {
    return null;
  }
};

interface ParsedRange {
  kind: 'range' | 'pair';
  start: { day: string; numericMonth: string };
  end: { day: string; numericMonth: string };
}

const parseRangeOrPair = (str: string, locale: AppLocale): ParsedRange | null => {
  if (!str) return null;
  const trimmed = str.trim();

  // 1. Détection de plage : "Du ... au ...", "من ... إلى ...", "From ... to ..."
  const rangeMatch = trimmed.match(
    /(?:Du|du|De|de|From|from|من)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:au|à|a|to|إلى)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/i
  );
  if (rangeMatch) {
    const d1 = parseDate(rangeMatch[1], locale);
    const d2 = parseDate(rangeMatch[2], locale);
    if (d1 && d2) {
      return { kind: 'range', start: d1, end: d2 };
    }
  }

  // 2. Détection de deux jours avec 'et' / 'و' / 'and'
  const pairMatch = trimmed.match(
    /(?:^|\s)(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:et|and|و)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)(?:\s|$)/i
  );
  if (pairMatch) {
    const d1 = parseDate(pairMatch[1], locale);
    const d2 = parseDate(pairMatch[2], locale);
    if (d1 && d2) {
      return { kind: 'pair', start: d1, end: d2 };
    }
  }

  return null;
};

/** Les dates simples et fusionnées partagent exactement la même typographie. */
export const DateCard: FC<{ dateStr?: string; hasWarning?: boolean }> = memo(({ dateStr, hasWarning }) => (
  dateStr ? <MultiDateCard dates={[dateStr]} hasWarning={hasWarning} /> : <CalendarDays className="editor-empty-date" size={16} aria-hidden="true" />
));

DateCard.displayName = 'DateCard';

export const MultiDateCard: FC<{ dates: string[]; hasWarning?: boolean }> = memo(({ dates, hasWarning }) => {
  const { locale } = useLocale();

  // Support direct des plages ("Du XX au YY") et des couples ("XX et YY")
  // Les plages sont affichées avec le connecteur pédagogique ('et' / 'و'), jamais de texte brut 'Du XX au YY'
  if (dates.length === 1) {
    const rangeOrPair = parseRangeOrPair(dates[0], locale);
    if (rangeOrPair) {
      const conjunction = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
      return (
        <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`editor-date-value flex min-w-0 max-w-full flex-wrap items-baseline justify-center gap-x-1 gap-y-0.5 py-1 text-center font-semibold leading-snug tabular-nums ${hasWarning ? 'text-alert-strong' : 'text-primary'}`}>
          <span data-date-token className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
            <bdi dir="ltr" className="whitespace-nowrap">{rangeOrPair.start.day}/{rangeOrPair.start.numericMonth}</bdi>
            <span className="font-normal text-foreground text-xs">{conjunction}</span>
            <bdi dir="ltr" className="whitespace-nowrap">{rangeOrPair.end.day}/{rangeOrPair.end.numericMonth}</bdi>
          </span>
        </div>
      );
    }
  }

  const allTokens = dates.flatMap(d => {
    if (!d) return [];
    const iso = d.match(/\b\d{4}-\d{2}-\d{2}\b/g);
    if (iso && iso.length > 0) return iso;
    const ddmmyyyy = d.match(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g);
    if (ddmmyyyy && ddmmyyyy.length > 0) return ddmmyyyy;
    return [d.trim()];
  });

  const parsedDates = uniq(allTokens).flatMap(date => {
    const parsed = parseDate(date, locale);
    return parsed ? [{ ...parsed, source: date }] : [];
  });
  if (parsedDates.length === 0) return null;
  const conjunction = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`editor-date-value flex min-w-0 max-w-full flex-wrap items-baseline justify-center gap-x-1 gap-y-0.5 py-1 text-center font-semibold leading-snug tabular-nums ${hasWarning ? 'text-alert-strong' : 'text-primary'}`}>
      {parsedDates.map((date, index) => (
        <span key={date.source} data-date-token className="inline-flex shrink-0 items-baseline gap-0.5 whitespace-nowrap">
          {index > 0 ? <span className="font-normal text-foreground">{conjunction}</span> : null}
          <bdi dir="ltr" className="whitespace-nowrap">{date.day}/{date.numericMonth}</bdi>
        </span>
      ))}
    </div>
  );
});

MultiDateCard.displayName = 'MultiDateCard';

export const DateCell: FC<{ dateStr?: string; merge?: DateMergeMeta; hasWarning?: boolean; isSelected?: boolean; hasAssignedDate?: boolean }> = memo(({ dateStr, merge, hasWarning, isSelected, hasAssignedDate }) => {
  const isMerged = !!merge?.isMerged;
  const bgClass = isSelected
    ? 'bg-muted dark:bg-muted/80'
    : hasWarning
      ? 'bg-alert/[0.12]'
    : hasAssignedDate
      ? 'bg-muted/40'
      : 'bg-card';

  if (isMerged) {
    const isMiddle = merge.indexInGroup === Math.floor(merge.count / 2);

    return (
      <div className={`flex h-full min-h-[48px] w-full flex-col items-center justify-center px-1 py-1 transition-colors duration-200 ${bgClass}`}>
        {isMiddle && <DateCard dateStr={dateStr} hasWarning={hasWarning} />}
      </div>
    );
  }

  // Not merged
  return (
    <div className={`flex h-full min-h-[48px] w-full flex-col items-center justify-center px-1 py-1 transition-colors duration-200 ${bgClass}`}>
      <DateCard dateStr={dateStr} hasWarning={hasWarning} />
    </div>
  );
});

DateCell.displayName = 'DateCell';

export const RemarkCell: FC<{
  value?: string;
  merge?: DateMergeMeta;
  lineClass: string;
  hasAssignedDate?: boolean;
  isSelected?: boolean;
  hasWarning?: boolean;
  onOpenRemark?: () => void;
  sessionAnnotation?: string;
  sessionDocuments?: readonly NotebookDocumentPreview[];
  onOpenDocumentPreview?: (preview: NotebookDocumentPreview) => void;
}> = memo(({ value, merge, lineClass, hasAssignedDate, isSelected, hasWarning, onOpenRemark, sessionAnnotation, sessionDocuments, onOpenDocumentPreview }) => {
  const { t } = useLocale();
  const shouldMerge = !!merge?.isMerged;

  const bgClass = isSelected
    ? 'bg-muted dark:bg-muted/80'
    : hasWarning
      ? 'bg-alert/[0.055]'
    : hasAssignedDate
      ? 'bg-card/55'
      : 'bg-card';

  const borderClass = '';

  // La remarque d'une séance fusionnée s'écrit PARTOUT : une seule cible, donc
  // une seule saisie et une seule annulation pour tout le groupe.
  const editable = typeof onOpenRemark === 'function';
  const cellTitle = editable ? t('remark.editTitle') : undefined;
  const body = (isMergedCell: boolean) => (
    <div className="flex w-full h-full flex-col justify-center items-start text-start">
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenRemark?.(); }}
      disabled={!editable}
      title={cellTitle}
      aria-label={cellTitle}
      data-remark-cell="true"
      className={`flex min-h-[44px] h-full flex-1 w-full flex-col justify-center items-start text-start ${editable ? 'cursor-pointer rounded-lg transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40' : ''}`}
    >
      {(!isMergedCell || merge!.indexInGroup === Math.floor(merge!.count / 2)) && (() => {
        const fullRemark = merge?.sharedRemark ?? value;
        const { homeworkLine, otherRemark } = splitRemarkContent(fullRemark);
        return (
          <>
            {homeworkLine && (
              <span
                data-session-homework="true"
                dir={textDirectionAttribute(homeworkLine)}
                className="editor-session-note block w-full whitespace-pre-line break-words text-start text-[11px] font-semibold leading-snug text-muted-foreground"
              >
                {homeworkLine}
              </span>
            )}
            {otherRemark && (
              <div dir={textDirectionAttribute(otherRemark)} className="editor-type-remark min-h-[22px] w-full whitespace-pre-wrap break-words p-0.5 text-start font-semibold leading-snug text-foreground/80 text-xs sm:text-sm">
                {renderDescriptionWithBold(otherRemark)}
              </div>
            )}
            {!homeworkLine && !otherRemark && !sessionAnnotation && !sessionDocuments?.length && (
              <MessageSquare className="editor-empty-note" size={16} aria-hidden="true" />
            )}
          </>
        );
      })()}
      {sessionAnnotation && !(merge?.sharedRemark ?? value ?? '').includes(sessionAnnotation)
        && !(splitRemarkContent(merge?.sharedRemark ?? value ?? '').homeworkLine && hasHomeworkMention(sessionAnnotation)) && (
        <span
          data-session-annotation="true"
          dir={textDirectionAttribute(sessionAnnotation)}
          className="editor-session-note mt-0.5 w-full whitespace-pre-line break-words text-start text-[11px] font-semibold leading-snug text-muted-foreground"
        >
          {sessionAnnotation}
        </span>
      )}
    </button>
    <SessionDocuments documents={sessionDocuments} onOpen={onOpenDocumentPreview}/>
    </div>
  );

  if (shouldMerge) {
    return (
      <div data-editor-cell="remark" className={`relative flex min-w-0 p-1 md:p-1.5 cursor-pointer hover:bg-primary/[0.03] transition-colors items-center justify-start ${borderClass} ${lineClass} ${bgClass}`} onClick={() => editable && onOpenRemark?.()}>
        <div className="relative z-10 h-full flex flex-col justify-center items-start text-start w-full">
          {body(true)}
        </div>
      </div>
    );
  }

  return (
    <div data-editor-cell="remark" className={`flex min-w-0 p-1 md:p-1.5 cursor-pointer hover:bg-primary/[0.03] transition-colors items-center justify-start ${borderClass} ${lineClass} ${bgClass}`} onClick={() => editable && onOpenRemark?.()}>
      {body(false)}
    </div>
  );
});
RemarkCell.displayName = 'RemarkCell';

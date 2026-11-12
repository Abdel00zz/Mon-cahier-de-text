import { uniq } from 'es-toolkit';
import type { DateMergeMeta } from '@/domain/notebook/tableRows';
import { FC, memo } from 'react';
import { useLocale, type AppLocale } from '@/i18n/LocaleProvider';
import { dateTimeFormat } from '@/lib/formatters';
import { parseDateInput } from '@/domain/notebook/dataUtils';
import { textDirectionAttribute } from '@/lib/text/textDirection';
import { hasHomeworkMention, splitRemarkContent } from '@/domain/evaluations/homeworkNumbering';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { SessionDocuments } from './SessionDocuments';

const calendarOptions = { day: '2-digit', month: 'short', weekday: 'short', calendar: 'gregory' } as const;

function calendarDate(source: string, locale: AppLocale) {
  // Some imported notebooks store only day/month. A leap year provides the
  // month name for those entries, but cannot provide their actual weekday.
  const partial = /^(\d{1,2})[/.-](\d{1,2})$/.exec(source);
  const date = parseDateInput(partial ? `${source.replace(/[.-]/g, '/')}/2000` : source);
  if (!date || !Number.isFinite(date.getTime())) return null;
  const parts = dateTimeFormat(locale, calendarOptions).formatToParts(date);
  const field = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  const dm = [date.getDate(), date.getMonth() + 1].map(n => String(n).padStart(2, '0')).join('/');
  return { day: field('day'), month: field('month'), weekday: partial ? undefined : field('weekday'),
    full: partial ? dm : `${dm}/${date.getFullYear()}`, source };
}

const parseRangeOrPair = (str: string) => {
  if (!str) return null;
  const trimmed = str.trim();

  // 1. Détection de plage : "Du ... au ...", "من ... إلى ...", "From ... to ..."
  const rangeMatch = trimmed.match(
    /(?:Du|du|De|de|From|from|من)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:au|à|a|to|إلى)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/i
  );
  if (rangeMatch) return { range: true, tokens: rangeMatch.slice(1) };

  // 2. Détection de deux jours avec 'et' / 'و' / 'and'
  const pairMatch = trimmed.match(
    /(?:^|\s)(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(?:et|and|و)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)(?:\s|$)/i
  );
  return pairMatch ? { range: false, tokens: pairMatch.slice(1) } : null;
};

/** Les dates simples et fusionnées partagent exactement la même typographie. */
export const DateCard: FC<{ dateStr?: string; hasWarning?: boolean }> = memo(({ dateStr, hasWarning }) => (
  dateStr ? <MultiDateCard dates={[dateStr]} hasWarning={hasWarning} /> : null
));

DateCard.displayName = 'DateCard';

export const MultiDateCard: FC<{ dates: string[]; hasWarning?: boolean }> = memo(({ dates, hasWarning }) => {
  const { locale, t } = useLocale();
  const compound = dates.length === 1 ? parseRangeOrPair(dates[0]) : null;
  const allTokens = compound?.tokens ?? dates.flatMap(d => {
    if (!d) return [];
    const iso = d.match(/\b\d{4}-\d{2}-\d{2}\b/g);
    if (iso && iso.length > 0) return iso;
    const ddmmyyyy = d.match(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g);
    if (ddmmyyyy && ddmmyyyy.length > 0) return ddmmyyyy;
    return [d.trim()];
  });

  const parsedDates = uniq(allTokens).map(token => calendarDate(token, locale)).filter(date => date !== null);
  if (!parsedDates.length) return null;
  const separator = compound?.range ? t('evaluations.rangeSeparator') : locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`editor-date-value ${hasWarning ? 'text-alert-strong' : ''}`}>
      {parsedDates.map((date, i) => (
        <div key={date.source} className="editor-date-entry">
          {i > 0 && <span className="editor-date-join">{separator}</span>}
          <span data-date-token className="editor-date-stamp" title={date.full}>
            {locale === 'ar' && date.weekday && <small className="editor-date-weekday">{date.weekday}</small>}
            <bdi className="editor-date-day">{date.day}</bdi>
            <span>{date.month}</span>
            {locale !== 'ar' && date.weekday && <small className="editor-date-weekday">{date.weekday}</small>}
          </span>
        </div>
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
      className={`flex min-h-[44px] h-full flex-1 w-full flex-col justify-center items-start text-start ${editable ? 'cursor-pointer touch-manipulation rounded-lg transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40' : ''}`}
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
      <div data-editor-cell="remark" className={`relative flex min-w-0 p-1 md:p-1.5 transition-colors items-center justify-start ${lineClass} ${bgClass}`}>
        <div className="relative z-10 h-full flex flex-col justify-center items-start text-start w-full">
          {body(true)}
        </div>
      </div>
    );
  }

  return (
    <div data-editor-cell="remark" className={`flex min-w-0 p-1 md:p-1.5 transition-colors items-center justify-start ${lineClass} ${bgClass}`}>
      {body(false)}
    </div>
  );
});
RemarkCell.displayName = 'RemarkCell';

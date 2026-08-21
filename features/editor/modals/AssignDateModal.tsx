import { FC, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CalendarX, CalendarPlus, CalendarMinus, ChevronRight } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { MathJax } from 'better-react-mathjax';
import { Indices } from '@/types';
import { TYPE_MAP, BADGE_COLOR_MAP, TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { todayInMorocco } from '@/utils/calendar';
import { hasMathSyntax } from '@/utils/math';
import { useLocale } from '@/i18n/LocaleProvider';

interface SelectedItemPreview {
  indices: Indices;
  item: any;
  title: string;
  date?: string;
  description?: string;
  canDate: boolean;
}

interface AssignDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (date: string) => void;
  selectedCount: number;
  selectedItems: SelectedItemPreview[];
  /** validation intelligente : alertes live pour la date choisie (emploi du temps, fériés, vacances, absences) */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** Date conservée lors d'un retour depuis la vérification. */
  initialDate?: string;
}

const addDaysISO = (iso: string, offset: number): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const isoFromOffset = (offset: number) => {
  return addDaysISO(todayInMorocco(), offset);
};

const formatShortDate = (dateStr: string | undefined, localeCode: string, emptyLabel: string) => {
  if (!dateStr) return emptyLabel;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' });
    }
    const dObj = new Date(dateStr);
    if (isNaN(dObj.getTime())) return dateStr;
    return dObj.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

const formatFullDate = (dateStr: string | undefined, localeCode: string, emptyLabel: string) => {
  if (!dateStr) return emptyLabel;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const dObj = new Date(dateStr);
    if (isNaN(dObj.getTime())) return dateStr;
    return dObj.toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const AssignDateModal: FC<AssignDateModalProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedCount,
  selectedItems,
  getDateWarnings,
  initialDate,
}) => {
  const { t, locale, isRtl } = useLocale();
  const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
  const number = useMemo(() => new Intl.NumberFormat(localeCode), [localeCode]);
  const [actionType, setActionType] = useState<'associate' | 'dissociate'>('associate');
  const [selectedDate, setSelectedDate] = useState(() => isoFromOffset(0));

  useEffect(() => {
    if (!isOpen) return;
    setActionType('associate');
    setSelectedDate(initialDate || isoFromOffset(0));
  }, [initialDate, isOpen]);

  // Alertes live : recalculées à chaque changement de date choisie.
  const dateWarnings = useMemo(
    () => (actionType === 'associate' && getDateWarnings && selectedDate ? getDateWarnings(selectedDate) : []),
    [actionType, getDateWarnings, selectedDate]
  );

  const getItemBadge = (item: any) => {
    if (!item) return null;
    const type = item.type || '';
    if (!type) return null;

    if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type)) {
      const config = TOP_LEVEL_TYPE_CONFIG[type];
      return {
        text: t(`manageLessons.type.${type}`),
        color: config.badgeColor || 'bg-secondary text-secondary-foreground border-border',
        icon: null
      };
    }

    const normalizedType = TYPE_MAP[type.toLowerCase()] || type;
    const text = t(`contentType.short.${normalizedType}`);
    const color = BADGE_COLOR_MAP[normalizedType] || 'bg-secondary text-secondary-foreground border-border';

    return { text, color, icon: null };
  };

  const handleApply = () => {
    if (actionType === 'associate') {
      onApply(selectedDate);
    } else {
      onApply(''); // Empty string dissociates the date
    }
  };

  const maxItemsToShow = 3;
  const remainingItemsCount = Math.max(0, selectedItems.length - maxItemsToShow);
  const visibleItems = useMemo(() => {
    return selectedItems.slice(0, maxItemsToShow);
  }, [selectedItems]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('assignDate.title')}
      description={t(selectedCount === 1 ? 'assignDate.selectedOne' : 'assignDate.selectedMany', { count: number.format(selectedCount) })}
      maxWidth="lg"
      className="sm:max-w-xl sm:rounded-[32px]"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/60"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className={`rounded-xl h-10 px-5 text-xs sm:text-sm font-bold shadow-sm transition-all duration-150 ${
              actionType === 'associate'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {actionType === 'associate' ? (
              <span>{t('assignDate.applyDate')}</span>
            ) : (
              <span>{t('assignDate.removeDates')}</span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sleek toggle selector */}
        <Segmented<'associate' | 'dissociate'>
          value={actionType}
          onChange={setActionType}
          className="grid w-full grid-cols-2 max-w-sm mx-auto"
          options={[
            {
              value: 'associate',
              label: (
                <span className="flex items-center gap-1.5">
                  <CalendarPlus className="h-3.5 w-3.5" /> {t('assignDate.assign')}
                </span>
              ),
            },
            {
              value: 'dissociate',
              label: (
                <span className="flex items-center gap-1.5">
                  <CalendarMinus className="h-3.5 w-3.5" /> {t('assignDate.unassign')}
                </span>
              ),
            },
          ]}
        />

        {/* Dynamic & Centered Middle Section */}
        {actionType === 'associate' ? (
          <div className="space-y-3.5 animate-fade-in duration-200 text-center max-w-sm mx-auto py-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              {t('assignDate.chooseDate')}
            </span>
            
            {/* Centered Date Input */}
            <div className="relative flex flex-col items-center gap-2">
              <Input
                id="assign-date-input"
                type="date"
                value={selectedDate}
                onChange={event => setSelectedDate(event.target.value)}
                className="h-11 w-52 rounded-xl border border-border bg-card text-center text-sm font-bold shadow-xs transition-colors hover:bg-muted focus:border-border focus:ring-0"
              />
              {/* Intelligent date readout / Capteur intelligent */}
              <span className="text-xs font-semibold text-muted-foreground capitalize">
                {formatFullDate(selectedDate, localeCode, t('assignDate.noDateSelected'))}
              </span>
            </div>

            {/* Garde intelligente : conflits emploi du temps / fériés / vacances / absences */}
            {dateWarnings.length > 0 && (
              <div className="mx-auto max-w-sm space-y-1 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-start animate-fade-in duration-200" role="status">
                {dateWarnings.map((warning, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs font-medium leading-snug text-amber-800 dark:text-amber-300">
                    <span aria-hidden className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">⚠</span>
                    {warning.message}
                  </p>
                ))}
                <p className="ps-4 text-[11px] text-amber-700/90 dark:text-amber-400 font-medium mt-1">
                  {t('assignDate.warningOverride')}
                </p>
              </div>
            )}

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
              <Button
                type="button"
                className={`h-10 rounded-xl border border-border py-1 text-xs font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(-1)
                    ? 'bg-primary text-primary-foreground border-primary font-extrabold'
                    : 'bg-card hover:bg-muted text-foreground'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(-1))}
              >
                {t('assignDate.yesterday')}
              </Button>
              <Button
                type="button"
                className={`h-10 rounded-xl border border-border py-1 text-xs font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(0)
                    ? 'bg-primary text-primary-foreground border-primary font-extrabold'
                    : 'bg-card hover:bg-muted text-foreground'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(0))}
              >
                {t('assignDate.today')}
              </Button>
              <Button
                type="button"
                className={`h-10 rounded-xl border border-border py-1 text-xs font-bold shadow-xs transition-all duration-150 active:scale-95 ${
                  selectedDate === isoFromOffset(1)
                    ? 'bg-primary text-primary-foreground border-primary font-extrabold'
                    : 'bg-card hover:bg-muted text-foreground'
                }`}
                onClick={() => setSelectedDate(isoFromOffset(1))}
              >
                {t('assignDate.tomorrow')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm animate-fade-in duration-200 space-y-1.5 rounded-2xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20 p-4 text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 mb-1">
              <CalendarX className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider">{t('assignDate.removeTitle')}</h4>
            <p className="text-xs text-rose-600 dark:text-rose-300 font-medium leading-relaxed max-w-xs mx-auto">
              {t('assignDate.removeHint')}
            </p>
          </div>
        )}

        {/* Compact selected items list preview with transition preview */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            <span>{t('assignDate.preview')}</span>
            <span>{t('assignDate.change')}</span>
          </div>
          
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-2 space-y-1.5">
            {visibleItems.map((previewItem, index) => {
              const badge = getItemBadge(previewItem.item);
              const isDateable = previewItem.canDate;

              return (
                <div
                  key={`${previewItem.title}-${index}`}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/80 bg-card shadow-2xs transition-opacity duration-150 ${
                    !isDateable ? 'opacity-40' : ''
                  }`}
                >
                  {/* Left Side: Badge & Title */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {badge && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase py-0.5 px-1.5 h-4.5 rounded-md flex items-center gap-1 shrink-0 ${badge.color}`}
                      >
                        {badge.icon && <badge.icon className="me-0.5 h-2.5 w-2.5" />}
                        {badge.text}
                      </Badge>
                    )}

                    <div className="min-w-0 flex-1 text-xs font-bold text-foreground truncate">
                      {hasMathSyntax(previewItem.title) ? (
                        <MathJax inline hideUntilTypeset="first">
                          {previewItem.title}
                        </MathJax>
                      ) : (
                        <span>{previewItem.title || t('assignDate.untitled')}</span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Visual state change representation */}
                  <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                    <span className="text-muted-foreground font-semibold">
                      {formatShortDate(previewItem.date, localeCode, t('assignDate.noDate'))}
                    </span>

                    {isDateable && (
                      <div className="flex items-center gap-1.5 animate-fade-in duration-200">
                        <ChevronRight className={`h-3 w-3 text-muted-foreground ${isRtl ? 'rotate-180' : ''}`} />
                        {actionType === 'associate' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold shadow-2xs">
                            {formatShortDate(selectedDate, localeCode, t('assignDate.noDate'))}
                          </span>
                        ) : previewItem.date ? (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold shadow-2xs line-through">
                            {formatShortDate(previewItem.date, localeCode, t('assignDate.noDate'))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium italic text-[11px]">{t('assignDate.noChange')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {remainingItemsCount > 0 && (
              <div className="text-center py-1 text-[11px] font-bold text-muted-foreground italic">
                {t(remainingItemsCount === 1 ? 'assignDate.moreOne' : 'assignDate.moreMany', { count: number.format(remainingItemsCount) })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

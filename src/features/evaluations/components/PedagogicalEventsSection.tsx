import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PedagogicalEvent } from '@/types';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { documentIndicator, documentRequirementForEvent } from '@/domain/evaluations/documentRequirement';
import { numberFormat } from '@/lib/formatters';
import { useLocale } from '@/i18n/LocaleProvider';
import { FileCheck, FilePlus, FileText, Users } from 'lucide-react';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG } from '../kindCatalog';
import { KindGroupHeader } from './KindGroupHeader';
import { EventDateModal } from './EventDateModal';

/*
 * LA LISTE DES ACTIVITÉS PÉDAGOGIQUES D'UNE NATURE.
 *
 * Même tableau que les devoirs (en-tête + lignes `ev-row`), même langue
 * d'actions : document (jamais pour un contrôle des cahiers — sa trace vit
 * dans la remarque de séance), élèves consignés avec compte, date modifiable
 * par la modale partagée, suppression confirmée par l'écran parent.
 */
interface PedagogicalEventsSectionProps {
  events: PedagogicalEvent[];
  showHeader?: boolean;
  onDateChange: (event: PedagogicalEvent, date: string, endDate?: string) => void;
  onDelete: (event: PedagogicalEvent) => void;
  onOpenDocument: (event: PedagogicalEvent) => void;
  onOpenStudents: (event: PedagogicalEvent) => void;
}

export const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  events,
  showHeader = true,
  onDateChange,
  onDelete,
  onOpenDocument,
  onOpenStudents,
}) => {
  const { t, locale } = useLocale();
  const number = useMemo(() => numberFormat(locale), [locale]);
  const [editingDateEvent, setEditingDateEvent] = useState<PedagogicalEvent | null>(null);

  if (events.length === 0) return null;

  const formatDateBadge = (date: string | undefined, endDate: string | undefined): string => {
    if (!date) return locale === 'ar' ? '+ تحديد التاريخ' : '+ Définir une date';
    const formatFull = (iso: string) => {
      const parts = iso.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return iso;
    };
    if (endDate && endDate !== date) {
      const partsStart = date.split('-');
      const partsEnd = endDate.split('-');
      const d1 = partsStart[2] || '';
      const m1 = partsStart[1] || '';
      const d2 = partsEnd[2] || '';
      const m2 = partsEnd[1] || '';
      const y2 = partsEnd[0] || '';
      if (locale === 'ar') {
        return `من ${d1}/${m1} إلى ${d2}/${m2}/${y2}`;
      }
      return `Du ${d1}/${m1} au ${d2}/${m2}/${y2}`;
    }
    return formatFull(date);
  };

  return (
    <section className="space-y-2.5 font-sans">
      {showHeader && (
        <div className="px-1">
          <KindGroupHeader
            title={t('evaluations.pedagogicalEvents')}
            tone={KIND_GROUPS[1].tone}
            countLabel={`${events.length} ${events.length === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}`}
          />
        </div>
      )}

      <div className="ev-board">
        <div className="ev-board__head" aria-hidden="true">
          <span>{t('evaluations.titleLabel')}</span>
          <span>{t('evaluations.manualDate')}</span>
          <span>{t('evaluations.colActions')}</span>
        </div>
        <ul className="ev-board__rows">
          {events.map((event) => {
            const done = event.status === 'done';
            const { labelKey, tone } = PEDAGOGICAL_EVENT_CONFIG[event.type] ?? PEDAGOGICAL_EVENT_CONFIG.autre;
            const names = event.students?.names.length ?? 0;
            const typeLabel = t(labelKey);
            const normalizeLabel = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase(locale);
            const title = event.title.trim() || typeLabel;
            const showType = normalizeLabel(title) !== normalizeLabel(typeLabel);
            const showNote = event.note?.trim() && normalizeLabel(event.note) !== normalizeLabel(title) && normalizeLabel(event.note) !== normalizeLabel(typeLabel);

            const docIndicator = documentIndicator(documentRequirementForEvent(event.type), event.document);
            const eventDocTooltip = locale === 'ar'
              ? (docIndicator === 'attached' ? 'عرض وتعديل وثيقة أو موضوع هذا النشاط' : docIndicator === 'missing' ? 'الوثيقة مطلوبة ولم تُرفق بعد — انقر لكتابتها' : 'إرفاق وثيقة أو نص أو رابط لهذا النشاط التربوي')
              : (docIndicator === 'attached' ? 'Consulter ou modifier le document/sujet associé' : docIndicator === 'missing' ? 'Document requis, pas encore associé — Cliquer pour le rédiger' : 'Associer un document, sujet ou lien à cette activité');
            const docStateSuffix = docIndicator === 'attached' ? ` — ${t('evaluations.doc.stateAttached')}` : docIndicator === 'missing' ? ` — ${t('evaluations.doc.stateMissing')}` : '';

            const eventStudentsTooltip = event.type === REMARK_EVENT_TYPE
              ? (locale === 'ar'
                  ? (names > 0 ? `متابعة دفاتر التلاميذ (${names} تلميذ محدد)` : 'تسجيل التلاميذ المعنيين بمراقبة الدفاتر وملاحظات التفتيش')
                  : (names > 0 ? `Suivi des cahiers (${names} élève(s))` : 'Pointer les élèves dont les cahiers sont contrôlés'))
              : (locale === 'ar'
                  ? (names > 0 ? `قائمة التلاميذ المشاركين (${names} مشارك)` : 'تحديد التلاميذ المشاركين أو المستفيدين من النشاط')
                  : (names > 0 ? `Élèves participants (${names} élève(s))` : 'Désigner les élèves concernés par cette activité'));

            const deleteTooltip = locale === 'ar'
              ? 'حذف هذا النشاط التربوي نهائياً'
              : 'Supprimer définitivement cette activité pédagogique';

            return (
              <li
                key={event.id}
                className="ev-row evaluation-tone"
                data-activity-card="true"
                data-activity-type={event.type}
                data-tone={tone}
                data-done={done ? 'true' : undefined}
              >
                <div className="ev-row__id min-w-0">
                  <h4 className="text-[13px] font-bold leading-tight text-foreground truncate" dir="auto">{title}</h4>
                  {showType && <span className="tone-chip">{typeLabel}</span>}
                  {showNote && (
                    <p className="line-clamp-1 text-[11px] leading-tight text-muted-foreground text-start mt-0.5">{event.note}</p>
                  )}
                </div>


                <div className="ev-row__date">
                  <button
                    type="button"
                    onClick={() => setEditingDateEvent(event)}
                    className={cn(
                      "ev-date-trigger inline-flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 border-0 shadow-none",
                      event.date
                        ? "text-foreground hover:text-primary hover:bg-muted/40 rounded-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md"
                    )}
                    aria-label={t('evaluations.assessmentDateAria', { assessment: title })}
                  >
                    <span className="whitespace-nowrap tabular-nums text-xs font-bold" dir="ltr">
                      {formatDateBadge(event.date, event.endDate)}
                    </span>
                  </button>
                </div>

                <div className="ev-row__actions flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                  {docIndicator !== 'none' && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(event)}
                      className="ev-action shrink-0"
                      data-filled={docIndicator === 'attached' ? 'ok' : docIndicator === 'missing' ? 'missing' : undefined}
                      data-doc-state={docIndicator}
                      aria-label={`${t('evaluations.doc.title', { activity: event.title })}${docStateSuffix}`}
                      data-tippy-content={eventDocTooltip}
                    >
                      {docIndicator === 'attached'
                        ? <FileCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                        : docIndicator === 'missing'
                          ? <FilePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                          : <FileText className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />}
                      <span className="sr-only">{t('evaluations.doc.open')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenStudents(event)}
                    className="ev-action shrink-0"
                    data-filled={names > 0 ? 'tone' : undefined}
                    aria-label={`${t(event.type === REMARK_EVENT_TYPE ? 'evaluations.notebook.title' : 'evaluations.students.open')} — ${event.title}`}
                    data-tippy-content={eventStudentsTooltip}
                  >
                    <Users className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
                    {names > 0 && (
                      <span className="inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
                        {number.format(names)}
                      </span>
                    )}
                    <span className="sr-only">{t(event.type === REMARK_EVENT_TYPE ? 'evaluations.notebook.title' : 'evaluations.students.open')}{names > 0 ? ` · ${names}` : ''}</span>
                  </button>

                  <AnimatedTrashButton
                    iconOnly
                    size="sm"
                    variant="icon"
                    data-danger="true"
                    onClick={() => onDelete(event)}
                    className="ev-icon-btn shrink-0"
                    aria-label={t('evaluations.deleteEventAria', { title: event.title })}
                    title={deleteTooltip}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <EventDateModal
        isOpen={Boolean(editingDateEvent)}
        onClose={() => setEditingDateEvent(null)}
        event={editingDateEvent}
        onSave={onDateChange}
      />
    </section>
  );
};

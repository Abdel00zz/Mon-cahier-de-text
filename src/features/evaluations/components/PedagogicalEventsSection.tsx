import React, { useMemo, useState } from 'react';
import { EvaluationPolicy, PedagogicalEvent } from '@/types';
import { resolveKindPolicy } from '@/domain/evaluations/evaluationPolicy';
import { REMARK_EVENT_TYPE } from '@/domain/evaluations/notebookCheckRemarks';
import { localizedActivityTitle } from '@/domain/evaluations/activityTitle';
import { documentIndicator, documentRequirementForEvent } from '@/domain/evaluations/documentRequirement';
import { numberFormat } from '@/lib/formatters';
import { useLocale } from '@/i18n/LocaleProvider';
import { ltrIsolate } from '@/lib/text/textDirection';
import { AnimatedTrashButton } from '@/components/ui/AnimatedTrashButton';
import { KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG } from '../kindCatalog';
import { KindGroupHeader } from './KindGroupHeader';
import { EventDateModal } from './EventDateModal';
import { ActionIcon } from './ActionIcon';

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
  /** Politique de la direction : documents et élèves proposés par nature. */
  policy?: EvaluationPolicy;
}

export const PedagogicalEventsSection: React.FC<PedagogicalEventsSectionProps> = ({
  events,
  showHeader = true,
  onDateChange,
  onDelete,
  onOpenDocument,
  onOpenStudents,
  policy,
}) => {
  const { t, locale } = useLocale();
  const number = useMemo(() => numberFormat(locale), [locale]);
  const [editingDateEvent, setEditingDateEvent] = useState<PedagogicalEvent | null>(null);

  if (events.length === 0) return null;

  const formatDateBadge = (date: string, endDate: string | undefined): string => {
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
      // Les dates restent de gauche à droite, la phrase suit la langue.
      return t('evaluations.dateRange', { start: ltrIsolate(`${d1}/${m1}`), end: ltrIsolate(`${d2}/${m2}/${y2}`) });
    }
    return ltrIsolate(formatFull(date));
  };

  return (
    <section className="space-y-2.5 font-sans">
      {showHeader && (
        <div className="px-1">
          <KindGroupHeader
            title={t('evaluations.pedagogicalEvents')}
            tone={KIND_GROUPS[1].tone}
            countLabel={`${number.format(events.length)} ${events.length === 1 ? t('evaluations.eventSingle') : t('evaluations.eventPlural')}`}
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
            // Un titre généré se dit dans la langue de l'écran ; la remarque du cahier reste dans l'éditeur.
            const title = localizedActivityTitle(event.title, event.type, locale);
            // La pastille de nature ne répète pas un titre qui la dit déjà (« Évaluation diagnostique 1 ») ; un titre propre au professeur la garde.
            const sameKind = normalizeLabel(title).startsWith(normalizeLabel(typeLabel)) && /^\d*$/.test(normalizeLabel(title).slice(normalizeLabel(typeLabel).length).trim());
            const showType = !sameKind;

            const kindPolicy = resolveKindPolicy(policy, event.type);
            const docIndicator = documentIndicator(documentRequirementForEvent(event.type, policy), event.document);
            const eventDocTooltip = t(docIndicator === 'attached' ? 'evaluations.tip.eventDocAttached'
              : docIndicator === 'missing' ? 'evaluations.tip.eventDocMissing' : 'evaluations.tip.eventDocIdle');
            const docStateSuffix = docIndicator === 'attached' ? ` — ${t('evaluations.doc.stateAttached')}` : docIndicator === 'missing' ? ` — ${t('evaluations.doc.stateMissing')}` : '';

            const notebookCheck = event.type === REMARK_EVENT_TYPE;
            const eventStudentsTooltip = names > 0
              ? t(notebookCheck ? 'evaluations.tip.notebookSome' : 'evaluations.tip.studentsSome', { count: number.format(names) })
              : t(notebookCheck ? 'evaluations.tip.notebookNone' : 'evaluations.tip.studentsNone');
            const deleteTooltip = t('evaluations.tip.deleteEvent');

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
                </div>


                <div className="ev-row__date">
                  {event.date ? (
                    <button
                      type="button"
                      onClick={() => setEditingDateEvent(event)}
                      className="ev-date-trigger inline-flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold text-foreground transition-all cursor-pointer select-none hover:text-primary hover:bg-muted/40 rounded-md active:scale-95 border-0 shadow-none"
                      aria-label={t('evaluations.assessmentDateAria', { assessment: title })}
                    >
                      <span className="whitespace-nowrap tabular-nums text-xs font-bold">
                        {formatDateBadge(event.date, event.endDate)}
                      </span>
                    </button>
                  ) : (
                    /* La date vient du tableau de l'éditeur : sans date, un simple constat, rien à cliquer. */
                    <span className="ev-date-empty">{t('evaluations.noDateYet')}</span>
                  )}
                </div>
                <div className="ev-row__actions flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                  {docIndicator !== 'none' && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(event)}
                      className="ev-action shrink-0"
                      data-filled={docIndicator === 'attached' ? 'ok' : docIndicator === 'missing' ? 'missing' : undefined}
                      data-doc-state={docIndicator}
                      aria-label={`${t('evaluations.doc.title', { activity: title })}${docStateSuffix}`}
                      data-tippy-content={eventDocTooltip}
                    >
                      <ActionIcon name="document" />
                      <span>{t(docIndicator === 'attached' ? 'evaluations.doc.open' : 'evaluations.action.addContent')}</span>
                    </button>
                  )}
                  {kindPolicy.students && (
                  <button
                    type="button"
                    onClick={() => onOpenStudents(event)}
                    className="ev-action shrink-0"
                    data-filled={names > 0 ? 'tone' : undefined}
                    aria-label={`${t(notebookCheck ? 'evaluations.notebook.title' : 'evaluations.students.open')} — ${title}${names > 0 ? ` · ${number.format(names)}` : ''}`}
                    data-tippy-content={eventStudentsTooltip}
                  >
                    <ActionIcon name="students" />
                    <span>{t('evaluations.action.students')}</span>
                    {names > 0 && <span className="ev-action__count">{number.format(names)}</span>}
                  </button>
                  )}

                  <AnimatedTrashButton
                    iconOnly
                    size="sm"
                    variant="icon"
                    data-danger="true"
                    onClick={() => onDelete(event)}
                    className="ev-icon-btn shrink-0"
                    aria-label={t('evaluations.deleteEventAria', { title })}
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

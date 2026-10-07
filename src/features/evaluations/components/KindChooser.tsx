import React from 'react';
import { ChevronRight, Plus, Undo2 } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { dateTimeFormat } from '@/lib/formatters';
import { useLocale } from '@/i18n/LocaleProvider';
import { KIND_GROUPS, kindLabelKey, type EvaluationKind } from '../kindCatalog';
import { KindGroupHeader } from './KindGroupHeader';

/*
 * CHOISIR LA NATURE, PUIS SAISIR LES CHAMPS.
 *
 * Deux étapes, jamais un formulaire qui commence par une liste déroulante de
 * quinze entrées : la première ne demande rien d'autre que la nature (devoir,
 * contrôle des cahiers, olympiade, contrôle oral, devoir maison…), présentée en
 * cartes colorées — mêmes cartes que celles de la page principale, donc le
 * professeur reconnaît la couleur et l'icône qu'il verra ensuite. La seconde
 * n'affiche QUE les champs de cette nature (`KindHeader` rappelle le choix et
 * permet d'y revenir). Loi de Hick : moins de décisions par écran.
 *
 * Aucune barre de recherche : quinze natures tiennent sur un écran de téléphone,
 * une recherche ajouterait un geste sans rien résoudre.
 */

/** Fil d'étapes : où l'on est dans le parcours, sans texte inutile. */
export const StepTrail: React.FC<{ step: 1 | 2; label: string }> = ({ step, label }) => {
  const { t } = useLocale();
  return (
    <ol className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold" aria-label={t('evaluations.add')}>
      <li
        aria-current={step === 1 ? 'step' : undefined}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5',
          step === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
        )}
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
        {t('evaluations.stepKind')}
      </li>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
      {step === 2 && (
        <li aria-current="step" className="truncate font-bold text-foreground">{label}</li>
      )}
    </ol>
  );
};

export const KindChooser: React.FC<{ onSelect: (kind: EvaluationKind) => void }> = ({ onSelect }) => {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{t('evaluations.chooseKindHint')}</p>
      {KIND_GROUPS.map(group => (
        <section key={group.id} className="space-y-2" aria-label={t(group.titleKey)}>
          {/* Une ligne par famille : l'icône, le titre, le nombre de natures —
              exactement l'en-tête de la page principale, donc l'endroit où l'on
              se trouve se reconnaît avant même de lire. */}
          <KindGroupHeader
            title={t(group.titleKey)}
            tone={group.tone}
            Icon={group.Icon}
            count={group.kinds.length}
            headingLevel={4}
          />
          {/*
           * Une colonne sur téléphone, deux dès 640 px : en deux colonnes, un
           * libellé officiel (« Contrôle des cahiers des élèves ») se repliait
           * sur quatre lignes. La grille `data-rows` garde chaque nature lisible
           * d'un seul regard, ce qui est le seul geste demandé ici.
           */}
          <ul className="hub-grid" data-rows>
            {group.kinds.map(kind => {
              const label = t(kindLabelKey(kind));
              return (
                <li key={kind.type} className="min-w-0">
                  <button
                    type="button"
                    data-kind={kind.type}
                    data-kind-family={kind.family}
                    data-tone={kind.style.tone}
                    onClick={() => onSelect(kind)}
                    aria-label={label}
                    className="hub-card h-full w-full"
                    data-layout="row"
                  >
                    <span className="hub-card__icon" aria-hidden="true"><kind.style.Icon /></span>
                    <span className="hub-card__title min-w-0 flex-1 text-start">{label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

/**
 * Bandeau de la 2ᵉ étape : la nature choisie, et le retour au choix. Sans lui,
 * un professeur qui s'est trompé de carte devrait fermer la fenêtre et
 * recommencer — le pas de plus qui fait perdre la saisie.
 */
export const KindHeader: React.FC<{ kind: EvaluationKind; onBack: () => void }> = ({ kind, onBack }) => {
  const { t } = useLocale();
  const label = t(kindLabelKey(kind));
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
      {/* `evaluation-tone` porte `--tone`, `hub-card__icon` la pastille : la même
          icône teintée que la carte choisie à l'étape précédente. */}
      <span className="evaluation-tone hub-card__icon shrink-0" data-tone={kind.style.tone} aria-hidden="true">
        <kind.style.Icon />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{label}</span>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-background cursor-pointer"
      >
        <Undo2 className="h-4 w-4" aria-hidden="true" />
        {t('evaluations.changeKind')}
      </button>
    </div>
  );
};

export interface ProgrammedItem {
  id: string;
  label: string;
  dateISO: string;
  statusLabel: string;
  /** Classes d'état de la page (mêmes pastilles, même vocabulaire). */
  statusClass: string;
  /** Un sujet a déjà été rédigé pour ce devoir. */
  hasDocument: boolean;
}

/**
 * DEUXIÈME ÉTAPE D'UN DEVOIR : LA LISTE PROGRAMMÉE, PAS UN FORMULAIRE VIDE.
 *
 * Les devoirs d'une classe sont déjà programmés — planning officiel, plus les
 * ajouts hors programmation. Le professeur qui choisit « devoir maison » veut
 * donc d'abord VOIR ses devoirs maison, pour ouvrir le sujet du jour, plutôt que
 * de saisir un numéro et une date qui existent déjà. La création libre reste
 * possible, mais en dernier : c'est l'exception, pas le chemin.
 */
export const ProgrammedList: React.FC<{
  items: ProgrammedItem[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}> = ({ items, onOpen, onCreate }) => {
  const { t, locale } = useLocale();
  const dateLabel = dateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
        {items.length > 0 ? t('evaluations.programmedHint') : t('evaluations.programmedEmpty')}
      </p>
      {items.length > 0 && (
        <ul className="hub-grid" data-rows>
          {items.map(item => (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                data-programmed-id={item.id}
                onClick={() => onOpen(item.id)}
                aria-label={`${item.label} — ${dateLabel.format(new Date(item.dateISO))}`}
                className="hub-card h-full w-full"
                data-layout="row"
              >
                <span className="hub-card__body min-w-0 flex-1">
                  <span className="hub-card__title block text-start">{item.label}</span>
                  <span className="hub-card__hint block text-start">{dateLabel.format(new Date(item.dateISO))}</span>
                </span>
                {item.hasDocument && <span className="tone-chip shrink-0">{t('evaluations.doc.open')}</span>}
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1', item.statusClass)}>
                  {item.statusLabel}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* La création hors programmation est le repli : trait discontinu, jamais
          la couleur de l'action principale. */}
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('evaluations.manualCreate')}
      </button>
    </div>
  );
};

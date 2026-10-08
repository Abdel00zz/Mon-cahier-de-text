import React from 'react';
import { cn } from '@/lib/utils';
import { dateTimeFormat } from '@/lib/formatters';
import { useLocale } from '@/i18n/LocaleProvider';
import { KIND_GROUPS, kindLabelKey, type EvaluationKind } from '../kindCatalog';
import { KindGroupHeader } from './KindGroupHeader';

/*
 * LE PARCOURS DE CRÉATION, PAS À PAS.
 *
 * Trois crans, dans l'ordre où un professeur se pose la question :
 *   1. CLASSE — à qui appartient ce travail ? Les grandes cartes des classes,
 *      sans aucune icône : le libellé et le numéro de groupe suffisent ;
 *   2. NATURE — quoi ? Les grandes tuiles colorées (devoir surveillé, contrôle
 *      des cahiers, olympiade, devoir maison…), DEUX PAR LIGNE, qui sont LA
 *      décision de l'écran ;
 *   3. CONTENU — les zones de cette nature : les devoirs déjà programmés (qu'on
 *      ouvre) ou les champs de saisie, groupés et nommés.
 *
 * Le fil d'étapes n'est pas décoratif : un cran déjà franchi se reclique, donc on
 * revient en arrière sans perdre la saisie et sans chercher un bouton. Il porte
 * des NUMÉROS, pas des icônes — dans les zones, l'icône dit la nature d'un
 * devoir, elle ne sert pas à naviguer.
 *
 * Aucune barre de recherche : quinze natures tiennent sur un écran de téléphone,
 * une recherche ajouterait un geste sans rien résoudre.
 */

/** Fil d'étapes — et retour en arrière : c'est la navigation de l'assistant. */
export const StepTrail: React.FC<{ step: 1 | 2; label?: string; onStep?: (step: 1 | 2) => void }> = ({ step, label, onStep }) => {
  const { t } = useLocale();
  const steps: Array<{ id: 1 | 2; label: string }> = [
    { id: 1, label: t('evaluations.stepKind') },
    { id: 2, label: label ?? t('evaluations.stepContent') },
  ];
  return (
    <ol className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold" aria-label={t('evaluations.add')}>
      {steps.map((item, index) => {
        const done = item.id < step;
        const current = item.id === step;
        const content = (
          <>
            <span
              className={cn(
                'grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold',
                current ? 'bg-primary text-primary-foreground' : done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              {item.id}
            </span>
            <span className={cn('truncate', current && 'text-foreground')}>{item.label}</span>
          </>
        );
        return (
          <React.Fragment key={item.id}>
            {index > 0 && <li aria-hidden="true" className="shrink-0 text-muted-foreground">›</li>}
            <li className="min-w-0">
              {done && onStep ? (
                <button
                  type="button"
                  onClick={() => onStep(item.id)}
                  className={cn(
                    'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                    'min-h-6'
                  )}
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5',
                    current ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                  )}
                >
                  {content}
                </span>
              )}
            </li>
          </React.Fragment>
        );
      })}
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
            headingLevel={4}
          />
          {/*
           * DEUX TUILES PAR LIGNE, À TOUTE LARGEUR — même sur un téléphone.
           * Quinze natures sur une colonne, c'était quinze lignes à faire
           * défiler ; à deux par ligne, la famille entière tient presque dans
           * l'écran. Pour que deux colonnes ne rendent pas les cartes plus
           * petites, elles passent au format tuile : la grande icône AU-DESSUS du
           * libellé, la carte plus haute, le texte centré. « Contrôle des cahiers
           * des élèves » se replie sur deux ou trois lignes — mais il reste lu
           * d'un regard, alors qu'une carte-ligne à deux colonnes n'en laisserait
           * qu'un filet.
           */}
          <ul className="hub-grid" data-tiles>
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
                    data-layout="tile"
                  >
                    <span className="hub-card__icon" aria-hidden="true"><kind.style.Icon /></span>
                    <span className="hub-card__title min-w-0">{label}</span>
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
 * Bandeau de l'étape « Contenu » : la nature choisie, et le retour au choix.
 * Sans lui, un professeur qui s'est trompé de carte devrait fermer la fenêtre et
 * recommencer — le pas de plus qui fait perdre la saisie. Texte seul : la nature
 * est déjà écrite, une pastille d'icône ne ferait que répéter le dessin de la
 * carte qu'on vient de quitter.
 */
export const KindHeader: React.FC<{ kind: EvaluationKind; onBack: () => void; backLabel?: string }> = ({ kind, onBack, backLabel }) => {
  const { t } = useLocale();
  const label = t(kindLabelKey(kind));
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{label}</span>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-accent cursor-pointer"
      >
        {backLabel ?? t('evaluations.changeKind')}
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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
      >
        {t('evaluations.manualCreate')}
      </button>
    </div>
  );
};

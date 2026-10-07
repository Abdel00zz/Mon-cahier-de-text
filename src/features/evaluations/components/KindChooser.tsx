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
 *   2. NATURE — quoi ? Les grandes cartes colorées (devoir surveillé, contrôle
 *      des cahiers, olympiade, devoir maison…), qui sont LA décision de l'écran ;
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
export const StepTrail: React.FC<{ step: 1 | 2 | 3; label?: string; onStep?: (step: 1 | 2 | 3) => void }> = ({ step, label, onStep }) => {
  const { t } = useLocale();
  const steps: Array<{ id: 1 | 2 | 3; label: string }> = [
    { id: 1, label: t('evaluations.stepClass') },
    { id: 2, label: t('evaluations.stepKind') },
    { id: 3, label: label ?? t('evaluations.stepContent') },
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

/** Une classe proposée à l'étape 1 : son libellé localisé et son groupe. */
export interface ClassChoice {
  id: string;
  /** Palier reconnu (« 2ème Bac Sc. Physiques »), si le nom en porte un. */
  tier?: string | null;
  title: string;
  group?: string | null;
  fullName: string;
}

/**
 * ÉTAPE 1 — LA CLASSE.
 *
 * Tout ce qui suit lui appartient : la nature, les devoirs déjà programmés, le
 * sujet. On la choisit donc d'abord, et en grandes cartes lisibles. Aucune
 * icône : un libellé, le palier, le numéro de groupe, et la mention « classe
 * active » pour celle qui est déjà ouverte — l'information suffit, et un
 * pictogramme de plus ne dirait rien de la classe.
 */
export const ClassChooser: React.FC<{ classes: ClassChoice[]; currentId: string; onSelect: (id: string) => void }> = ({ classes, currentId, onSelect }) => {
  const { t } = useLocale();
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{t('evaluations.chooseClass')}</p>
      <ul className="hub-grid" data-rows>
        {classes.map(item => {
          const isCurrent = item.id === currentId;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                data-class-id={item.id}
                data-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelect(item.id)}
                className="hub-card class-choice h-full w-full"
                data-layout="row"
                aria-label={item.fullName}
              >
                <span className="hub-card__body min-w-0 flex-1">
                  {item.tier && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{item.tier}</span>
                  )}
                  <span className="hub-card__title block text-start">{item.title}</span>
                  {isCurrent && <span className="tone-chip">{t('evaluations.activeClass')}</span>}
                </span>
                {item.group && (
                  <bdi dir="ltr" className="class-choice__group" aria-hidden="true">{item.group}</bdi>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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
export const KindHeader: React.FC<{ kind: EvaluationKind; onBack: () => void }> = ({ kind, onBack }) => {
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

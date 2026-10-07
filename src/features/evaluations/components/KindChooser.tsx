import React from 'react';
import { ChevronRight, Undo2 } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { KIND_GROUPS, kindLabelKey, type EvaluationKind } from '../kindCatalog';

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

export const KindChooser: React.FC<{ onSelect: (kind: EvaluationKind) => void }> = ({ onSelect }) => {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{t('evaluations.chooseKindHint')}</p>
      {KIND_GROUPS.map(group => (
        <section key={group.id} className="space-y-2" aria-label={t(group.titleKey)}>
          <h4 className="evaluations-category-title text-foreground">{t(group.titleKey)}</h4>
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

import React from 'react';
import { Plus } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { SchedulePlanningIllustration } from '@/components/ui/DynamicIllustration';

/*
 * L'ÉTAT VIDE DE L'ÉCRAN DES ÉVALUATIONS.
 *
 * Aucune surface vide passive (charte §3) : l'illustration, le message
 * d'orientation et le bouton d'action sont TOUJOURS ensemble. Deux tailles :
 * complète (zone entière vide) et compacte (une seule nature sans élément),
 * pour que la même invitation garde le même dessin à toutes les échelles.
 */
export const ActivitiesEmptyState: React.FC<{ onCreate?: () => void; compact?: boolean }> = ({ onCreate, compact = false }) => {
  const { t } = useLocale();
  return (
    <div className={`flex flex-col items-center border border-dashed border-border bg-card/40 text-center ${compact ? 'gap-2 rounded-lg px-4 py-3.5' : 'rounded-xl px-4 py-7'}`}>
      {!compact && <SchedulePlanningIllustration size={120} className="mb-2" />}
      <h4 className="text-sm font-bold text-foreground">{t('evaluations.activitiesEmptyTitle')}</h4>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground text-pretty">
        {t('evaluations.activitiesEmptyHint')}
      </p>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-3.5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-zinc-800 px-3.5 text-xs font-bold text-zinc-100 shadow-xs transition-all hover:bg-zinc-900 active:scale-[0.97] dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.2]" />
          {t('evaluations.addActivity')}
        </button>
      )}
    </div>
  );
};

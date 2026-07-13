import React, { useEffect, useState } from 'react';
import { Indices } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CalendarCheck, CalendarRange, Check, ChevronRight, CircleAlert, Clock, Undo2 } from '@/components/ui/icons';

type EditorActionKind = 'date' | 'schedule' | 'hours';

export interface EditorActionItem {
  id: string;
  kind: EditorActionKind;
  title: string;
  summary: string;
  details: string[];
  source: string;
  primaryLabel: string;
  date?: string;
  indices?: Indices;
  indicesList?: Indices[];
}

interface ActionCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: EditorActionItem[];
  ignoredActions: EditorActionItem[];
  onResolve: (action: EditorActionItem) => void;
  onIgnore: (action: EditorActionItem) => void;
  onRestore: (action: EditorActionItem) => void;
}

const ACTION_ICON = {
  date: CalendarCheck,
  schedule: CalendarRange,
  hours: Clock,
} as const;

export const ActionCenterSheet: React.FC<ActionCenterSheetProps> = ({
  open,
  onOpenChange,
  actions,
  ignoredActions,
  onResolve,
  onIgnore,
  onRestore,
}) => {
  const [index, setIndex] = useState(0);
  const [showIgnored, setShowIgnored] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIndex(current => Math.min(current, Math.max(0, actions.length - 1)));
  }, [actions.length, open]);

  const current = actions[index];
  const Icon = current ? ACTION_ICON[current.kind] : Check;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] rounded-t-[1.75rem] border-t border-slate-200 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[430px] sm:rounded-3xl sm:border"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden />
        <SheetHeader className="text-left">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${actions.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {actions.length > 0 ? <CircleAlert className="h-4.5 w-4.5" /> : <Check className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">Centre d’actions</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                {actions.length > 0
                  ? `${actions.length} point${actions.length > 1 ? 's' : ''} à vérifier, guidé${actions.length > 1 ? 's' : ''} jusqu’à la source.`
                  : 'Aucune action requise. Les points ignorés restent consultables.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {current ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-amber-100 px-4 py-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                Étape {index + 1} sur {actions.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{current.source}</span>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold leading-snug text-slate-950">{current.title}</h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{current.summary}</p>
                </div>
              </div>

              {current.details.length > 0 && (
                <ul className="mt-3 space-y-1.5 rounded-xl bg-white/90 p-3 ring-1 ring-slate-100">
                  {current.details.map((detail, detailIndex) => (
                    <li key={`${current.id}-${detailIndex}`} className="flex items-start gap-2 text-[11px] font-medium leading-relaxed text-slate-600">
                      <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Button type="button" onClick={() => onResolve(current)} className="min-h-11 rounded-xl text-xs font-bold">
                  {current.primaryLabel}
                  <ChevronRight className="ml-2 h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="secondary" onClick={() => onIgnore(current)} className="min-h-11 rounded-xl px-4 text-xs font-bold">
                  Ignorer ce point
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] font-medium leading-relaxed text-slate-400">
                « Ignorer » masque uniquement ce cas. Toute nouvelle anomalie réapparaîtra automatiquement.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-5 text-center">
            <Check className="mx-auto h-5 w-5 text-emerald-600" />
            <p className="mt-2 text-sm font-extrabold text-emerald-800">Tout est clair pour le moment</p>
            <p className="mt-1 text-xs font-medium text-emerald-700/70">Le menu vous préviendra seulement lorsqu’une action concrète sera utile.</p>
          </div>
        )}

        {actions.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-label="Navigation entre les actions">
            {actions.map((action, actionIndex) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setIndex(actionIndex)}
                aria-label={`Afficher l’action ${actionIndex + 1}`}
                className={`h-2 rounded-full transition-all ${actionIndex === index ? 'w-6 bg-amber-500' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
              />
            ))}
          </div>
        )}

        {ignoredActions.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowIgnored(value => !value)}
              className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              <span>{ignoredActions.length} point{ignoredActions.length > 1 ? 's' : ''} ignoré{ignoredActions.length > 1 ? 's' : ''}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showIgnored ? 'rotate-90' : ''}`} />
            </button>
            {showIgnored && (
              <div className="mt-1 space-y-1.5">
                {ignoredActions.map(action => (
                  <div key={action.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-slate-500">{action.title}</span>
                    <button
                      type="button"
                      onClick={() => onRestore(action)}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[10px] font-bold text-primary shadow-sm ring-1 ring-slate-200"
                    >
                      <Undo2 className="h-3 w-3" /> Réactiver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="mt-3 h-10 w-full rounded-xl text-xs font-bold text-slate-500">
          Fermer
        </Button>
      </SheetContent>
    </Sheet>
  );
};

import React, { useState } from 'react';
import { AppConfig } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer, CalendarCheck, CalendarDays, FileText } from '@/components/ui/icons';
import { formatDateDDMMYYYY } from '@/utils/dataUtils';
import { DescriptionVisibilityControl } from '@/features/settings/components/DescriptionVisibilityControl';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

export type PrintMode = 'new' | 'all' | 'custom';
export type PrintHeaderMode = 'first' | 'all' | 'none';
type PrintTextSize = 's' | 'm' | 'l';
type PrintLineSpacing = 'compact' | 'normal' | 'aere';
export interface PrintOptions {
  pageNumbers: boolean;
  /** affichage de l'en-tête administratif dans le document imprimé */
  headerMode: PrintHeaderMode;
  /** taille du texte du document imprimé */
  textSize: PrintTextSize;
  /** espacement entre les lignes (aération) */
  lineSpacing: PrintLineSpacing;
}

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** nombre total de séances datées du cahier */
  totalDates: number;
  /** dates jamais imprimées */
  newDates: string[];
  /** toutes les dates de séances datées (triées) — pour la sélection à la séance */
  allDates: string[];
  /** dates déjà imprimées (pour marquer la liste) */
  printedDates: string[];
  /** dernière impression enregistrée (ISO) ou null */
  lastPrintedAt: string | null;
  /** dernières préférences de mise en page mémorisées pour cette classe */
  savedPrefs?: PrintOptions | null;
  isPrinting?: boolean;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  onPrint: (mode: PrintMode, options: PrintOptions, selectedDates?: string[]) => void;
}

/**
 * Modale d'impression intelligente : montre CE qui a déjà été imprimé et
 * CE qui est nouveau, et recommande le mode le plus économique.
 */
export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  totalDates,
  newDates,
  allDates,
  printedDates,
  lastPrintedAt,
  savedPrefs,
  isPrinting = false,
  config,
  onConfigChange,
  onPrint,
}) => {
  const printedCount = totalDates - newDates.length;
  const hasHistory = lastPrintedAt !== null;
  const recommendNew = hasHistory && newDates.length > 0;
  const [mode, setMode] = useState<PrintMode>(recommendNew ? 'new' : 'all');
  const [pageNumbers, setPageNumbers] = useState(savedPrefs?.pageNumbers ?? true);
  const [headerMode, setHeaderMode] = useState<PrintHeaderMode>(savedPrefs?.headerMode ?? 'first');
  const [textSize, setTextSize] = useState<PrintTextSize>(savedPrefs?.textSize ?? 'm');
  const [lineSpacing, setLineSpacing] = useState<PrintLineSpacing>(savedPrefs?.lineSpacing ?? 'normal');
  // sélection à la séance : par défaut, les nouveautés (ou tout si aucune nouveauté)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(newDates.length > 0 ? newDates : allDates)
  );
  const printedSet = React.useMemo(() => new Set(printedDates), [printedDates]);
  const toggleDate = (date: string) =>
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

  /** petit sélecteur segmenté réutilisé pour la taille et l'aération */
  const Segmented = <T extends string>({ value, onChange, options }: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
  }) => (
    <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-0.5 shadow-xs">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-150 ${
            value === opt.value ? 'bg-primary text-primary-foreground shadow-xs border border-primary' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  // à chaque ouverture : resynchronise le mode recommandé, la sélection de
  // séances et les préférences de mise en page mémorisées pour cette classe.
  React.useEffect(() => {
    if (!isOpen) return;
    setMode(recommendNew ? 'new' : 'all');
    setSelectedDates(new Set(newDates.length > 0 ? newDates : allDates));
    if (savedPrefs) {
      setPageNumbers(savedPrefs.pageNumbers);
      setHeaderMode(savedPrefs.headerMode ?? 'first');
      setTextSize(savedPrefs.textSize);
      setLineSpacing(savedPrefs.lineSpacing);
    } else {
      // Évite de réutiliser silencieusement les préférences d'une autre
      // classe lorsque celle-ci n'a encore aucune préférence enregistrée.
      setPageNumbers(true);
      setHeaderMode('first');
      setTextSize('m');
      setLineSpacing('normal');
    }
  }, [allDates, isOpen, newDates, recommendNew, savedPrefs]);

  const ModeCard: React.FC<{
    value: PrintMode;
    title: string;
    subtitle: string;
    badge?: string;
    disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }> = ({ value, title, subtitle, badge, disabled, icon: Icon }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setMode(value)}
      className={`relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-150 ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : mode === value
            ? 'border-zinc-300 bg-zinc-50/50 shadow-xs'
            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/40'
      }`}
      aria-pressed={mode === value}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${mode === value ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-400'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-xs font-bold text-zinc-800">
          {title}
          {badge && <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{subtitle}</span>
      </span>
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-zinc-700" />
          Impression intelligente
        </span>
      }
      description="L'application sait ce qui a déjà été imprimé — n'imprimez que le nécessaire"
      maxWidth="md"
      className="h-[calc(100dvh-0.75rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:h-auto"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl">Annuler</Button>
          <Button
            type="button"
            disabled={isPrinting || (mode === 'custom' && selectedDates.size === 0)}
            onClick={() => onPrint(mode, { pageNumbers, headerMode, textSize, lineSpacing }, mode === 'custom' ? Array.from(selectedDates) : undefined)}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-sm"
          >
            {isPrinting ? 'Préparation…' : <>Imprimer {mode === 'new'
              ? `(${newDates.length} séance${newDates.length > 1 ? 's' : ''})`
              : mode === 'custom'
                ? `(${selectedDates.size} séance${selectedDates.size > 1 ? 's' : ''})`
                : '(complet)'}</>}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* État de l'impression */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200/60 p-2.5">
            <div className="text-base font-black text-zinc-800">{totalDates}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Séances</div>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200/60 p-2.5">
            <div className="text-base font-black text-zinc-500">{printedCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Imprimées</div>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
            <div className="text-base font-black text-emerald-700">{newDates.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600/85">Nouvelles</div>
          </div>
        </div>

        {lastPrintedAt && (
          <p className="text-center text-[10px] font-medium text-zinc-400">
            Dernière impression : {formatDateDDMMYYYY(lastPrintedAt.slice(0, 10))}
          </p>
        )}

        {/* Choix du mode */}
        <div className="space-y-2">
          <ModeCard
            value="new"
            icon={CalendarCheck}
            title="Nouveautés seulement"
            subtitle={
              newDates.length > 0
                ? `Uniquement les ${newDates.length} séance(s) jamais imprimée(s) — les titres de chapitres/sections sont conservés pour le contexte.`
                : 'Aucune nouvelle séance depuis la dernière impression.'
            }
            badge={recommendNew ? 'Recommandé' : undefined}
            disabled={newDates.length === 0}
          />
          <ModeCard
            value="all"
            icon={FileText}
            title="Document complet"
            subtitle="Tout le cahier, y compris les séances déjà imprimées."
          />
          <ModeCard
            value="custom"
            icon={CalendarDays}
            title="Sélection personnalisée"
            subtitle="Cochez précisément les séances à imprimer, date par date."
            disabled={allDates.length === 0}
          />
        </div>

        {/* Aperçu des nouvelles dates */}
        {mode === 'new' && newDates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center py-1 bg-zinc-50/50 border border-zinc-100 rounded-xl p-2">
            {newDates.slice(0, 12).map(date => (
              <span key={date} className="rounded-full bg-zinc-100 border border-zinc-200/60 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                {formatDateDDMMYYYY(date)}
              </span>
            ))}
            {newDates.length > 12 && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                +{newDates.length - 12} autres
              </span>
            )}
          </div>
        )}

        {/* Sélection à la séance : liste cochable de toutes les dates */}
        {mode === 'custom' && allDates.length > 0 && (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-700">
                Séances à imprimer ({selectedDates.size}/{allDates.length})
              </span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                <button type="button" onClick={() => setSelectedDates(new Set(allDates))} className="hover:text-zinc-800 transition-colors">Tout</button>
                <span className="text-zinc-200">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedDates(new Set(newDates))}
                  disabled={newDates.length === 0}
                  className="hover:text-zinc-800 disabled:opacity-40 transition-colors"
                >
                  Nouveautés
                </button>
                <span className="text-zinc-200">|</span>
                <button type="button" onClick={() => setSelectedDates(new Set())} className="hover:text-zinc-800 transition-colors">Rien</button>
              </div>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {allDates.map(date => {
                const isNew = !printedSet.has(date);
                return (
                  <label
                    key={date}
                    className="flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-zinc-150 bg-white px-2.5 py-1.5 hover:bg-zinc-50/80"
                  >
                    <Checkbox
                      checked={selectedDates.has(date)}
                      onCheckedChange={() => toggleDate(date)}
                    />
                    <span className="text-xs font-semibold text-zinc-700">{formatDateDDMMYYYY(date)}</span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                        isNew ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-zinc-100 border-zinc-200/50 text-zinc-500'
                      }`}
                    >
                      {isNew ? 'Nouvelle' : 'Déjà imprimée'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Mise en page : taille du texte et aération des lignes */}
        <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-700">Taille du texte</span>
            <Segmented
              value={textSize}
              onChange={(v) => setTextSize(v as any)}
              options={[
                { value: 's', label: 'Petit' },
                { value: 'm', label: 'Normal' },
                { value: 'l', label: 'Grand' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-700">Espacement des lignes</span>
            <Segmented
              value={lineSpacing}
              onChange={(v) => setLineSpacing(v as any)}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'normal', label: 'Normal' },
                { value: 'aere', label: 'Aéré' },
              ]}
            />
          </div>
          <p className="text-[10px] leading-snug text-zinc-400">
            « Compact » économise le papier ; « Aéré » facilite les annotations manuscrites.
          </p>
        </div>

        <DescriptionVisibilityControl
          context="print"
          mode={config.printDescriptionMode ?? 'all'}
          types={config.printDescriptionTypes ?? []}
          onChange={next => onConfigChange({ printDescriptionMode: next.mode, printDescriptionTypes: next.types })}
        />

        {/* Options d'impression */}
        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
          <span>
            <span className="block text-xs font-bold text-zinc-700">Numéroter les pages</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">
              Affiche « Page X / N » en bas. Dans Chrome, cochez aussi « En-têtes et pieds de page » du dialogue d'impression.
            </span>
          </span>
          <Switch
            checked={pageNumbers}
            onCheckedChange={setPageNumbers}
            className="mt-0.5"
          />
        </label>

        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="block text-xs font-bold text-zinc-700">En-tête du document</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">
                Par défaut, il apparaît seulement sur la première page.
              </span>
            </div>
            <Segmented
              value={headerMode}
              onChange={(v) => setHeaderMode(v as PrintHeaderMode)}
              options={[
                { value: 'first', label: '1re page' },
                { value: 'all', label: 'Toutes' },
                { value: 'none', label: 'Aucun' },
              ]}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

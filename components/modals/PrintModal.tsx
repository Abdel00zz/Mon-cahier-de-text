import React, { useState } from 'react';
import { AppConfig } from '../../types';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Printer, CalendarCheck, FileText } from '../ui/icons';
import { formatDateDDMMYYYY } from '../../utils/dataUtils';
// DescriptionVisibilityControl import removed

export type PrintMode = 'new' | 'all';
export type PrintTextSize = 's' | 'm' | 'l';
export type PrintLineSpacing = 'compact' | 'normal' | 'aere';
export interface PrintOptions {
  pageNumbers: boolean;
  /** taille du texte du document imprimé */
  textSize: PrintTextSize;
  /** espacement entre les lignes (aération) */
  lineSpacing: PrintLineSpacing;
}

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** toutes les dates de séances du cahier */
  totalDates: number;
  /** dates jamais imprimées */
  newDates: string[];
  /** dernière impression enregistrée (ISO) ou null */
  lastPrintedAt: string | null;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  onPrint: (mode: PrintMode, options: PrintOptions) => void;
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
  lastPrintedAt,
  config,
  onConfigChange,
  onPrint,
}) => {
  const printedCount = totalDates - newDates.length;
  const hasHistory = lastPrintedAt !== null;
  const recommendNew = hasHistory && newDates.length > 0;
  const [mode, setMode] = useState<PrintMode>(recommendNew ? 'new' : 'all');
  const [pageNumbers, setPageNumbers] = useState(true);
  const [textSize, setTextSize] = useState<PrintTextSize>('m');
  const [lineSpacing, setLineSpacing] = useState<PrintLineSpacing>('normal');

  /** petit sélecteur segmenté réutilisé pour la taille et l'aération */
  const Segmented = <T extends string>({ value, onChange, options }: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
  }) => (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
            value === opt.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  // resynchronise le choix recommandé à chaque ouverture
  React.useEffect(() => {
    if (isOpen) setMode(recommendNew ? 'new' : 'all');
  }, [isOpen, recommendNew]);

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
      className={`relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : mode === value
            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
            : 'border-border bg-card hover:border-primary/40'
      }`}
      aria-pressed={mode === value}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mode === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          {title}
          {badge && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase text-success">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-primary" />
          Impression intelligente
        </span>
      }
      description="L'application sait ce qui a déjà été imprimé — n'imprimez que le nécessaire"
      maxWidth="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="button" variant="default" onClick={() => onPrint(mode, { pageNumbers, textSize, lineSpacing })}>
            Imprimer {mode === 'new' ? `(${newDates.length} séance${newDates.length > 1 ? 's' : ''})` : '(complet)'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* État de l'impression */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary/50 p-2.5">
            <div className="text-lg font-black text-foreground/80">{totalDates}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Séances datées</div>
          </div>
          <div className="rounded-xl bg-secondary/50 p-2.5">
            <div className="text-lg font-black text-muted-foreground">{printedCount}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Déjà imprimées</div>
          </div>
          <div className="rounded-xl bg-success/10 p-2.5">
            <div className="text-lg font-black text-success">{newDates.length}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-success/70">Nouvelles</div>
          </div>
        </div>

        {lastPrintedAt && (
          <p className="text-center text-[11px] text-muted-foreground/60">
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
        </div>

        {/* Aperçu des nouvelles dates */}
        {mode === 'new' && newDates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {newDates.slice(0, 12).map(date => (
              <span key={date} className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {formatDateDDMMYYYY(date)}
              </span>
            ))}
            {newDates.length > 12 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                +{newDates.length - 12} autres
              </span>
            )}
          </div>
        )}

        {/* Mise en page : taille du texte et aération des lignes */}
        <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground/80">Taille du texte</span>
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
            <span className="text-xs font-semibold text-foreground/80">Espacement des lignes</span>
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
          <p className="text-[10px] leading-snug text-muted-foreground/60">
            « Compact » économise le papier ; « Aéré » facilite les annotations manuscrites.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground/80">Descriptions dans le PDF</span>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              {(['all', 'none'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onConfigChange({ printDescriptionMode: mode })}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    (config.printDescriptionMode || 'all') === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'all' ? 'Afficher' : 'Masquer'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] leading-snug text-muted-foreground/60">
            Permet de masquer les descriptions de cours dans le fichier PDF imprimé.
          </p>
        </div>

        {/* Options d'impression */}
        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border bg-secondary/50 p-3">
          <span>
            <span className="block text-xs font-semibold text-foreground/80">Numéroter les pages</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground/60">
              Affiche « Page X / N » en bas. Dans Chrome, cochez aussi « En-têtes et pieds de page » du dialogue d'impression.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={pageNumbers}
            onClick={() => setPageNumbers(v => !v)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${pageNumbers ? 'bg-primary' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${pageNumbers ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </label>
      </div>
    </Modal>
  );
};

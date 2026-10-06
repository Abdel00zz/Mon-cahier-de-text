import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { renderDescriptionWithBold } from '@/components/typography/textFormat';
import { CONTENT_DOCUMENT_WARN_CHARS, MAX_CONTENT_DOCUMENT_CHARS } from '@/constants/contentDocument';
import { SUPPORTED_HTML_TAGS } from '@/lib/text/htmlTags';
import { useLocale } from '@/i18n/LocaleProvider';
import { Eye, Pencil } from '@/components/ui/icons';
import type { ContentDocument } from '@/types';

/*
 * Document pédagogique rédigé par le professeur : sujet de devoir surveillé,
 * devoir maison, olympiade, corrigé.
 *
 * Une seule SOURCE, deux onglets — « Source » pour écrire, « Aperçu » pour
 * relire. L'aperçu passe par `renderDescriptionWithBold`, exactement le moteur
 * qui compose les descriptions de séances : mêmes listes, mêmes formules KaTeX,
 * mêmes balises de mise en forme. Ce que l'enseignant relit ici est donc ce que
 * le carnet et le papier produisent — pas un rendu parallèle qui dériverait.
 *
 * Aucun HTML n'est exécuté : le moteur rend des nœuds React, une balise inconnue
 * reste du texte.
 */

interface ContentDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  document?: ContentDocument;
  onSave: (source: string) => void;
}

/** Rappel de syntaxe : les jetons sont universels, seul l'entourage est traduit. */
const SYNTAX_SAMPLES: ReadonlyArray<readonly [string, string]> = [  ['# Devoir surveillé 3', 'evaluations.doc.syntaxTitle'],
  ['## Exercice 1', 'evaluations.doc.syntaxExercise'],
  ['[[2pts]]', 'evaluations.doc.syntaxBareme'],  ['**gras**', 'editContent.formatBold'],
  ['*italique*', 'editContent.formatItalic'],
  ['++souligné++', 'editContent.formatUnderline'],
  ['==surligné==', 'evaluations.doc.syntaxHighlight'],
  ['- puce', 'editContent.formatBullets'],
  ['1. numéroté', 'editContent.formatNumbered'],
  ['\\begin{enumerate} \\item …', 'evaluations.doc.syntaxList'],
  ['$x^2+1$', 'editContent.formatMath'],
  ['$$\\frac{a}{b}$$', 'evaluations.doc.syntaxDisplayMath'],
];

export const ContentDocumentModal: React.FC<ContentDocumentModalProps> = ({
  isOpen,
  onClose,
  document: saved,
  onSave,
}) => {
  const { t } = useLocale();
  const [tab, setTab] = useState<'source' | 'preview'>('source');
  const [source, setSource] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Le document est rechargé à chaque ouverture : deux devoirs ne partagent
  // jamais le même brouillon, et fermer sans enregistrer laisse le précédent.
  useEffect(() => {
    if (!isOpen) return;
    setSource(saved?.source ?? '');
    setTab('source');
    setShowHelp(false);
  }, [isOpen, saved?.source]);

  const length = source.length;
  const isTooLong = length > MAX_CONTENT_DOCUMENT_CHARS;
  const isTight = length > CONTENT_DOCUMENT_WARN_CHARS;

  // L'aperçu n'est composé QUE lorsque son onglet est visible : écrire ne
  // déclenche donc aucune composition KaTeX, aussi longue soit la formule.
  const preview = useMemo(
    () => (tab === 'preview' && source.trim() ? renderDescriptionWithBold(source) : null),
    [tab, source],
  );

  const handleSave = () => {
    if (isTooLong) return;
    onSave(source.trim() ? source : '');
    toast.success(source.trim() ? t('evaluations.doc.saved') : t('evaluations.doc.cleared'));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      className="document-modal-frame"
      headerClassName="border-b border-border/70"
      title={t('documentPreview.heading')}
    >
      <div className="space-y-3.5">
        {/* Deux onglets plutôt que deux colonnes : sur téléphone, la feuille est
            haute et étroite — on écrit OU on relit, jamais les deux à moitié. */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1">
          {(['source', 'preview'] as const).map((value) => {
            const isActive = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setTab(value); if (value === 'source') textareaRef.current?.focus(); }}
                aria-pressed={isActive}
                className={cn(
                  'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md text-xs font-semibold transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none cursor-pointer',
                  isActive
                    ? 'bg-card text-foreground shadow-xs ring-1 ring-border/70'
                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
              >
                {value === 'source' ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {t(value === 'source' ? 'evaluations.doc.source' : 'evaluations.doc.preview')}
              </button>
            );
          })}
        </div>

        {tab === 'source' ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={10}
              dir="auto"
              spellCheck={false}
              placeholder={t('evaluations.doc.placeholder')}
              aria-label={t('evaluations.doc.source')}
              className="min-h-[9rem] resize-y font-mono text-[12.5px] leading-relaxed"
            />
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => setShowHelp(open => !open)}
                className="min-h-11 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                aria-expanded={showHelp}
              >
                {t('evaluations.doc.helpToggle')}
              </button>
              <span className={cn('text-[11px] font-semibold tabular-nums', isTooLong ? 'text-destructive' : isTight ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                {t('evaluations.doc.counter', { count: length, max: MAX_CONTENT_DOCUMENT_CHARS })}
              </span>
            </div>
            {showHelp && (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <p className="mb-2 text-[11px] font-bold text-foreground">{t('evaluations.doc.helpTitle')}</p>
                <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {SYNTAX_SAMPLES.map(([sample, labelKey]) => (
                    <div key={sample} className="flex items-baseline gap-2 text-[11px]">
                      <dt className="shrink-0 rounded-md bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-foreground ring-1 ring-border/70" dir="ltr">{sample}</dt>
                      <dd className="min-w-0 text-muted-foreground">{t(labelKey)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  {t('evaluations.doc.helpHtml', { tags: SUPPORTED_HTML_TAGS.map(tag => `<${tag}>`).join(' ') })}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {t('evaluations.doc.helpGuide')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="document-preview-paper max-h-[24rem] overflow-y-auto border border-border/80 bg-card p-4 sm:max-h-[30rem] sm:p-7">
            {preview ? (
              /* La feuille est une PAGE : colonne de lecture bornée, jamais
                 étirée sur toute la largeur d'un grand écran. */
              <div className="devoir-document mx-auto max-w-[44rem]" dir="auto">{preview}</div>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">{t('evaluations.doc.empty')}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-md bg-muted px-4 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isTooLong}
            className="h-11 rounded-md bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs transition-[filter,transform] duration-200 hover:brightness-110 active:brightness-90 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

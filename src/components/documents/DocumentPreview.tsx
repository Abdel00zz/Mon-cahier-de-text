import React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { FileText } from '../ui/icons';
import { renderDescriptionWithBold } from '../typography/textFormat';
import { useLocale } from '../../i18n/LocaleProvider';

/*
 * Aperçu d'un document pédagogique du professeur : le sujet d'un devoir, un
 * corrigé, une fiche.
 *
 * Minimal PAR CONSTRUCTION : un titre, la page composée, un bouton. Aucun
 * onglet, aucun champ, aucun enregistrement — donc rien à charger, à valider ni
 * à synchroniser. La page est composée par le MÊME moteur que la feuille de
 * devoir (`renderDescriptionWithBold` dans `.devoir-document`) : ce que le
 * professeur relit ici est ce qu'il voit dans sa fiche de contenu et ce que la
 * direction relit dans la sienne.
 *
 * Performance : le composable n'est calculé QUE lorsque la fenêtre est ouverte
 * (`useMemo` sur `isOpen`), et le document est déjà en mémoire — ouvrir un
 * sujet ne déclenche donc aucune lecture réseau ni aucune composition KaTeX
 * tant que la fenêtre est fermée.
 */

export interface DocumentPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    /** Titre du document : « Devoir maison 1 », « Olympiade »… */
    title: string;
    /** Contexte : classe, matière, professeur. */
    subtitle?: string;
    /** Source rédigée (Markdown simplifié + LaTeX + balises). */
    source?: string | null;
    /** « Mise à jour le … », déjà mis en forme par l'appelant. */
    updatedLabel?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    source,
    updatedLabel,
}) => {
    const { t } = useLocale();
    const page = React.useMemo(
        () => (isOpen && source?.trim() ? renderDescriptionWithBold(source) : null),
        [isOpen, source],
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="3xl"
            className="sm:rounded-2xl"
            headerClassName="border-b border-border/70"
            /* La barre du haut ne porte QUE la phrase de cadrage : le nom du
               devoir et la classe appartiennent au document, pas à la fenêtre —
               ils sont donc dans l'en-tête de la feuille, juste sous la barre. */
            title={t('documentPreview.heading')}
        >
            <div className="space-y-3">
                {/* En-tête du document : nom du devoir, contexte (classe), date de
                    rédaction. Une ligne, trois informations, aucune redondance
                    avec la barre de la fenêtre. */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                        <FileText className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-primary" aria-hidden="true" />
                        <span className="document-preview-title min-w-0 break-words">{title}</span>
                        {subtitle && <span className="min-w-0 break-words text-xs font-medium text-muted-foreground">{subtitle}</span>}
                    </div>
                    {updatedLabel && <span className="text-[11px] font-medium text-muted-foreground">{updatedLabel}</span>}
                </div>
                <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-5 sm:p-7">
                    {page ? (
                        <div className="devoir-document mx-auto max-w-[44rem]" dir="auto">{page}</div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <FileText className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">{t('documentPreview.empty')}</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end border-t border-border/60 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">{t('common.close')}</Button>
                </div>
            </div>
        </Modal>
    );
};

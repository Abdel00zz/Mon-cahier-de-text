import React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { FileText } from '../ui/icons';
import { renderDescriptionWithBold } from '../typography/textFormat';
import { useLocale } from '../../i18n/LocaleProvider';
import { DocumentPrintButton } from './DocumentPrintButton';

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
    source,
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
            maxWidth="2xl"
            className="document-modal-frame"
            headerClassName="border-b border-border/70"
            bodyClassName="document-preview-body overflow-y-auto"
            footer={
                <Button type="button" variant="outline" onClick={onClose} className="rounded-md">{t('common.close')}</Button>
            }
            /* Le document commence directement : aucun contexte ajouté. */
            title={<span className="flex w-full items-center gap-3"><span>{t('documentPreview.heading')}</span><DocumentPrintButton source={source} /></span>}
        >
            <div className="space-y-3">
                <div className="document-preview-paper border border-border/80 bg-card p-5 sm:p-7">
                    {page ? (
                        <div className="devoir-document mx-auto max-w-[44rem]" dir="auto">{page}</div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <FileText className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">{t('documentPreview.empty')}</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

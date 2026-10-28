import React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { FileText } from '../ui/icons';
import { renderDescriptionWithBold } from '../typography/textFormat';
import { useLocale } from '../../i18n/LocaleProvider';
import { DocumentPrintButton } from './DocumentPrintButton';
import { DocumentSheetHeader } from './DocumentSheetHeader';
import { detectDocumentContentDirection, parseDocumentSheet } from '../../domain/evaluations/documentSheet';
import { resolveDocumentDirection, textDirectionAttribute } from '../../lib/text/textDirection';

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
    /** Classe, portée à l'autre bord de l'en-tête de la feuille. */
    classLabel?: string;
    /** Source rédigée (Markdown simplifié + LaTeX + balises). */
    source?: string | null;
    /** « Mise à jour le … », déjà mis en forme par l'appelant. */
    updatedLabel?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
    isOpen,
    onClose,
    title,
    classLabel,
    source,
}) => {
    const { t, isRtl } = useLocale();
    const sheet = React.useMemo(
        () => parseDocumentSheet(source, title, classLabel),
        [source, title, classLabel],
    );
    const page = React.useMemo(
        () => (isOpen && source?.trim() ? renderDescriptionWithBold(sheet.body) : null),
        [isOpen, source, sheet.body],
    );
    const sheetDir = detectDocumentContentDirection(source)
        ?? textDirectionAttribute(source)
        ?? resolveDocumentDirection(source, sheet.title ?? title, isRtl ? 'rtl' : 'ltr');

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
            title={<span className="flex w-full items-center gap-3"><span>{t('documentPreview.heading')}</span><DocumentPrintButton source={source} title={sheet.title ?? title} classLabel={sheet.classLabel ?? classLabel} className="ms-auto" /></span>}
        >
            <div className="space-y-3">
                <div className="document-preview-paper border border-border/80 bg-card p-3.5 sm:p-5">
                    {page ? (
                        <div dir={sheetDir}>
                            <DocumentSheetHeader title={sheet.title} classLabel={sheet.classLabel} dir={sheetDir} />
                            <div className="devoir-document mx-auto max-w-[56rem]" dir={sheetDir}>{page}</div>
                        </div>
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

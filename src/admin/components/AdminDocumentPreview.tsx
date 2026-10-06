import React from 'react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { useLocale } from '../../i18n/LocaleProvider';
import { renderDescriptionWithBold } from '../../components/typography/textFormat';

/*
 * Relecture d'un document du professeur par la direction.
 *
 * La page est composée par le MÊME moteur que celle du professeur
 * (`renderDescriptionWithBold`) dans la même feuille (`.devoir-document`) :
 * ce que la direction relit ici est exactement ce que le professeur voit et
 * imprime — jamais un rendu parallèle qui dériverait.
 *
 * Lecture seule, par conception : la source appartient au professeur, la
 * direction la consulte, l'imprime au besoin (via le navigateur) et ne la
 * modifie pas.
 */

interface AdminDocumentPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    /** Titre du document : « Devoir surveillé n°2 », « Olympiade »… */
    title: string;
    /** Contexte : classe et professeur. */
    subtitle?: string;
    /** Source rédigée par le professeur, quand elle existe. */
    source?: string | null;
    /** « mise à jour le … », déjà mis en forme par l'appelant. */
    updatedLabel?: string;
    /** Ce qui manque, dit sans reproche quand aucun document n'existe. */
    emptyLabel?: string;
}

export const AdminDocumentPreview: React.FC<AdminDocumentPreviewProps> = ({
    isOpen,
    onClose,
    source,
    emptyLabel = 'Le professeur n’a pas encore rédigé ce document.',
}) => {
    const { t } = useLocale();
    const hasDocument = Boolean(source && source.trim());
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="3xl"
            className="document-modal-frame"
            headerClassName="border-b border-border/70"
            title={t('documentPreview.heading')}
        >
            <div className="space-y-3">
                <div className="document-preview-paper max-h-[60vh] overflow-y-auto border border-border/80 bg-card p-5 sm:p-7">
                    {hasDocument ? (
                        <div className="devoir-document mx-auto max-w-[44rem]" dir="auto">
                            {renderDescriptionWithBold(source)}
                        </div>
                    ) : (
                        <p className="py-10 text-center text-xs text-muted-foreground">{emptyLabel}</p>
                    )}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Fermer</Button>
                </div>
            </div>
        </Modal>
    );
};

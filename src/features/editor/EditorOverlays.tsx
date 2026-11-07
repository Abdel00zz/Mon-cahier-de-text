import React, { type ComponentProps } from 'react';
import { SelectionBar } from './SelectionBar';
import { PrintModal } from './modals/PrintModal';
import { EditorModals } from './EditorModals';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateReviewModal } from './modals/DateReviewModal';
import { TimetableNudgeModal } from './modals/TimetableNudgeModal';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { AppBootSkeleton } from '@/components/ui/PageSkeleton';
import { useLocale } from '@/i18n/LocaleProvider';

interface EditorOverlaysProps {
  selectionBar: ComponentProps<typeof SelectionBar> | null;
  printModal: ComponentProps<typeof PrintModal>;
  editorModals: ComponentProps<typeof EditorModals>;
  evaluationConflict: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void };
  dateReview: ComponentProps<typeof DateReviewModal>;
  timetableNudge: ComponentProps<typeof TimetableNudgeModal>;
  documentPreview: ComponentProps<typeof DocumentPreview>;
  printConfirmation: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void };
  bulkDelete: { open: boolean; count: number; onOpenChange: (open: boolean) => void; onConfirm: () => void };
  mathPreparing: boolean;
}

/** Toutes les surfaces qui se posent AU-DESSUS du cahier, dans un ordre stable. */
export const EditorOverlays: React.FC<EditorOverlaysProps> = ({
  selectionBar, printModal, editorModals, evaluationConflict, dateReview,
  timetableNudge, documentPreview, printConfirmation, bulkDelete, mathPreparing,
}) => {
  const { t } = useLocale();
  return (
    <>
      {selectionBar && <SelectionBar {...selectionBar} />}
      <PrintModal {...printModal} />
      <EditorModals {...editorModals} />
      <ConfirmDialog
        open={evaluationConflict.open}
        onOpenChange={open => { if (!open) evaluationConflict.onCancel(); }}
        title={t('evaluations.conflict.title')}
        description={evaluationConflict.message}
        variant="default"
        confirmLabel={t('dateReview.confirmAria')}
        cancelLabel={t('evaluations.conflict.modify')}
        onConfirm={evaluationConflict.onConfirm}
      />
      <DateReviewModal {...dateReview} />
      <TimetableNudgeModal {...timetableNudge} />
      <DocumentPreview {...documentPreview} />
      <ConfirmDialog
        open={printConfirmation.open}
        onOpenChange={printConfirmation.onOpenChange}
        title={t('print.confirmTitle')}
        description={t('print.confirmDescription')}
        confirmLabel={t('print.confirmDone')}
        cancelLabel={t('print.confirmNotDone')}
        variant="default"
        onConfirm={printConfirmation.onConfirm}
      />
      <ConfirmDialog
        open={bulkDelete.open}
        onOpenChange={bulkDelete.onOpenChange}
        title={t(bulkDelete.count === 1 ? 'bulkDelete.titleOne' : 'bulkDelete.titleMany', { count: bulkDelete.count })}
        description={t('bulkDelete.description')}
        confirmLabel={t('selection.delete')}
        onConfirm={bulkDelete.onConfirm}
      />
      {mathPreparing && <AppBootSkeleton stage="latex" overlay />}
    </>
  );
};

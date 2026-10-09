import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { FileText } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

/** Sibling buttons of the editable remark, never buttons nested inside it. */
export function SessionDocuments({ documents, onOpen }: {
    documents?: readonly NotebookDocumentPreview[];
    onOpen?: (preview: NotebookDocumentPreview) => void;
}) {
    const { t } = useLocale();
    if (!documents?.length || !onOpen) return null;
    return <div className="flex w-full flex-col items-center gap-1 print:hidden" data-session-documents>
        {[...new Map(documents.map(preview => [preview.assessmentId, preview])).values()].map(preview => <button key={preview.assessmentId} type="button" className="editor-doc-chip max-w-full whitespace-normal text-center"
            aria-label={t('documentPreview.openAria', { title: preview.title })}
            onClick={event => { event.stopPropagation(); onOpen(preview); }}>
            <FileText className="h-3 w-3 shrink-0" aria-hidden="true"/>
            <span dir="auto">{preview.title}</span>
        </button>)}
    </div>;
}

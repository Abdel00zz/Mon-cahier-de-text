import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

/** Shared frame for absences, notebook reviews, oral reviews and participants. */
export function StudentReviewDialog({ isOpen, onClose, title, context, tracking = false, children }: {
    isOpen: boolean; onClose: () => void; title: string; context?: string; tracking?: boolean; children: ReactNode;
}) {
    return <Modal isOpen={isOpen} onClose={onClose} maxWidth={tracking ? '2xl' : 'lg'}
        className={cn('evaluation-modal tracking-dialog sm:rounded-2xl', tracking && 'notebook-tracking-modal')}
        bodyClassName={tracking ? 'notebook-tracking-body' : 'px-6 pb-6 pt-2'}
        headerClassName="border-b-0 bg-background pt-5 px-6 pb-2 sm:pt-6 sm:px-8"
        title={<div className="min-w-0 header-left header-titles">
            <span className="block break-words text-[18px] sm:text-[19px] font-extrabold text-[#1f201d] dark:text-foreground tracking-[-0.018em] rtl:tracking-normal leading-snug">{title}</span>
            {context && <p className="mt-0.5 break-words text-[13px] text-[#73746f] dark:text-muted-foreground leading-normal">{context}</p>}
        </div>}>
        {children}
    </Modal>;
}

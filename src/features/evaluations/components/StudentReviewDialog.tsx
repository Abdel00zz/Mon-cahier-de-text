import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

/** Shared frame for absences, notebook reviews, oral reviews and participants. */
export function StudentReviewDialog({ isOpen, onClose, title, context, tracking = false, children }: {
    isOpen: boolean; onClose: () => void; title: string; context?: string; tracking?: boolean; children: ReactNode;
}) {
    return <Modal isOpen={isOpen} onClose={onClose} maxWidth={tracking ? 'xl' : 'md'}
        className={cn('evaluation-modal sm:rounded-2xl', tracking && 'notebook-tracking-modal')}
        bodyClassName={tracking ? 'notebook-tracking-body' : undefined} headerClassName="border-b-0 bg-background"
        title={<div className="flex min-w-0 items-center gap-3"><Users className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <div className="min-w-0"><span className="block break-words text-base font-semibold text-foreground">{title}</span>
                {context && <p className="mt-0.5 break-words text-xs text-muted-foreground">{context}</p>}
            </div></div>}>
        {children}
    </Modal>;
}

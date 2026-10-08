import { MoreVertical, Settings, Trash2, CalendarCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { ClassEvaluationEntry } from '@/types';

export function ClassActionsMenu({ name, triggerClassName, onConfigure, onDelete, onOpenEvaluations }: {
    name: string; triggerClassName: string; onConfigure: () => void; onDelete?: () => void;
    onOpenEvaluations?: (entry: ClassEvaluationEntry) => void;
}) {
    const { t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const open = (entry: ClassEvaluationEntry) => { impact('light'); onOpenEvaluations?.(entry); };
    return <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'}>
        <DropdownMenuTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className={triggerClassName}
            title={t('dashboard.classActions', { className: name })} aria-label={t('dashboard.classActions', { className: name })}>
            <MoreVertical className="h-[18px] w-[18px]" aria-hidden="true"/>
        </button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={3} className="class-actions-menu w-auto min-w-[11.5rem] max-w-[min(16rem,calc(100vw-1rem))] rounded-xl border-border/70 bg-popover p-1 shadow-lg ring-0 backdrop-blur-none [&_[role=menuitem]]:min-h-11 [&_[role=menuitem]]:gap-2 [&_[role=menuitem]]:rounded-lg [&_[role=menuitem]]:px-2.5 [&_[role=menuitem]]:py-1.5 [&_[role=menuitem]]:text-[13px] [&_[role=menuitem]]:font-medium [&_[role=menuitem]]:leading-snug [&_[role=menuitem]]:transition-[background-color,color,transform]">
            {onOpenEvaluations &&
                <DropdownMenuItem onSelect={() => open('all')}><CalendarCheck aria-hidden="true"/>{t('dashboard.openEvaluations')}</DropdownMenuItem>
            }
            <DropdownMenuItem onSelect={() => { impact('light'); onConfigure(); }}><Settings aria-hidden="true"/>{t('dashboard.classSettings')}</DropdownMenuItem>
            {onDelete && <DropdownMenuItem destructive onSelect={() => { impact('medium'); onDelete(); }}><Trash2 aria-hidden="true"/>{t('dashboard.delete')}</DropdownMenuItem>}
        </DropdownMenuContent>
    </DropdownMenu>;
}

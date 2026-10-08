import { MoreVertical, Settings, Trash2, CalendarCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
        <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1rem))] rounded-xl border-border/80 bg-popover/95 p-1.5 [&_[role=menuitem]]:rounded-lg [&_[role=menuitem]]:leading-snug">
            {onOpenEvaluations && <>
                <DropdownMenuItem onSelect={() => open('all')}><CalendarCheck aria-hidden="true"/>{t('dashboard.openEvaluations')}</DropdownMenuItem>
                <DropdownMenuSeparator/>
            </>}
            <DropdownMenuItem onSelect={() => { impact('light'); onConfigure(); }}><Settings aria-hidden="true"/>{t('dashboard.classSettings')}</DropdownMenuItem>
            {onDelete && <><DropdownMenuSeparator/><DropdownMenuItem destructive onSelect={() => { impact('medium'); onDelete(); }}><Trash2 aria-hidden="true"/>{t('dashboard.delete')}</DropdownMenuItem></>}
        </DropdownMenuContent>
    </DropdownMenu>;
}

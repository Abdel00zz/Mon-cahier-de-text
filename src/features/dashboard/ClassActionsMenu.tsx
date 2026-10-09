import { MoreVertical, Settings, Trash2, CalendarCheck } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    return (
        <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={event => event.stopPropagation()}
                    className={triggerClassName}
                    title={t('dashboard.classActions', { className: name })}
                    aria-label={t('dashboard.classActions', { className: name })}
                >
                    <MoreVertical className="h-[18px] w-[18px] stroke-[2.2]" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={isRtl ? 'start' : 'end'}
                sideOffset={5}
                className="class-actions-menu w-auto min-w-[13rem] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border/70 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10"
            >
                {onOpenEvaluations && (
                    <DropdownMenuItem
                        onSelect={() => open('all')}
                        className="group/item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-150 hover:bg-accent/70 focus:bg-accent/70 cursor-pointer"
                    >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 dark:bg-amber-400/18 dark:text-amber-300 transition-transform duration-180 group-hover/item:scale-105">
                            <CalendarCheck className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden="true" />
                        </span>
                        <span className="flex-1 text-start leading-snug">{t('dashboard.openEvaluations')}</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onSelect={() => { impact('light'); onConfigure(); }}
                    className="group/item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-150 hover:bg-accent/70 focus:bg-accent/70 cursor-pointer"
                >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary transition-transform duration-180 group-hover/item:scale-105">
                        <Settings className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-start leading-snug">{t('dashboard.classSettings')}</span>
                </DropdownMenuItem>
                {onDelete && (
                    <>
                        <DropdownMenuSeparator className="my-1 border-t border-border/50" />
                        <DropdownMenuItem
                            destructive
                            onSelect={() => { impact('medium'); onDelete(); }}
                            className="group/item flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-150 hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
                        >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-destructive dark:bg-destructive/18 dark:text-destructive transition-transform duration-180 group-hover/item:scale-105">
                                <Trash2 className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden="true" />
                            </span>
                            <span className="flex-1 text-start leading-snug">{t('dashboard.delete')}</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

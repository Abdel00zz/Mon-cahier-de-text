import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import type { ClassInfo } from '@/types';
import type { useSessionAlerts } from '@/hooks/useSessionAlerts';

type Props = ReturnType<typeof useSessionAlerts> & { classes: ClassInfo[]; autoOpen: boolean; onSelectClass: (item: ClassInfo) => void };
const autoOpened = new Set<string>();
export function SessionAlertBell({ alert, current, classes, autoOpen, onSelectClass }: Props) {
  const { locale, isRtl } = useLocale();
  const reduced = useReducedMotion();
  const [chooser, setChooser] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const lastTargets = useRef<string[]>([]);
  if (alert) lastTargets.current = alert.classIds;
  const targetIds = alert?.classIds ?? (current.classIds.length ? current.classIds : lastTargets.current);
  const targets = classes.filter(item => targetIds.includes(item.id));
  const label = alert?.message ?? (locale === 'ar' ? 'فتح قسم الحصة المعنية' : locale === 'en' ? 'Open the session class' : 'Ouvrir la classe de la séance');
  useEffect(() => {
    if (!autoOpen || current.classIds.length !== 1 || autoOpened.has(current.key) || document.visibilityState !== 'visible' || document.querySelector('[role="dialog"]')) return;
    const target = classes.find(item => item.id === current.classIds[0]);
    if (target) { autoOpened.add(current.key); onSelectClass(target); }
  }, [autoOpen, current, classes, onSelectClass]);
  useEffect(() => {
    if (!chooser) return;
    const close = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setChooser(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setChooser(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [chooser]);
  return <div ref={container} className={`fixed z-40 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 ${isRtl ? 'left-4' : 'right-4'}`}>
    <span role="status" aria-live="polite" className="sr-only">{alert?.message ?? ''}</span>
    {chooser && <div className="mb-2 max-w-72 rounded-2xl border border-border bg-card p-2 shadow-lg">{targets.map(item => <button key={item.id} type="button" className="block min-h-11 w-full rounded-xl px-3 text-start text-sm hover:bg-muted" onClick={() => { setChooser(false); onSelectClass(item); }}>{item.name}</button>)}</div>}
    <motion.button type="button" aria-label={label} title={label} aria-expanded={targets.length > 1 ? chooser : undefined} disabled={!targets.length}
      onClick={() => targets.length === 1 ? onSelectClass(targets[0]) : setChooser(value => !value)}
      className={`flex h-12 w-12 items-center justify-center rounded-2xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 ${alert ? 'bg-amber-100/90 text-amber-800 shadow-[0_4px_20px_rgba(245,158,11,0.18)] dark:bg-amber-950/80 dark:text-amber-300' : 'bg-transparent text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground'}`}
      whileTap={reduced ? undefined : { scale: 0.94 }}>
      <motion.span key={alert?.id ?? 'idle'} style={{ transformOrigin: '50% 15%' }} animate={!reduced && alert ? { rotate: [0, 17, -15, 12, -9, 6, -3, 0] } : { rotate: 0 }} transition={{ duration: 1, repeat: alert && !reduced ? 2 : 0 }}><Bell aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.7} fill={alert ? 'currentColor' : 'none'} fillOpacity={alert ? 0.15 : 0} /></motion.span>
    </motion.button>
  </div>;
}

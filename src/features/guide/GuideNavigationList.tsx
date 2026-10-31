import { motion } from 'framer-motion';
import type { GuideChapter } from '@/constants/guides';
import { cn } from '@/lib/utils';

interface GuideGroup {
  id: string;
  titleAr: string;
  titleFr: string;
  chapterIds: string[];
}

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: 'onboarding',
    titleAr: 'الانطلاقة والتهيئة',
    titleFr: 'Prise en main & Profil',
    chapterIds: ['start', 'profile', 'schedule', 'classes', 'students'],
  },
  {
    id: 'daily',
    titleAr: 'التدبير والتوثيق اليومي',
    titleFr: 'Gestion & Rédaction',
    chapterIds: ['content', 'editor', 'types', 'dates', 'math'],
  },
  {
    id: 'pedagogy',
    titleAr: 'التأطير التربوي والتقويم',
    titleFr: 'Pédagogie & Évaluations',
    chapterIds: ['curriculum', 'legal', 'assessments', 'notifications'],
  },
  {
    id: 'tools',
    titleAr: 'المظهر والبيانات والطباعة',
    titleFr: 'Outils, Impression & Données',
    chapterIds: ['appearance', 'print', 'devices', 'backup', 'troubleshooting'],
  },
];


interface GuideNavigationListProps {
  entries: readonly GuideChapter[];
  results: readonly GuideChapter[];
  query: string;
  activeId?: string;
  isAr: boolean;
  onSelect: (id: string) => void;
}

/** Shared contents list for the phone drawer and desktop sidebar. */
export function GuideNavigationList({ entries, results, query, activeId, isAr, onSelect }: GuideNavigationListProps) {
  const renderEntry = (entry: GuideChapter) => {
    const active = entry.id === activeId;
    return <button key={entry.id} type="button" aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(entry.id)}
      className={cn('relative flex min-h-11 items-center justify-between gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-start cursor-pointer select-none',
        active ? 'text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60')}>
      {active && <motion.span layoutId="guide-toc-active-pill" className="absolute inset-0 rounded-xl bg-primary shadow-xs"
        transition={{ type: 'spring', stiffness: 450, damping: 32 }} />}
      <span className="relative z-10 leading-snug line-clamp-2 flex-1">{entry.title}</span>
      {active && <span className="relative z-10 size-1.5 rounded-full bg-primary-foreground shrink-0" />}
    </button>;
  };
  if (query.trim()) return <div className="space-y-1">
    <p role="status" aria-live="polite" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 mb-1">
      {isAr ? `${results.length} نتيجة مطابقة` : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
    </p>
    {results.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">
      {isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat trouvé'}
    </div> : results.map(renderEntry)}
  </div>;
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  return <div className="space-y-4">{GUIDE_GROUPS.map(group => <div key={group.id} className="space-y-1">
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2 py-0.5">{isAr ? group.titleAr : group.titleFr}</h3>
    <div className="space-y-0.5">{group.chapterIds.map(id => byId.get(id)).filter((entry): entry is GuideChapter => Boolean(entry)).map(renderEntry)}</div>
  </div>)}</div>;
}

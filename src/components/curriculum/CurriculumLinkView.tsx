import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from '@/components/ui/icons';
import type { ClassInfo, LessonsData, OfficialCurriculumPlan } from '@/types';
import { MathTitle } from '@/components/ui/math-title';
import { titleDirection } from '@/domain/notebook/contentDirection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/i18n/LocaleProvider';
import { useClassManager } from '@/hooks/useClassManager';
import { useSync } from '@/contexts/SyncContext';
import { chapterAssociations } from '@/domain/curriculum/officialCurriculum';

/** Les choix s'enregistrent un par un ; la synchronisation, elle, attend la fin d'une série de choix. */
const SYNC_DELAY_MS = 700;

interface Props {
  classInfo: ClassInfo;
  lessonsData: LessonsData;
  plan: OfficialCurriculumPlan;
}

/** Vue « Relier mes chapitres » : chaque chapitre du cahier est relié à un chapitre du programme. */
export function CurriculumLinkView({ classInfo, lessonsData, plan }: Props) {
  const { t, isRtl } = useLocale();
  const { classes, updateClass } = useClassManager();
  const { syncNow, syncStatus } = useSync();
  const current = classes.find(item => item.id === classInfo.id) ?? classInfo;
  const fingerprint = (value: ClassInfo) => JSON.stringify([value.curriculumChapterMatches ?? {}, value.curriculumSourceId]);
  const baseline = useRef(fingerprint(current));
  const [draft, setDraft] = useState(() => chapterAssociations(current, lessonsData, plan));
  const draftRef = useRef(draft);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const chapters = lessonsData.flatMap((chapter, index) => chapter.type === 'chapter' ? [{ chapter, index }] : []);

  // Une seule synchronisation pour une série de choix rapprochés, et jamais perdue si la vue se ferme.
  const syncTimer = useRef<number | null>(null);
  const syncWanted = useRef(false);
  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;
  const flushSync = useCallback(() => {
    if (syncTimer.current !== null) { window.clearTimeout(syncTimer.current); syncTimer.current = null; }
    if (!syncWanted.current) return;
    syncWanted.current = false;
    void syncNowRef.current().catch(() => undefined);
  }, []);
  useEffect(() => flushSync, [flushSync]);
  const scheduleSync = () => {
    syncWanted.current = true;
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(flushSync, SYNC_DELAY_MS);
  };

  const save = (nextDraft: Record<number, string>) => {
    setError('');
    // Do not overwrite edits received from another window while this optional form was open.
    let latest: ClassInfo | undefined;
    try { latest = (JSON.parse(localStorage.getItem('classManager_v1') ?? '[]') as ClassInfo[]).find(item => item.id === classInfo.id); } catch { /* handled below */ }
    if (!latest || fingerprint(latest) !== baseline.current
      || latest.subject !== classInfo.subject || latest.level !== classInfo.level || latest.cycle !== classInfo.cycle || latest.branch !== classInfo.branch) {
      setError(t('analysis.link.classChanged'));
      return;
    }
    const matches: NonNullable<ClassInfo['curriculumChapterMatches']> = {};
    // Empty arrays are intentional: opt-out stays opt-out, even for an identical title.
    plan.chapters.forEach(chapter => { matches[chapter.id] = []; });
    chapters.forEach(({ chapter, index }) => { if (matches[nextDraft[index]]) matches[nextDraft[index]].push({ index, title: chapter.title }); });
    const patch: Partial<ClassInfo> = { curriculumSourceId: plan.id, curriculumChapterMatches: matches };
    if (!updateClass(classInfo.id, patch)) { setError(t('analysis.link.saveFailed')); return; }
    baseline.current = fingerprint({ ...latest, ...patch });
    setSaved(true);
    // The existing queue persists locally and retries offline/error cases; no second sync circuit.
    scheduleSync();
  };

  const status = saved && !error
    ? syncStatus === 'synced' ? t('analysis.link.synced')
      : syncStatus === 'syncing' ? t('analysis.link.syncing')
        : t('analysis.link.pending')
    : t('analysis.link.auto');

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('analysis.link.intro')} <span className="text-[11px]">{t('analysis.link.rule')}</span>
      </p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="divide-y divide-border/60">
        {chapters.map(({ chapter, index }) => (
          <div key={index} className="space-y-1.5 py-2.5">
            <div dir={titleDirection(chapter.title, isRtl ? 'rtl' : 'ltr')} className="flex items-start gap-2 text-start text-sm font-medium">
              <span className="min-w-0 break-words"><MathTitle text={chapter.title} /></span>
              {draft[index] && <Check size={16} className="ms-auto mt-1 shrink-0 text-primary" aria-hidden />}
            </div>
            <Select
              value={draft[index] || 'none'}
              onValueChange={value => {
                const next = { ...draftRef.current, [index]: value === 'none' ? '' : value };
                draftRef.current = next;
                setDraft(next);
                save(next);
              }}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <SelectTrigger aria-label={`${t('analysis.link.matchFor')} ${chapter.title}`} className="h-auto min-h-11 w-full rounded-xl text-start text-xs [&>span]:whitespace-normal [&>span]:break-words [&>span]:line-clamp-none">
                <SelectValue placeholder={t('analysis.link.choose')} />
              </SelectTrigger>
              <SelectContent className="max-h-72 max-w-[min(32rem,calc(100vw-2rem))]">
                <SelectItem value="none" className="min-h-11 text-xs">{t('analysis.link.none')}</SelectItem>
                {plan.chapters.map(official => (
                  <SelectItem key={official.id} value={official.id} textValue={official.title} className="min-h-11 text-xs">
                    <span dir="auto" className="inline-block"><span className="me-2 text-muted-foreground">{official.order}.</span><MathTitle text={official.title} /></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      {!chapters.length && <p className="py-6 text-center text-sm text-muted-foreground">{t('analysis.link.empty')}</p>}
      <p role="status" className="pt-1 text-[11px] text-muted-foreground">{status}</p>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { AppConfig, ClassInfo, LessonsData, OfficialCurriculumPlan } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MathTitle } from '@/components/ui/math-title';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/i18n/LocaleProvider';
import { useClassManager } from '@/hooks/useClassManager';
import { useSync } from '@/contexts/SyncContext';
import { bundledCurricula, chapterAssociations, findMatchingCurriculum, loadCurriculumCatalog } from '@/utils/officialCurriculum';
import { schoolYearLabelFromDate, todayInMorocco } from '@/utils/calendar';

interface Props { isOpen: boolean; onClose: () => void; classInfo: ClassInfo; lessonsData: LessonsData; config: AppConfig }
export function OfficialCurriculumModal(props: Props) {
  const { locale } = useLocale();
  const [catalog, setCatalog] = useState(bundledCurricula);
  const touched = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void loadCurriculumCatalog(controller.signal).then(value => { if (!touched.current) setCatalog(value); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const plan = findMatchingCurriculum(props.classInfo, catalog, schoolYearLabelFromDate(props.config.schoolYearStart || todayInMorocco()));
  if (!plan) return <Modal isOpen={props.isOpen} onClose={props.onClose} maxWidth="sm" mobilePresentation="dialog" dragHandle={false} title={locale === 'ar' ? 'ربط الدروس بالبرنامج' : locale === 'en' ? 'Link chapters to the curriculum' : 'Relier mes chapitres au programme'}><p className="py-4 text-sm text-muted-foreground">{locale === 'ar' ? 'لا توجد بعد قائمة موثقة لهذه المادة والشعبة. يمكنك متابعة العمل دون ربط.' : locale === 'en' ? 'No reviewed chapter list for this subject and branch yet. You can continue without linking.' : 'Aucune liste de chapitres vérifiée pour cette matière et cette filière pour le moment. Vous pouvez continuer sans association.'}</p></Modal>;
  return <AssociationForm key={plan.id} {...props} plan={plan} onTouch={() => { touched.current = true; }} />;
}

function AssociationForm({ isOpen, onClose, classInfo, lessonsData, plan, onTouch }: Props & { plan: OfficialCurriculumPlan; onTouch: () => void }) {
  const { locale, isRtl } = useLocale();
  const l = (fr: string, ar: string, en: string) => locale === 'ar' ? ar : locale === 'en' ? en : fr;
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
  const save = (nextDraft: Record<number, string>) => {
    setError('');
    // Do not overwrite edits received from another window while this optional form was open.
    let latest: ClassInfo | undefined;
    try { latest = (JSON.parse(localStorage.getItem('classManager_v1') ?? '[]') as ClassInfo[]).find(item => item.id === classInfo.id); } catch { /* handled below */ }
    if (!latest || fingerprint(latest) !== baseline.current
      || latest.subject !== classInfo.subject || latest.level !== classInfo.level || latest.cycle !== classInfo.cycle || latest.branch !== classInfo.branch) {
      setError(l('La classe a changé. Rouvrez cette fenêtre pour actualiser les correspondances.', 'تغيرت بيانات القسم. أعد فتح النافذة لتحديث الروابط.', 'The class changed. Reopen this window to refresh the links.')); return;
    }
    const matches: NonNullable<ClassInfo['curriculumChapterMatches']> = {};
    // Empty arrays are intentional: opt-out stays opt-out, even for an identical title.
    plan.chapters.forEach(chapter => { matches[chapter.id] = []; });
    chapters.forEach(({ chapter, index }) => { if (matches[nextDraft[index]]) matches[nextDraft[index]].push({ index, title: chapter.title }); });
    const patch: Partial<ClassInfo> = { curriculumSourceId: plan.id, curriculumChapterMatches: matches };
    if (!updateClass(classInfo.id, patch)) {
      setError(l('Enregistrement impossible. Vos choix sont conservés dans cette fenêtre.', 'تعذر الحفظ. اختياراتك محفوظة في هذه النافذة.', 'Could not save. Your choices remain in this window.')); return;
    }
    baseline.current = fingerprint({ ...latest, ...patch });
    setSaved(true);
    // The existing queue persists locally and retries offline/error cases; no second sync circuit.
    void syncNow().catch(() => undefined);
  };
  const syncLabel = syncStatus === 'synced' ? l('Synchronisé', 'تمت المزامنة', 'Synced')
    : syncStatus === 'syncing' ? l('Synchronisation…', 'جارٍ المزامنة…', 'Syncing…')
    : l('Enregistré sur cet appareil · synchronisation en attente', 'محفوظ على هذا الجهاز · المزامنة قيد الانتظار', 'Saved on this device · sync pending');
  return <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" className="sm:rounded-2xl" mobilePresentation="dialog" dragHandle={false} swipeToDismiss={false}
    title={l('Relier mes chapitres au programme', 'ربط الدروس بالبرنامج', 'Link chapters to the curriculum')}
    footer={<div className="flex w-full items-center justify-between gap-3"><span role="status" className="text-xs text-muted-foreground">{saved && !error ? syncLabel : l('Enregistrement automatique', 'حفظ تلقائي', 'Automatic saving')}</span><Button type="button" onClick={onClose} className="min-h-11 rounded-xl px-5">{l('Terminé', 'تم', 'Done')}</Button></div>}>
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">{l('Choisissez le chapitre correspondant. Vos titres et leur ordre restent inchangés.', 'اختر الدرس الموافق من البرنامج. لن تتغير عناوينك أو ترتيبها.', 'Choose the matching curriculum chapter. Your titles and their order stay unchanged.')}</p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="divide-y divide-border/60">{chapters.map(({ chapter, index }) => <div key={index} className="space-y-2 py-3">
        <div className="flex items-start gap-2 text-sm font-medium"><span className="min-w-0 break-words" dir="auto"><MathTitle text={chapter.title} /></span>{draft[index] && <Check size={16} className="ms-auto mt-1 shrink-0 text-primary" aria-hidden />}</div>
        <Select value={draft[index] || 'none'} onValueChange={value => { onTouch(); const next = { ...draftRef.current, [index]: value === 'none' ? '' : value }; draftRef.current = next; setDraft(next); save(next); }} dir={isRtl ? 'rtl' : 'ltr'}>
          <SelectTrigger aria-label={`${l('Correspondance pour', 'الدرس الموافق لـ', 'Match for')} ${chapter.title}`} className="h-auto min-h-11 w-full rounded-xl text-start text-xs [&>span]:whitespace-normal [&>span]:break-words [&>span]:line-clamp-none"><SelectValue placeholder={l('Choisir un chapitre du programme', 'اختيار درس من البرنامج', 'Choose a curriculum chapter')} /></SelectTrigger>
          <SelectContent className="max-h-72 max-w-[min(32rem,calc(100vw-2rem))]">
            <SelectItem value="none" className="min-h-11 text-xs">{l('Sans association', 'دون ربط', 'Not linked')}</SelectItem>
            {plan.chapters.map(official => <SelectItem key={official.id} value={official.id} textValue={official.title} className="min-h-11 text-xs"><span dir="auto" className="inline-block"><span className="me-2 text-muted-foreground">{official.order}.</span><MathTitle text={official.title} /></span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>)}</div>
      {!chapters.length && <p className="py-6 text-center text-sm text-muted-foreground">{l('Ajoutez un premier chapitre pour l’associer.', 'أضف أول درس لربطه بالبرنامج.', 'Add your first chapter to link it.')}</p>}
    </div>
  </Modal>;
}

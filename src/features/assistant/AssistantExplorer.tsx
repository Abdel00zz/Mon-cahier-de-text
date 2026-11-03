import { useEffect, useId, useMemo, useState } from 'react';
import type { AppLocale, ClassInfo } from '../../types';
import type { GuideChapter, GuideReference } from '../../constants/guide/model';
import type { GuidanceAction } from '../../domain/assistant/classGuidance';
import type { PedagogicalTask } from '../../domain/assistant/pedagogicalTasks';
import { BookOpen, ChevronRight, CircleHelp, ListChecks, Search } from '../../components/ui/icons';
import { findCompanionResources, indexCompanionResources } from './companionSearch';

const text = {
  fr: { open: 'Explorer', back: 'Retour au conseil', search: 'Classe, horaire, évaluation…', none: 'Aucun résultat. Essayez le nom de la classe ou un mot du guide.', loading: 'Chargement du guide…', retry: 'Recharger le guide', error: 'Le guide est indisponible.', guide: 'Guide', class: 'Cahier', finding: 'À vérifier' },
  ar: { open: 'استكشاف', back: 'العودة إلى الاقتراح', search: 'قسم، توقيت، تقويم…', none: 'لا توجد نتيجة. جرّب اسم القسم أو كلمة من الدليل.', loading: 'جارٍ تحميل الدليل…', retry: 'إعادة تحميل الدليل', error: 'تعذّر تحميل الدليل.', guide: 'الدليل', class: 'دفتر القسم', finding: 'للمراجعة' },
  en: { open: 'Explore', back: 'Back to suggestion', search: 'Class, schedule, assessment…', none: 'No match. Try the class name or a guide topic.', loading: 'Loading guide…', retry: 'Reload guide', error: 'Guide unavailable.', guide: 'Guide (FR)', class: 'Notebook', finding: 'To review' },
} as const;
export const explorerLabels = (locale: AppLocale) => text[locale];
export interface AssistantWorkspace {
  classes: readonly ClassInfo[];
  tasks: readonly PedagogicalTask[];
  navigate: (action: GuidanceAction) => void;
}
const EMPTY_CHAPTERS: readonly GuideChapter[] = [];

export function AssistantExplorer({ workspace, locale, onNavigate, onGuide, guideBusy }: {
  workspace: AssistantWorkspace; locale: AppLocale; onNavigate: (action: GuidanceAction) => void;
  onGuide: (reference: GuideReference) => void; guideBusy: boolean;
}) {
  const copy = text[locale];
  const id = useId();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<typeof import('../../constants/guides')>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setFailed(false);
    void import('../../constants/guides').then(data => { if (current) setCatalog(data); },
      () => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [attempt]);
  const chapters = (locale === 'ar' ? catalog?.GUIDE_AR : catalog?.GUIDE_FR) ?? EMPTY_CHAPTERS;
  const entries = useMemo(() => indexCompanionResources(workspace.classes, workspace.tasks, chapters, locale),
    [workspace.classes, workspace.tasks, chapters, locale]);
  const results = useMemo(() => findCompanionResources(entries, query), [entries, query]);
  return <div className="assistant-explorer">
    <label className="assistant-explorer__search">
      <Search size={16} aria-hidden="true" />
      <input autoFocus type="search" dir="auto" aria-label={copy.search} aria-controls={id}
        placeholder={copy.search} value={query} maxLength={120} onChange={event => setQuery(event.target.value)} />
    </label>
    <ul id={id} className="assistant-explorer__results">
      {results.map(({ id: key, title, hint, destination }) => {
        const Icon = destination.kind === 'guide' ? CircleHelp : destination.kind === 'finding' ? ListChecks : BookOpen;
        return <li key={key}><button type="button" disabled={guideBusy && destination.kind === 'guide'}
          onClick={() => destination.kind === 'guide' ? onGuide(destination.reference) : onNavigate(destination.action)}>
          <Icon size={17} aria-hidden="true" /><span><small>{copy[destination.kind]}</small><bdi>{title}</bdi>
            {destination.kind !== 'class' && <span className="assistant-explorer__hint">{hint}</span>}</span>
          <ChevronRight size={14} className="assistant-forward" aria-hidden="true" />
        </button></li>;
      })}
    </ul>
    {!catalog && !failed && <p role="status">{copy.loading}</p>}
    {failed && <p role="status">{copy.error} <button type="button" onClick={() => setAttempt(n => n + 1)}>{copy.retry}</button></p>}
    {!results.length && (catalog || failed) && <p role="status">{copy.none}</p>}
  </div>;
}

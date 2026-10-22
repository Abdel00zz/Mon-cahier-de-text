import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppLocale } from '../../types';
import type { GuideReference } from '../../constants/guide/model';
import { resolveGuideReference } from '../../constants/guide/navigation';
import { AssistantGuideExcerpt } from './AssistantGuideExcerpt';
import { companionHelpCopy } from './companionHelpCopy';

type Knowledge = typeof import('../../constants/guides');
type KnowledgeState = { status: 'loading' | 'error' } | { status: 'ready'; data: Knowledge };

interface Props {
  locale: AppLocale;
  reference: GuideReference;
  onBack: () => void;
  onOpenGuide: (reference: GuideReference, signal?: AbortSignal) => Promise<boolean>;
  onGuideOpened: () => void;
}

/** The assistant reads the same local documentation as Help; no generated instructions or cloud calls. */
export function AssistantGuideHelp({ locale, reference, onBack, onOpenGuide, onGuideOpened }: Props) {
  const [state, setState] = useState<KnowledgeState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const failedTarget = useRef<GuideReference | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const copy = companionHelpCopy(locale);
  const lang = locale === 'ar' ? 'ar' : 'fr';

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus({ preventScroll: true });
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    import('../../constants/guides').then(data => {
      if (active) setState({ status: 'ready', data });
    }).catch(() => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [attempt]);

  const data = state.status === 'ready' ? state.data : undefined;
  const entries = data ? lang === 'ar' ? data.GUIDE_AR : data.GUIDE_FR : undefined;
  const results = useMemo(() => data && entries ? data.searchGuide(entries, query) : [], [data, entries, query]);
  const { chapter, section } = resolveGuideReference(entries ?? [], reference);
  const read = async (target: GuideReference) => {
    if (busy.current) return;
    const controller = new AbortController();
    request.current = controller;
    busy.current = true; setOpening(true); setOpenError(false);
    try {
      if (await onOpenGuide(target, controller.signal) && mounted.current) onGuideOpened();
    } catch { if (mounted.current) { failedTarget.current = target; setOpenError(true); } }
    finally { busy.current = false; if (mounted.current) setOpening(false); }
  };

  return <div className="assistant-help">
    <button type="button" className="assistant-help__back" onClick={onBack}>{copy.back}</button>
    <h3 ref={heading} tabIndex={-1} className="assistant-help__heading">{copy.source}</h3>
    {locale === 'en' && <p className="assistant-help__note">{copy.french}</p>}
    <input type="search" aria-label={copy.search} placeholder={copy.placeholder} value={query} maxLength={160}
      dir="auto" onChange={event => setQuery(event.target.value)} className="assistant-help__search" />
    {state.status === 'loading' && <p role="status">{copy.loading}</p>}
    {state.status === 'error' && <div role="alert"><p>{copy.error}</p>
      <button type="button" className="assistant-panel__contact" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button>
    </div>}
    {state.status === 'ready' && (query.trim() ? <>
      <p className="assistant-help__note" role="status">{new Intl.NumberFormat(locale).format(results.length)} · {copy.search}</p>
      {results.length ? <ul className="assistant-help__results" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {results.map(entry => <li key={entry.id}><button type="button" disabled={opening}
          onClick={() => { void read({ chapterId: entry.id }); }}>{entry.title}</button></li>)}
      </ul> : <div><p>{copy.empty}</p><button type="button" className="assistant-panel__contact" onClick={() => setQuery('')}>{copy.clear}</button></div>}
    </> : chapter ? <>
      <AssistantGuideExcerpt chapter={chapter} section={section} lang={lang} />
      <button type="button" className="assistant-panel__contact" disabled={opening}
        onClick={() => { void read({ chapterId: chapter.id, sectionId: section?.id }); }}>{copy.read}</button>
    </> : <p role="status">{copy.unavailable}</p>)}
    {opening && <p role="status">{copy.opening}</p>}
    {openError && <div role="alert"><p>{copy.error}</p><button type="button" className="assistant-panel__contact"
      onClick={() => { if (failedTarget.current) void read(failedTarget.current); }}>{copy.retry}</button></div>}
  </div>;
}

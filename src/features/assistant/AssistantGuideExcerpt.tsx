import type { GuideChapter, GuideSection } from '../../constants/guide/model';
import { GuideText } from '../guide/GuideText';

/** Render the complete selected section, including warnings; never inject guide text as HTML. */
export function AssistantGuideExcerpt({ chapter, section, lang }: {
  chapter: GuideChapter; section?: GuideSection; lang: 'fr' | 'ar';
}) {
  return <article className="assistant-help__answer" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <h4>{section?.title ?? chapter.title}</h4>
    <p><GuideText>{chapter.summary}</GuideText></p>
    {section?.body && <p><GuideText>{section.body}</GuideText></p>}
    {section?.steps && <ol>{section.steps.map((step, i) => <li key={i}><GuideText>{step}</GuideText></li>)}</ol>}
    {section?.items && <dl>{section.items.map(item => <div key={item.term}><dt>{item.term}</dt><dd><GuideText>{item.detail}</GuideText></dd></div>)}</dl>}
  </article>;
}

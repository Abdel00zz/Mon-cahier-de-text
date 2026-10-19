/** Structured bilingual help: plain text only, no HTML injection. */
interface GuideSection {
  title: string;
  body?: string;
  steps?: string[];
  items?: { term: string; detail: string }[];
}
export interface GuideChapter {
  id: string;
  title: string;
  summary: string;
  keywords: string;
  sections: GuideSection[];
  tip?: string;
  image?: { key: 'classes' | 'schedule' | 'editor' | 'add' | 'dates' | 'notifications' | 'appearance' | 'assessments' | 'print' | 'students'; caption: string };
  related: string[];
}
type Content = Omit<GuideChapter, 'id' | 'related'>;
export const chapter = (id: string, related: string[], fr: Content, ar: Content) => ({
  fr: { id, related, ...fr }, ar: { id, related, ...ar },
});

/** Message du compagnon : contrat partagé, sans cycle entre les copies. */
export interface CompanionMessage {
  id: string;
  title: string;
  detail: string;
  /** Literal text to emphasize; never parsed as HTML or Markdown. */
  detailEmphasis?: string;
  detailHighlights?: readonly string[];
  subject?: string;
  action?: string;
  context?: string;
}

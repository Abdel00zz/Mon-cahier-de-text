import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppLocale } from '@/types';
import { BloubAvatar, type BloubExpression } from '@/components/ui/BloubAvatar';
import { companionLabels, type CompanionMessage } from './companionCopy';
import { attachAssistantDismiss } from './assistantPopoverController';
import { attachAssistantPlacement } from './assistantPlacement';
import { useCompanionWelcome } from './welcomeSession';
import type { GuideReference } from '../../constants/guide/model';
import { companionHelpCopy } from './companionHelpCopy';
import { CompanionText } from './CompanionText';
import { AssistantTips } from './AssistantTips';
import './companion.css';

interface AssistantPopoverProps {
  locale: AppLocale;
  message: CompanionMessage;
  attentionKey?: string;
  mood?: BloubExpression;
  robotAction?: 'success' | 'inspect' | 'warning' | 'failure' | 'waiting';
  problemCount?: number;
  antennaFlash?: boolean;
  headRoundness?: number;
  autoSleepMs?: number;
  onAction?: () => void;
  actionBusy?: boolean;
  keepOpenOnAction?: boolean;
  contactLabel?: string;
  onContact?: () => void;
  primaryAction?: ReactNode;
  dismissLabel?: string;
  onDismiss?: () => void;
  keepOpenOnDismiss?: boolean;
  helpReference?: GuideReference;
  onOpenGuide?: (reference: GuideReference, signal?: AbortSignal) => Promise<boolean>;
  tips?: { day: string; initiallyOpen: boolean };
  nextTaskLabel?: string;
  onNextTask?: () => void;
}

/** Gestion autonome de l'ouverture et fermeture de la bulle avec focus accessible. */
function useAssistantPopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (open && root.current && panel.current) return attachAssistantPlacement(root.current, panel.current);
  }, [open]);

  useEffect(() => {
    if (!open || !root.current) return;
    return attachAssistantDismiss(root.current, panel.current, close);
  }, [open, close]);

  return { root, trigger, panel, open, setOpen, close };
}

export function AssistantPopover({
  locale,
  message,
  attentionKey,
  mood = 'attentive',
  robotAction,
  problemCount = 0,
  antennaFlash,
  headRoundness,
  autoSleepMs,
  onAction, actionBusy = false, keepOpenOnAction = false, contactLabel, onContact, primaryAction,
  dismissLabel, onDismiss, keepOpenOnDismiss = false, helpReference, onOpenGuide, tips, nextTaskLabel, onNextTask,
}: AssistantPopoverProps) {
  const { root, trigger, panel, open, setOpen, close } = useAssistantPopover();
  const { welcoming, dismissWelcome } = useCompanionWelcome();
  const [seen, setSeen] = useState<string | undefined>();
  const [hovered, setHovered] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpError, setHelpError] = useState(false);
  const helpRequest = useRef<AbortController | null>(null);
  const id = useId();
  const labels = companionLabels(locale);
  const isInstallAppMessage = message.id === 'install-app';
  const highlights = [...(message.detailHighlights ?? []), ...(message.detailEmphasis ? [message.detailEmphasis] : [])];

  useEffect(() => {
    setHelpBusy(false); setHelpError(false);
    return () => { helpRequest.current?.abort(); helpRequest.current = null; };
  }, [open, message.id, helpReference?.chapterId, helpReference?.sectionId]);

  const handleDismissAndClose = useCallback((restoreFocus = false) => {
    onDismiss?.();
    close(restoreFocus);
  }, [onDismiss, close]);

  useEffect(() => { if (open || !attentionKey) setSeen(attentionKey); }, [open, attentionKey]);
  const unread = Boolean(attentionKey && seen !== attentionKey && !open);

  // The domain decision owns the expression. Interactions never replace a real
  // warning with a random happy/sleeping gesture or invent a success during class.
  const baseExpression = robotAction ?? mood;
  const activeExpression: BloubExpression = welcoming && !open && baseExpression === 'success' ? 'excited'
    : hovered && baseExpression === 'success' ? 'love' : baseExpression;

  const badgeVariant = problemCount === 0 ? 'serene' : problemCount <= 2 ? 'minor' : 'alert';

  return (
    <div className="assistant-anchor" ref={root} dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <button
        ref={trigger}
        type="button"
        className="assistant-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={`${id}-panel`}
        aria-describedby={!open ? `${id}-preview` : undefined}
        aria-label={`${open ? labels.close : labels.open}${message.context ? ` · ${message.context}` : unread ? ` · ${labels.attention}` : ''}`}
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onPointerCancel={() => setHovered(false)}
        onClick={() => {
          dismissWelcome();
          if (open) close(true);
          else { setSeen(attentionKey); setOpen(true); }
        }}
      >
        <BloubAvatar
          interactive={false}
          size={30}
          color="var(--control-ink, #725b47)"
          expression={activeExpression}
          attention={unread && activeExpression !== 'excited'}
          antennaFlash={Boolean(antennaFlash && unread && activeExpression !== 'excited')}
          headRoundness={headRoundness}
          autoSleepMs={autoSleepMs}
        />
        {problemCount > 0 && !open && (
          <span
            className={`assistant-trigger__badge assistant-trigger__badge--${badgeVariant}`}
            aria-hidden="true"
          >
            {problemCount > 99 ? '99+' : problemCount}
          </span>
        )}
      </button>
      <span id={`${id}-preview`} role="tooltip" className="assistant-preview" hidden={open}>{message.title}{message.subject ? ` · ${message.subject}` : ''}</span>
      <div
        id={`${id}-panel`}
        hidden={!open}
        ref={panel}
        tabIndex={-1}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? false : undefined}
        aria-labelledby={open ? `${id}-title` : undefined}
        aria-describedby={open ? `${id}-detail` : undefined}
        className="assistant-panel"
        data-state={robotAction ?? mood}
      >
        {open && (
          <div className="assistant-panel__body">
            <h2 id={`${id}-title`} className="sr-only">{message.title}</h2>
            <p id={`${id}-detail`} className="assistant-panel__detail">
              <CompanionText text={message.detail} highlights={highlights} />
            </p>
            {primaryAction ?? (onAction && message.action && (
              <button
                type="button"
                className="assistant-panel__action"
                disabled={actionBusy}
                aria-busy={actionBusy || undefined}
                onClick={() => {
                  if (!keepOpenOnAction) close();
                  onAction();
                }}
              >
                <span>{message.action}</span>
              </button>
            ))}
            {!isInstallAppMessage && onDismiss && dismissLabel && (
              <button
                type="button"
                className="assistant-panel__dismiss"
                onClick={() => {
                  if (keepOpenOnDismiss) onDismiss();
                  else handleDismissAndClose(true);
                }}
              >
                {dismissLabel}
              </button>
            )}
            {onNextTask && nextTaskLabel && <button type="button" className="assistant-panel__help" onClick={onNextTask}>{nextTaskLabel}</button>}
            {helpReference && onOpenGuide && (
              <button
                type="button"
                className="assistant-panel__help"
                disabled={helpBusy}
                aria-busy={helpBusy || undefined}
                onClick={() => {
                  if (helpRequest.current && !helpRequest.current.signal.aborted) return;
                  const request = new AbortController(); helpRequest.current = request;
                  setHelpBusy(true); setHelpError(false);
                  void onOpenGuide(helpReference, request.signal).then(opened => {
                    if (opened && !request.signal.aborted) close();
                  }).catch(() => { if (!request.signal.aborted) setHelpError(true); })
                    .finally(() => { if (!request.signal.aborted) { helpRequest.current = null; setHelpBusy(false); } });
                }}
              >
                {helpBusy ? companionHelpCopy(locale).opening : helpError ? companionHelpCopy(locale).retry : companionHelpCopy(locale).open}
              </button>
            )}
            {helpReference && onOpenGuide && helpError && <p role="alert" className="assistant-panel__detail">{companionHelpCopy(locale).error}</p>}
            {tips && <AssistantTips key={`${tips.day}:${locale}`} locale={locale} {...tips} />}
            {onContact && contactLabel && <button type="button" className="assistant-panel__contact" onClick={() => { close(); onContact(); }}>{contactLabel}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

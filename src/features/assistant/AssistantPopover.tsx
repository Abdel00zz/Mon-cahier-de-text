import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { AppLocale } from '@/types';
import { BloubAvatar, type BloubExpression } from '@/components/ui/BloubAvatar';
import { X } from '@/components/ui/icons';
import { companionLabels, type CompanionMessage } from './companionCopy';
import { attachAssistantDismiss } from './assistantPopoverController';
import { attachAssistantPlacement } from './assistantPlacement';
import { useCompanionWelcome } from './welcomeSession';
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
  onAction,
}: AssistantPopoverProps) {
  const { root, trigger, panel, open, setOpen, close } = useAssistantPopover();
  const { welcoming, dismissWelcome } = useCompanionWelcome();
  const [seen, setSeen] = useState<string | undefined>();
  const [hovered, setHovered] = useState(false);
  const id = useId();
  const labels = companionLabels(locale);

  useEffect(() => { if (open || !attentionKey) setSeen(attentionKey); }, [open, attentionKey]);
  const unread = Boolean(attentionKey && seen !== attentionKey && !open);

  // The domain decision owns the expression. Interactions never replace a real
  // warning with a random happy/sleeping gesture or invent a success during class.
  const baseExpression = robotAction ?? mood;
  const activeExpression: BloubExpression = welcoming && !open ? 'excited'
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
          attention={unread && !welcoming}
          antennaFlash={Boolean(antennaFlash && unread && !welcoming)}
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
      >
        {open && (
          <>
            <div className="assistant-panel__heading">
              <div className="assistant-panel__copy">
                <h2 id={`${id}-title`} className="assistant-panel__title">
                  <span className="assistant-panel__title-action">{message.title}</span>
                  {message.subject && (
                    <bdi className="assistant-panel__title-subject">{message.subject}</bdi>
                  )}
                </h2>
              </div>
              <button
                type="button"
                className="assistant-panel__close"
                onClick={() => close(true)}
                aria-label={labels.close}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <p id={`${id}-detail`} className="assistant-panel__detail">
              {message.detail}
            </p>
            {onAction && message.action && (
              <button
                type="button"
                className="assistant-panel__action"
                onClick={() => {
                  close();
                  onAction();
                }}
              >
                {message.action}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

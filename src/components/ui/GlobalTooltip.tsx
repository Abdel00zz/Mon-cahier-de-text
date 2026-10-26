import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * L'INFOBULLE UNIQUE DE L'APPLICATION.
 *
 * UN SEUL rendu, un geste par plateforme :
 *   • souris / stylet : survol — affichage immédiat ;
 *   • tactile         : appui long (~450 ms) — le geste des infobulles
 *     natives, celui qui fonctionne sur l'APK ;
 *   • clavier         : focus, Échap pour fermer.
 *
 * UNE SEULE source pour un élément : `data-tippy-content` (l'API explicite de
 * l'application). L'attribut `title` n'est PLUS une source : il sert au texte
 * tronqué et garde son comportement natif — sinon l'application couvrait de
 * bulles tout ce qui porte un `title`, y compris ce qui se lit déjà à l'écran.
 * Quand un élément porte LES DEUX (cas de transition), le `title` est retiré du
 * DOM pendant l'affichage puis restauré : sans cela, le navigateur afficherait
 * EN PLUS sa propre infobulle système — deux bulles pour un seul élément.
 */

interface TooltipPayload {
  text: string;
  /** Centre horizontal de l'ancre. */
  anchorX: number;
  /** Haut ou bas de l'ancre selon `placement`. */
  anchorY: number;
  placement: 'top' | 'bottom';
}

/** Durée d'appui pour déclencher l'infobulle au doigt (geste natif). */
const LONG_PRESS_MS = 450;
/** Au-delà de ce déplacement, l'appui devient un défilement : on annule. */
const CANCEL_PRESSURE_PX = 12;
/** Marge minimale avec les bords de l'écran. */
const EDGE_MARGIN = 8;
/** Délai pendant lequel un focus issu d'un tap n'est pas traité comme clavier. */
const TOUCH_FOCUS_GRACE_MS = 700;
/** Cadres embarqués : leur `title` est leur nom accessible, jamais une infobulle. */
const PROTECTED_TAGS = new Set(['IFRAME', 'OBJECT', 'EMBED']);

export const GlobalTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipPayload | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);

  /*
   * Positionnement MESURÉ : la bulle est d'abord rendue à sa taille réelle,
   * puis recalée en layout effect — avant toute peinture — pour rester
   * entièrement visible quels que soient la langue, la longueur du texte et le
   * bord de l'écran. Aucun décalage visible, aucune mesure devinée.
   */
  useLayoutEffect(() => {
    if (!tooltip || !bubbleRef.current) {
      setPosition(null);
      return;
    }
    const { offsetWidth: width, offsetHeight: height } = bubbleRef.current;
    const x = Math.min(
      Math.max(tooltip.anchorX - width / 2, EDGE_MARGIN),
      Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - width),
    );
    const rawY = tooltip.placement === 'top' ? tooltip.anchorY - 6 - height : tooltip.anchorY + 6;
    const y = Math.min(Math.max(rawY, EDGE_MARGIN), Math.max(EDGE_MARGIN, window.innerHeight - EDGE_MARGIN - height));
    setPosition({ x, y });
  }, [tooltip]);

  useEffect(() => {
    const stashedTitles = new WeakMap<HTMLElement, string>();
    let visible = false;
    let active: { target: HTMLElement } | null = null;
    let press: { timer: number; x: number; y: number; target: HTMLElement } | null = null;
    let lastTouchAt = 0;

    /** L'élément porteur d'infobulle le plus proche — API EXPLICITE prioritaire, puis remplacement du title natif. */
    const findTarget = (node: EventTarget | null): { target: HTMLElement; text: string } | null => {
      const element = node instanceof HTMLElement ? node : null;
      if (!element || !element.isConnected) return null;

      // Aucune infobulle sur les cartes et lignes de classe (le nom est déjà affiché en grand)
      if (element.closest('.class-card, .class-list-item') && !element.closest('.class-card__menu, .class-list-item__menu')) {
        return null;
      }

      // 1. Source explicite prioritaire
      const target = element.closest<HTMLElement>('[data-tippy-content]') ?? null;
      if (target && target.isConnected && !PROTECTED_TAGS.has(target.tagName)) {
        const text = (target.getAttribute('data-tippy-content') ?? target.getAttribute('title') ?? '').trim();
        if (text) return { target, text };
      }

      // 2. Contrôles et éléments porteurs de title natif :
      //    Remplacement de l'infobulle système native par le style UI raffiné du compagnon.
      const titled = element.closest<HTMLElement>(
        'button[title], a[title], [role="button"][title], [data-mode][title], summary[title], input[title], select[title], [tabindex][title], [data-tooltip], [aria-label][title], span[title], svg[title]'
      ) ?? null;
      if (titled && titled.isConnected && !PROTECTED_TAGS.has(titled.tagName)) {
        const text = (titled.getAttribute('title') ?? '').trim();
        if (text && text !== titled.textContent?.trim()) {
          return { target: titled, text };
        }
      }

      return null;
    };

    /** Le `title` sort du DOM pendant l'affichage : une seule bulle, la nôtre. */
    const stashTitle = (target: HTMLElement) => {
      const title = target.getAttribute('title');
      if (title !== null) {
        stashedTitles.set(target, title);
        target.removeAttribute('title');
      }
    };
    const restoreTitle = (target: HTMLElement) => {
      const title = stashedTitles.get(target);
      if (title === undefined) return;
      stashedTitles.delete(target);
      if (!target.hasAttribute('title') && target.isConnected) target.setAttribute('title', title);
    };

    const showFor = (found: { target: HTMLElement; text: string }) => {
      stashTitle(found.target);
      const rect = found.target.getBoundingClientRect();
      const placement = rect.top > 96 ? 'top' : 'bottom';
      active = { target: found.target };
      visible = true;
      setTooltip({
        text: found.text,
        anchorX: rect.left + rect.width / 2,
        anchorY: placement === 'top' ? rect.top : rect.bottom,
        placement,
      });
    };

    const hide = () => {
      if (active) restoreTitle(active.target);
      active = null;
      visible = false;
      setTooltip(null);
    };

    const cancelPress = () => {
      if (!press) return;
      window.clearTimeout(press.timer);
      restoreTitle(press.target);
      press = null;
    };

    const dismiss = () => {
      cancelPress();
      if (visible) hide();
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const found = findTarget(event.target);
      if (!found) return;
      if (visible && active?.target === found.target) return;
      if (visible) hide();
      showFor(found);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !active) return;
      const related = event.relatedTarget as Node | null;
      if (related && active.target.contains(related)) return;
      hide();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        // Un clic est une action : l'infobulle de survol n'a plus rien à dire.
        dismiss();
        return;
      }
      lastTouchAt = Date.now();
      dismiss();
      const found = findTarget(event.target);
      if (!found) return;
      // L'appui long est LE geste de l'infobulle : le titre natif est mis de
      // côté dès l'appui, sinon la WebView afficherait sa propre bulle système.
      stashTitle(found.target);
      press = {
        target: found.target,
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(() => {
          press = null;
          showFor(found);
        }, LONG_PRESS_MS),
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!press || event.pointerType !== 'touch') return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CANCEL_PRESSURE_PX) cancelPress();
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      if (press) cancelPress();
      else if (visible) hide();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (Date.now() - lastTouchAt < TOUCH_FOCUS_GRACE_MS) return;
      const found = findTarget(event.target);
      if (!found) return;
      if (visible && active?.target === found.target) return;
      if (visible) hide();
      showFor(found);
    };

    const onFocusOut = () => { if (visible) hide(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const onScrollOrResize = () => dismiss();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') dismiss(); };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerEnd, true);
    document.addEventListener('pointercancel', onPointerEnd, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('blur', onScrollOrResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelPress();
      if (active) restoreTitle(active.target);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerEnd, true);
      document.removeEventListener('pointercancel', onPointerEnd, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('blur', onScrollOrResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <span
      ref={bubbleRef}
      role="tooltip"
      className="global-ui-tooltip pointer-events-none fixed z-[200] w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border border-border/80 bg-card/95 backdrop-blur-md px-2.5 py-1.5 text-start text-[12px] font-medium leading-snug text-foreground shadow-md shadow-black/5"
      style={{
        left: position?.x ?? tooltip.anchorX,
        top: position?.y ?? tooltip.anchorY,
        opacity: position ? 1 : 0,
        fontFamily: 'var(--font-companion, var(--font-sans))',
        transform: position ? 'translateY(0)' : 'translateY(-2px)',
        transition: 'opacity 160ms ease, transform 160ms ease',
      }}
    >
      {tooltip.text}
    </span>,
    document.body,
  );
};


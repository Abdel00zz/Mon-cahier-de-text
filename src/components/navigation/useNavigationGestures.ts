import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
import { clamp } from 'es-toolkit';
import { navigationSwipeTarget, type TabType, type WorkspaceTab } from './navigationConfig';

/** A horizontal gesture must dominate vertical movement before changing tabs. */
export function useTabSwipe(active: TabType, isRtl: boolean, goTo: (tab: WorkspaceTab) => void) {
  const start = useRef<{ x: number; y: number; id: number; time: number } | null>(null);
  const ignoreClickUntil = useRef(0);
  const onTouchStart = useCallback((event: TouchEvent) => {
    ignoreClickUntil.current = 0;
    if (event.touches.length !== 1) { start.current = null; return; }
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier, time: event.timeStamp };
  }, []);
  const onTouchEnd = useCallback((event: TouchEvent) => {
    const origin = start.current;
    start.current = null;
    if (!origin || event.touches.length) return;
    const touch = Array.from(event.changedTouches).find(point => point.identifier === origin.id);
    if (!touch) return;
    const next = navigationSwipeTarget(active, touch.clientX - origin.x, touch.clientY - origin.y, event.timeStamp - origin.time, isRtl);
    if (next) {
      ignoreClickUntil.current = Date.now() + 400;
      goTo(next);
    }
  }, [active, goTo, isRtl]);
  const onClickCapture = useCallback((event: MouseEvent) => {
    if (event.detail !== 0 && Date.now() < ignoreClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
  }, []);
  return { onTouchStart, onTouchEnd, onClickCapture, onTouchCancel: () => { start.current = null; } };
}

/** Drag feedback updates one transform without re-rendering the navigation. */
export function useSidebarGesture(expanded: boolean, isRtl: boolean, close: () => void) {
  const ref = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const delta = useRef(0);
  const reset = useCallback(() => {
    if (ref.current) ref.current.style.transform = '';
    start.current = null;
    delta.current = 0;
  }, []);
  useEffect(() => {
    if (!expanded) { reset(); return; }
    const desktop = window.matchMedia('(min-width: 768px)');
    const outside = (event: PointerEvent) => {
      if (desktop.matches && ref.current && !ref.current.closest('[data-phone-navigation="true"]') && !ref.current.contains(event.target as Node)) close();
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [expanded, close, reset]);
  return { ref,
    onTouchStart: (event: TouchEvent) => { if (expanded) start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; },
    onTouchMove: (event: TouchEvent) => {
      if (!expanded || !start.current || !ref.current) return;
      const dx = event.touches[0].clientX - start.current.x;
      if (Math.abs(dx) <= Math.abs(event.touches[0].clientY - start.current.y)) return;
      delta.current = isRtl ? clamp(dx, 0, 100) : clamp(dx, -100, 0);
      ref.current.style.transform = `translateX(${delta.current}px)`;
    },
    onTouchEnd: () => { const shouldClose = Math.abs(delta.current) > 40; reset(); if (shouldClose) close(); },
    onTouchCancel: reset,
  };
}

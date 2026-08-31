import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import { createLongPress } from "@/utils/longPress";

export function useClassPress(onSelect: () => void, onConfigure: () => void) {
  const callbacks = useRef({ onSelect, onConfigure });
  callbacks.current = { onSelect, onConfigure };
  const [press] = useState(() =>
    createLongPress(() => callbacks.current.onConfigure()),
  );
  useEffect(() => () => press.dispose(), [press]);
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      const compactMouse =
        event.pointerType === "mouse" &&
        window.matchMedia("(max-width: 767px)").matches;
      press.start({
        pointerId: event.pointerId,
        pointerType: compactMouse ? "touch" : event.pointerType,
        isPrimary: event.isPrimary,
        button: event.button,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) =>
      press.move(event),
    onPointerUp: () => press.end(),
    onPointerCancel: () => press.cancel(),
    onPointerLeave: () => press.cancel(),
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      press.context();
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (press.consumeClick()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      callbacks.current.onSelect();
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.key === "ContextMenu" ||
        (event.shiftKey && event.key === "F10")
      ) {
        event.preventDefault();
        press.consumeClick();
        callbacks.current.onConfigure();
      } else if (event.key === "Enter" || event.key === " ") {
        press.consumeClick();
      }
    },
  };
}

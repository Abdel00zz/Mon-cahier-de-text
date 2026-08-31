export interface PressPoint {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  isPrimary: boolean;
  button: number;
}
export interface PressClock {
  start: (callback: () => void, delay: number) => unknown;
  stop: (handle: unknown) => void;
}
const clock: PressClock = {
  start: (callback, delay) => setTimeout(callback, delay),
  stop: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** No interval or global listener: a single timer exists only during a touch. */
export function createLongPress(onHold: () => void, timer: PressClock = clock) {
  let origin: PressPoint | null = null;
  let handle: unknown = null;
  let blocked = false;
  let fired = false;
  const stop = () => {
    if (handle !== null) timer.stop(handle);
    handle = null;
    origin = null;
  };
  return {
    start(point: PressPoint) {
      stop();
      blocked = false;
      fired = false;
      if (
        !point.isPrimary ||
        point.button !== 0 ||
        !['touch', 'pen'].includes(point.pointerType)
      )
        return;
      origin = point;
      handle = timer.start(() => {
        handle = null;
        blocked = true;
        fired = true;
        onHold();
      }, 550);
    },
    move(point: Pick<PressPoint, 'pointerId' | 'clientX' | 'clientY'>) {
      if (
        origin &&
        (point.pointerId !== origin.pointerId ||
          Math.hypot(
            point.clientX - origin.clientX,
            point.clientY - origin.clientY,
          ) > 12)
      ) {
        blocked = true;
        stop();
      }
    },
    end: stop,
    cancel() {
      if (origin) blocked = true;
      stop();
    },
    context() {
      stop();
      blocked = true;
      if (!fired) {
        fired = true;
        onHold();
      }
    },
    consumeClick() {
      const value = blocked;
      blocked = false;
      return value;
    },
    dispose: stop,
  };
}

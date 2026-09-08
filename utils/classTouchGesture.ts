export const CLASS_HOLD_MS = 550;
export const CLASS_DRAG_ARM_MS = 260;
export const CLASS_MOVE_TOLERANCE = 12;

/** A stationary hold belongs to settings; a quick swipe belongs to scrolling. */
export function classifyClassTouch(elapsed: number, distance: number): 'wait' | 'drag' | 'cancel' {
  if (elapsed >= CLASS_HOLD_MS) return 'cancel';
  if (distance <= CLASS_MOVE_TOLERANCE) return 'wait';
  return elapsed >= CLASS_DRAG_ARM_MS ? 'drag' : 'cancel';
}

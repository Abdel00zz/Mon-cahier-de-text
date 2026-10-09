/** Keep measurement corrections out of a native gesture and its momentum.
 * No timers or React state: every scroll extends the quiet period. */
export function createScrollActivity(now: () => number = () => performance.now()) {
  let touching = false;
  let lastMovement = -Infinity;
  const move = () => { lastMovement = now(); };
  return {
    move,
    touch(count: number) { touching = count > 0; move(); },
    reset() { touching = false; lastMovement = -Infinity; },
    isActive: () => touching || now() - lastMovement < 200,
  };
}

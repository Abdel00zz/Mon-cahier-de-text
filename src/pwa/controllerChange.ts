/** The first claim needs no reload; every subsequent controller change is an update. */
export function onPwaControllerChange(initiallyControlled: boolean, requestReload: () => void): () => void {
  let controlled = initiallyControlled;
  return () => {
    const wasControlled = controlled;
    controlled = true;
    if (wasControlled) requestReload();
  };
}

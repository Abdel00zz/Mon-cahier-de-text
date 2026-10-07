/** Use one back circuit for keyboard, overlays, routes and the Android home action. */
export function handleNativeBack(document: Document, window: Pick<Window, 'dispatchEvent'>,
    minimize: () => void): void {
    if (document.documentElement.dataset.keyboard === 'open'
        || document.activeElement?.matches('input, textarea, [contenteditable="true"]')) {
        (document.activeElement as HTMLElement | null)?.blur();
        return;
    }
    const overlay = Array.from(document.querySelectorAll<HTMLElement>(
        '[role="dialog"]:not([data-state="closed"]), [role="alertdialog"]:not([data-state="closed"]), '
        + '[role="menu"][data-state="open"], [data-native-back-dismiss="open"]',
    )).some(element => element.getClientRects().length > 0);
    if (overlay) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        return;
    }
    const request = new Event('native-back', { cancelable: true });
    window.dispatchEvent(request);
    if (!request.defaultPrevented) minimize();
}

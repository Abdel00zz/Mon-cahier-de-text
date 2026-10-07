import assert from 'node:assert/strict';
import test from 'node:test';
import { handleNativeBack } from '../src/platform/nativeBack';

function surface(options: { keyboard?: boolean; editing?: boolean; overlay?: boolean; hiddenOverlay?: boolean } = {}) {
    let blurred = false;
    let escaped = false;
    let minimized = false;
    const events = new EventTarget();
    const document = {
        documentElement: { dataset: { keyboard: options.keyboard ? 'open' : 'closed' } },
        activeElement: options.editing ? { matches: () => true, blur: () => { blurred = true; } } : null,
        querySelectorAll: () => options.overlay || options.hiddenOverlay ? [{ getClientRects: () => options.hiddenOverlay ? [] : [{}] }] : [],
        dispatchEvent: (event: Event) => { escaped = event.type === 'keydown'; return true; },
    } as unknown as Document;
    return { events, back: () => handleNativeBack(document, events, () => { minimized = true; }),
        state: () => ({ blurred, escaped, minimized }) };
}

test('system back closes editing before leaving the editor', () => {
    const app = surface({ editing: true, overlay: true });
    let navigated = false;
    app.events.addEventListener('native-back', () => { navigated = true; });
    app.back();
    assert.deepEqual(app.state(), { blurred: true, escaped: false, minimized: false });
    assert.equal(navigated, false);
});

test('system back dismisses a visible menu, modal or search without routing away', context => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'KeyboardEvent');
    Object.defineProperty(globalThis, 'KeyboardEvent', { configurable: true, value: class extends Event {} });
    context.after(() => original ? Object.defineProperty(globalThis, 'KeyboardEvent', original) : Reflect.deleteProperty(globalThis, 'KeyboardEvent'));
    const app = surface({ overlay: true });
    let navigated = false;
    app.events.addEventListener('native-back', () => { navigated = true; });
    app.back();
    assert.deepEqual(app.state(), { blurred: false, escaped: true, minimized: false });
    assert.equal(navigated, false);
});

test('system back reaches the editor route, ignores hidden overlays, and minimizes only at the root', () => {
    const editor = surface({ hiddenOverlay: true });
    let dashboard = false;
    editor.events.addEventListener('native-back', event => { event.preventDefault(); dashboard = true; });
    editor.back();
    assert.equal(dashboard, true);
    assert.equal(editor.state().minimized, false);
    const root = surface();
    root.back();
    assert.equal(root.state().minimized, true);
});

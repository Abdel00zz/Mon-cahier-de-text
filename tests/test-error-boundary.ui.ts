import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppErrorScreen } from '../src/components/ui/AppErrorBoundary';

const render = (props: Record<string, unknown> = {}) => renderToStaticMarkup(
    createElement(AppErrorScreen, { onReload: () => {}, onHome: () => {}, ...props }),
);

test('écran de reprise : bilingue, rassurant et sans réprimande', () => {
    const markup = render();
    assert.match(markup, /lang="fr"/);
    assert.match(markup, /lang="ar"/);
    assert.match(markup, /Une pause, rien n&#x27;est perdu/);
    assert.match(markup, /دفاتركم محفوظة/);
    assert.match(markup, /role="alert"/);
});

test('écran de reprise : deux issues de sortie tactiles', () => {
    const markup = render();
    assert.match(markup, /app-error__button app-error__button--primary/);
    assert.equal((markup.match(/<button/g) ?? []).length, 2);
    assert.match(markup, /Recharger la page/);
    assert.match(markup, /Retour à l&#x27;accueil/);
});

test('écran de reprise : le détail technique reste replié', () => {
    assert.doesNotMatch(render(), /Détails techniques/);
    const markup = render({ detail: 'TypeError: boom' });
    assert.match(markup, /<details class="app-error__detail">/);
    assert.match(markup, /TypeError: boom/);
});

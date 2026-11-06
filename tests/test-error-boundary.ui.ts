import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppErrorScreen } from '../src/components/ui/AppErrorBoundary';
import { classifyAppError } from '../src/components/ui/appErrorRecovery';

const render = (props: Record<string, unknown> = {}) => renderToStaticMarkup(
    createElement(AppErrorScreen, { onReload: () => {}, onHome: () => {}, ...props }),
);

test('écran de reprise : une langue, un message court, une figure autonome', () => {
    const markup = render();
    assert.match(markup, /lang="fr"/);
    assert.doesNotMatch(markup, /lang="ar"/, 'la locale du document suffit');
    assert.match(markup, /Rien n’est perdu/);
    assert.match(markup, /Vos cahiers restent sur cet appareil/);
    assert.match(markup, /app-error__hero/);
    assert.match(markup, /<svg/);
    assert.match(markup, /role="alert"/);
    assert.match(markup, /aria-labelledby="app-error-title"/);
});

test('écran de reprise : une action forte et une sortie secondaire', () => {
    const markup = render();
    assert.match(markup, /app-error__button app-error__button--primary/);
    assert.equal((markup.match(/<button/g) ?? []).length, 2);
    assert.match(markup, /Recharger/);
    assert.match(markup, /Retour à l’accueil/);
});

test('le diagnostic choisit une reprise ciblée, pas un message générique', () => {
    assert.equal(classifyAppError("SyntaxError: The requested module does not provide an export named 'resolveContainer'"), 'module');
    assert.equal(classifyAppError('QuotaExceededError: storage is full'), 'storage');
    assert.equal(classifyAppError('TypeError: Failed to fetch'), 'network');

    const moduleMarkup = render({ detail: "SyntaxError: does not provide an export named 'x'" });
    assert.match(moduleMarkup, /Mise à jour incomplète/);
    assert.match(moduleMarkup, /Réparer et recharger/);

    const storageMarkup = render({ detail: 'QuotaExceededError: boom' });
    assert.match(storageMarkup, /Stockage saturé/);
    assert.match(storageMarkup, /Libérez un peu d’espace/);
});

test('l’écran reste lisible en arabe et en anglais', () => {
    const arabic = render({ locale: 'ar' });
    assert.match(arabic, /lang="ar"/);
    assert.match(arabic, /dir="rtl"/);
    assert.match(arabic, /لا شيء ضاع/);
    assert.match(arabic, /العودة إلى البداية/);

    const english = render({ locale: 'en' });
    assert.match(english, /lang="en"/);
    assert.match(english, /Nothing is lost/);
    assert.match(english, /Back to home/);
});

test('écran de reprise : le détail technique reste replié', () => {
    assert.doesNotMatch(render(), /Détails/);
    const markup = render({ detail: 'TypeError: boom' });
    assert.match(markup, /<details class="app-error__detail">/);
    assert.match(markup, /TypeError: boom/);
});

test('la réparation vidant le cache ne masque jamais l’action de reprise', () => {
    const markup = render({ detail: 'ChunkLoadError: loading chunk 42 failed', recovering: true });
    assert.match(markup, /Réparation…/);
    assert.match(markup, /disabled=""/);
    assert.match(markup, /aria-busy="true"/);
});

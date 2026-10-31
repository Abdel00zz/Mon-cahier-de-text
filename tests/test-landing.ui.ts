import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { LandingPage } from '../src/features/auth/LandingPage';

test('accueil bilingue : préparation immédiate, connexion et action conditionnelle', () => {
  for (const locale of ['fr', 'ar'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, manageDocument: false,
      children: createElement(LandingPage, { locale, onLogin: () => {}, onRegister: () => {} }) }));
    assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 3);
    assert.match(html, /class="registration-login"/);
    assert.match(html, /type="submit"[^>]*disabled/);
    assert.match(html, locale === 'ar' ? /السلك التعليمي/ : /Cycle/);
  }
});

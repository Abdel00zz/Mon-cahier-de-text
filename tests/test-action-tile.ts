import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Download } from 'lucide-react';
import { SquareActionButton } from '../src/components/ui/SquareActionButton';

test('action tiles render a real Lucide forwardRef icon and a complete accessible label', () => {
  const label = 'Restaurer une sauvegarde complète';
  const markup = renderToStaticMarkup(createElement(SquareActionButton, { icon: Download, title: label, subtitle: 'Choisir un fichier sur cet appareil' }));
  assert.match(markup, /<svg/);
  assert.ok(markup.includes(`aria-label="${label}"`));
  assert.ok(markup.includes('Choisir un fichier sur cet appareil'));
});

test('busy actions keep their label and prevent a duplicate submission', () => {
  const markup = renderToStaticMarkup(createElement(SquareActionButton, { icon: createElement(Download), title: 'Sauvegarder', isLoading: true, loadingText: 'Enregistrement…' }));
  assert.match(markup, /disabled=""/);
  assert.match(markup, /aria-busy="true"/);
  assert.ok(markup.includes('Enregistrement…'));
});

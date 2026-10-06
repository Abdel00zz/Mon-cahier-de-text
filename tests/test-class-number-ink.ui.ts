import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassGroupWatermark } from '../src/features/dashboard/ClassLevelBadge';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

/*
 * Le numéro de classe est le repère le plus lu du tableau de bord : il doit
 * s'écrire à l'ENCRE. On vérifie ici les deux moitiés du contrat :
 *  - le composant ne teinte plus le chiffre par le ton de la carte ;
 *  - la feuille de styles lui donne une encre pleine (noir chaud en clair,
 *    ivoire en sombre) et un contour couleur carte nettement visible.
 */

const css = readFileSync('src/styles/index.css', 'utf8');

// Le composant est rendu seul : il n'importe aucune feuille de styles, donc le
// test tourne en Node, sans navigateur (ClassCard, lui, tire des CSS).
const html = renderToStaticMarkup(
    React.createElement(LocaleProvider, {
        locale: 'fr',
        children: React.createElement(ClassGroupWatermark, {
            group: '2',
            label: '2ème Année Collégiale 2',
            themeTone: 'sand',
            tierKey: 'college',
            variant: 'inline',
        }),
    })
);

test('le numéro de classe est rendu, sans teinte propre au ton de la carte', () => {
    assert.ok(html.includes('keep-group-watermark'), 'le numéro est monté');
    assert.doesNotMatch(
        html,
        /keep-group-watermark[^"]*text-(amber|orange|lime|emerald|sky|indigo|purple|fuchsia|rose|stone)-\d/,
        'plus aucune couleur de palette figée sur le chiffre',
    );
});

test('le numéro de classe porte l’encre du thème, pleinement opaque', () => {
    const start = css.indexOf('  .keep-group-watermark {');
    assert.ok(start > 0, 'la définition unique existe');
    const block = css.slice(start, css.indexOf('  }', start));
    assert.match(block, /color: hsl\(var\(--foreground\)\)/, 'encre de la palette');
    assert.match(block, /opacity: 1;/, 'opacité pleine');
    assert.doesNotMatch(block, /opacity: 0\.\d/, 'plus d’opacité partielle');
});

test('le contour du numéro est détouré sur les quatre côtés', () => {
    const start = css.indexOf('  .keep-group-watermark {');
    const block = css.slice(start, css.indexOf('  }', start));
    for (const side of ['-1px -1px 0 hsl(var(--card))', '1px -1px 0 hsl(var(--card))', '-1px 1px 0 hsl(var(--card))', '1px 1px 0 hsl(var(--card))']) {
        assert.ok(block.includes(side), `contour manquant : ${side}`);
    }
    // Le contour sombre suit le thème, jamais une teinte de classe.
    assert.match(css, /\.dark \.keep-group-watermark \{\n\s*text-shadow:/, 'contour spécifique au mode sombre');
});

test('plus aucune teinte de ton résiduelle sur le numéro', () => {
    assert.doesNotMatch(css, /keep-group-watermark\[data-tone=/, 'les couleurs par ton ont disparu');
    assert.match(css, /Le numéro de classe n'a qu'une seule définition/, 'pas de règle concurrente');
});

test('le numéro reste écrit en chiffres latins, dans un isolat bidi', () => {
    assert.match(html, /<bdi dir="ltr">2<\/bdi>/, 'le chiffre se lit 2 en arabe comme en français');
});

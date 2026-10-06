import assert from 'node:assert/strict';
import test from 'node:test';
import { expandHtmlTags } from '../src/lib/text/htmlTags';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { MAX_CONTENT_DOCUMENT_CHARS } from '../src/constants/contentDocument';

/*
 * Documents pédagogiques et élèves consignés : deux contrats.
 *  1. La source rédigée par le professeur est mise en forme par le moteur du
 *     carnet ; les balises HTML connues y sont TRADUITES, les autres restent du
 *     texte (aucun HTML n'est exécuté) ;
 *  2. La synchronisation refuse un document trop gros, une liste d'élèves
 *     malformée ou un horodatage absent — sans cela, un push corrompu
 *     remplacerait la version saine du compte.
 */

test('les balises HTML connues deviennent des marqueurs du moteur', () => {
  assert.equal(expandHtmlTags('<b>gras</b>'), '**gras**');
  assert.equal(expandHtmlTags('<strong>gras</strong>'), '**gras**');
  assert.equal(expandHtmlTags('<em>italique</em>'), '*italique*');
  assert.equal(expandHtmlTags('<u>souligné</u>'), '++souligné++');
  assert.equal(expandHtmlTags('<mark>surligné</mark>'), '==surligné==');
  assert.equal(expandHtmlTags('<b class="x">gras</b>'), '**gras**', 'les attributs sont acceptés');
  assert.equal(expandHtmlTags('<B>GRAS</B>'), '**GRAS**', 'la casse n’a pas d’importance');
  // Imbrication : chaque paire est traduite indépendamment.
  assert.equal(expandHtmlTags('<b><i>deux</i></b>'), '***deux***');
});

test('les blocs HTML deviennent des lignes du moteur', () => {
  assert.equal(expandHtmlTags('a<br>b'), 'a\nb');
  assert.equal(expandHtmlTags('a<br/>b'), 'a\nb');
  assert.equal(expandHtmlTags('<p>un</p>'), 'un\n\n');
  assert.equal(expandHtmlTags('<ul><li>un</li><li>deux</li></ul>'), '\n- un\n- deux\n\n');
  // Le moteur reconnaît « - » en début de ligne : la liste est donc réelle.
  assert.match(expandHtmlTags('<li>seul</li>'), /^- seul/m);
});

test('les entités courantes sont rendues en caractères', () => {
  assert.equal(expandHtmlTags('a&nbsp;b'), 'a\u00A0b');
  assert.equal(expandHtmlTags('1 &lt; 2 &amp;&amp; 3 &gt; 2'), '1 < 2 && 3 > 2');
  assert.equal(expandHtmlTags('3&times;4'), '3×4');
});

test('une balise inconnue reste du texte, jamais du code', () => {
  assert.equal(expandHtmlTags('<script>alert(1)</script>'), '<script>alert(1)</script>');
  assert.equal(expandHtmlTags('<div onclick="x()">coucou</div>'), 'coucou\n', 'seul le conteneur connu est retiré');
  assert.equal(expandHtmlTags('x < y'), 'x < y', 'un chevron isolé n’est pas une balise');
  assert.equal(expandHtmlTags(''), '');
  assert.equal(expandHtmlTags('texte simple'), 'texte simple');
});

test('un texte sans chevron est rendu identique (passe transparente)', () => {
  const source = '1. Exercice\n   **a.** Calculez $\\frac{1}{2}$\n\nUn paragraphe.';
  assert.equal(expandHtmlTags(source), source);
});

test('la synchronisation accepte un document et une liste d’élèves valides', () => {
  const settings = {
    assessmentDocuments: {
      classe1: { dev1: { source: '**Exercice 1**\n$\\frac{a}{b}$', updatedAt: '2026-10-06T08:00:00.000Z' } },
    },
    pedagogicalEvents: {
      classe1: [{
        id: 'ev1', type: 'controle_cahiers', title: 'Contrôle des cahiers', date: '2026-10-06',
        status: 'done', createdAt: '2026-10-06T08:00:00.000Z',
        students: { names: ['Amine R.', 'Salma B.'], updatedAt: '2026-10-06T08:05:00.000Z' },
        document: { source: 'Fiche de contrôle', updatedAt: '2026-10-06T08:06:00.000Z' },
      }],
    },
  };
  const validated = assertValidSyncSettings(settings, new Set(['classe1']));
  assert.ok(validated, 'le lot passe la validation');
  assert.deepEqual(
    (validated!.pedagogicalEvents as Record<string, Array<{ students?: { names: string[] } }>>).classe1[0].students?.names,
    ['Amine R.', 'Salma B.'],
  );
});

test('la synchronisation refuse un document ou une liste d’élèves corrompus', () => {
  const tooLong = 'x'.repeat(MAX_CONTENT_DOCUMENT_CHARS + 1);
  const cases: Array<[string, unknown]> = [
    ['document sans horodatage', { assessmentDocuments: { classe1: { dev1: { source: 'ok' } } } }],
    ['document trop long', { assessmentDocuments: { classe1: { dev1: { source: tooLong, updatedAt: '2026-10-06T08:00:00.000Z' } } } }],
    ['document d’un type inattendu', { assessmentDocuments: { classe1: { dev1: { source: 42, updatedAt: '2026-10-06T08:00:00.000Z' } } } }],
    ['horodatage illisible', { assessmentDocuments: { classe1: { dev1: { source: 'ok', updatedAt: 'hier' } } } }],
    ['élèves sans nom', { pedagogicalEvents: { classe1: [{ id: 'e', type: 'olympiade', title: 'T', date: '2026-10-06', status: 'planned', createdAt: '2026-10-06T08:00:00.000Z', students: { names: [''], updatedAt: '2026-10-06T08:00:00.000Z' } }] } }],
    ['élèves sans horodatage', { pedagogicalEvents: { classe1: [{ id: 'e', type: 'olympiade', title: 'T', date: '2026-10-06', status: 'planned', createdAt: '2026-10-06T08:00:00.000Z', students: { names: ['A'] } }] } }],
    ['document d’activité invalide', { pedagogicalEvents: { classe1: [{ id: 'e', type: 'olympiade', title: 'T', date: '2026-10-06', status: 'planned', createdAt: '2026-10-06T08:00:00.000Z', document: { source: '', updatedAt: 3 } }] } }],
  ];
  for (const [label, settings] of cases) {
    assert.throws(() => assertValidSyncSettings(settings, new Set(['classe1'])), `${label} doit être refusé`);
  }
  // La limite exacte reste acceptée : la borne est inclusive, pas approximative.
  const atLimit = 'x'.repeat(MAX_CONTENT_DOCUMENT_CHARS);
  assert.ok(assertValidSyncSettings(
    { assessmentDocuments: { classe1: { dev1: { source: atLimit, updatedAt: '2026-10-06T08:00:00.000Z' } } } },
    new Set(['classe1']),
  ));
});

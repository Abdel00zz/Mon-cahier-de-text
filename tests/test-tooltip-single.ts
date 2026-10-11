import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

/*
 * UNE SEULE INFOBULLE — le rendu de l'application, partout.
 *
 * L'application a connu deux bulles pour un même bouton : la nôtre (fond noir,
 * affichée au survol) et celle du système (attribut `title`, affichée en
 * retard par le navigateur — et absente de l'APK au doigt). Le gestionnaire
 * global doit maintenant : fonctionner au tactile (appui long), neutraliser le
 * `title` natif pendant l'affichage, et rester la SEULE source d'infobulle.
 */

const read = (path: string) => readFileSync(path, 'utf8');

test('l’infobulle globale fonctionne au doigt (APK), à la souris et au clavier', () => {
  const source = read('src/components/ui/GlobalTooltip.tsx');
  assert.match(source, /LONG_PRESS_MS/, 'l’appui long tactile déclenche l’infobulle');
  assert.match(source, /onPointerDown/, 'le geste tactile est écouté dès le contact');
  assert.match(source, /pointerType === 'touch'/, 'la branche tactile est explicite');
  assert.doesNotMatch(source, /if \(isTouch\) return/, 'plus de désactivation silencieuse au tactile');
  assert.match(source, /onFocusIn/, 'le clavier conserve l’infobulle');
  assert.match(source, /'Escape'/, 'Échap ferme l’infobulle');
});

test('le title natif est neutralisé pendant l’affichage — une seule bulle visible', () => {
  const source = read('src/components/ui/GlobalTooltip.tsx');
  assert.match(source, /stashTitle/, 'le title est mis de côté');
  assert.match(source, /removeAttribute\('title'\)/, 'le title sort du DOM : pas de bulle système en double');
  assert.match(source, /restoreTitle/, 'le title est restauré à la fermeture');
  assert.match(source, /getAttribute\('data-tippy-content'\)/, 'l’API explicite garde la priorité');
});

test('seul un data-tippy-content déclenche une infobulle — pas chaque attribut title', () => {
  const source = read('src/components/ui/GlobalTooltip.tsx');
  assert.ok(!source.includes("[data-tippy-content], [title]"),
    'le title ne doit plus être une source : il couvrait de bulles du texte tronqué et des libellés déjà visibles');
  assert.match(source, /closest<HTMLElement>\('\[data-tippy-content\]'\)/, 'une seule source, explicite');
});

test('les éléments à pastille n’ont plus de title redondant', () => {
  const view = read('src/features/evaluations/DevoirsView.tsx');
  for (const duplicate of ['title={docTooltip}', 'title={absentsTooltip}', 'title={oralTooltip}',
    'title={homeworkTooltip}', 'title={addTooltip}', 'title={statusExplanation}',
    'title={eventDocTooltip}', 'title={eventStudentsTooltip}', 'title={deleteTooltip}']) {
    assert.ok(!view.includes(duplicate), `${duplicate} ferait deux infobulles pour un bouton`);
  }
  const renderer = read('src/features/editor/ContentRenderer.tsx');
  assert.ok(!renderer.includes('title={fullTooltip}'), 'la pastille de type garde une seule source');
});

test('l’admin reçoit le même rendu d’infobulle', () => {
  const entry = read('src/admin/index.tsx');
  assert.match(entry, /<GlobalTooltip \/>/);
});

test('l’application principale monte le gestionnaire une seule fois', () => {
  const app = read('src/app/App.tsx');
  assert.equal((app.match(/<GlobalTooltip \/>/g) ?? []).length, 1);
});

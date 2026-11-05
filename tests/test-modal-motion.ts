import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { acquireModalLayer } from '../src/platform/modalStack';

test('a nested form stays above its parent even when an intermediate dialog closes', () => {
  const parent = acquireModalLayer();
  const nested = acquireModalLayer();
  const confirmation = acquireModalLayer();
  assert.ok(parent.layer < nested.layer && nested.layer < confirmation.layer);
  nested.release();
  const last = acquireModalLayer();
  assert.ok(last.layer > confirmation.layer);
  last.release(); confirmation.release(); parent.release();
  parent.release(); // React cleanup and close notification may both run.
  const reopened = acquireModalLayer();
  assert.equal(reopened.layer, 0);
  reopened.release();
});

test('les modales Paramètres et Aide sont des dialogues liquides à taille flexible', () => {
  const settings = readFileSync('src/features/settings/ConfigModal.tsx', 'utf8');
  assert.match(settings, /mobilePresentation="dialog"/, 'les paramètres ne sont plus une feuille');
  assert.match(settings, /hideClose/, 'les paramètres gardent leur en-tête sans croix');
  assert.match(settings, /title=\{inSection \? \(/, 'le titre reste visible dans la barre du haut');
  assert.match(settings, /bottomNavigation=\{mobileNavigation\}/, 'la navigation mobile est intégrée à la fenêtre');
  assert.match(settings, /liquid-modal/, 'la coque des paramètres est en verre');
  const guide = readFileSync('src/features/guide/GuideModal.tsx', 'utf8');
  assert.match(guide, /mobilePresentation="dialog"/, 'l’aide n’est plus une feuille');
  assert.match(guide, /hideClose/, 'l’aide garde son en-tête sans croix');
  assert.match(guide, /guide-title/, 'le titre reste visible dans la barre du haut');
  assert.match(guide, /bottomNavigation=\{mobileNavigation\}/, 'la navigation mobile est intégrée à la fenêtre');
  assert.match(guide, /liquid-modal/, 'la coque de l’aide est en verre');
  const settingsCss = readFileSync('src/features/settings/settingsModal.css', 'utf8');
  assert.match(settingsCss, /\.settings-modal-frame\.modal-motion-surface \.modal-pro-header \{[^}]*border-bottom:\s*0;/,
    'le filet sous l’en-tête des paramètres est supprimé');
  const guideCss = readFileSync('src/features/guide/guide.css', 'utf8');
  assert.match(guideCss, /\.learning-guide-modal-header\.modal-pro-header \{[^}]*border:\s*0;/,
    'le filet de l’en-tête de l’aide est supprimé');
  const css = readFileSync('src/components/ui/modal-motion.css', 'utf8');
  assert.match(css, /\.modal-motion-surface\.liquid-modal/);
  assert.match(css, /height:\s*fit-content/, 'la hauteur suit le contenu');
  assert.match(css, /backdrop-filter:\s*blur\(20px\)\s*saturate\(140%\)/, 'le verre reste subtil pour limiter le coût de composition');
  assert.match(css, /prefers-reduced-transparency: reduce/, 'le verre s’efface si l’utilisateur refuse la transparence');
});

test('les modales partagent un socle unique et les overlays spécialisés rejoignent la pile commune', () => {
  const entry = readFileSync('src/components/ui/modal.tsx', 'utf8');
  assert.match(entry, /return <ModalBottomSheet \{\.\.\.props\} \/>/);

  const pwa = readFileSync('src/features/assistant/PwaInstallModal.tsx', 'utf8');
  assert.match(pwa, /import \{ Modal \} from ['"]@\/components\/ui\/modal['"]/);
  assert.match(pwa, /mobilePresentation="dialog"/);
  assert.doesNotMatch(pwa, /DialogPrimitive\.Root/);

  const command = readFileSync('src/components/ui/CommandPalette.tsx', 'utf8');
  assert.match(command, /acquireModalLayer/);
  assert.match(command, /className="modal-motion-overlay fixed inset-0"/);
  assert.match(command, /command-palette-surface/);

  const core = readFileSync('src/components/ui/modal-bottom-sheet.tsx', 'utf8');
  assert.match(core, /dismissedForOpen/);
  assert.match(core, /disabled=\{closeDisabled \|\| blockDismiss\}/, 'la fermeture reste cohérente avec blockDismiss');
  assert.match(core, /bottomNavigation && <div className="modal-bottom-navigation">/,
    'la navigation est rendue dans la fenêtre et reste accessible dans sa pile de focus');

  const confirm = readFileSync('src/components/ui/confirm-dialog.tsx', 'utf8');
  assert.match(confirm, /data-modal-alert="true"/, 'la confirmation conserve la sémantique AlertDialog compacte');
  assert.match(confirm, /acquireModalLayer/);
});

test('shared modal entry and exit animate only composited properties', () => {
  const css = postcss.parse(readFileSync('src/components/ui/modal-motion.css', 'utf8'));
  let keyframes = 0;
  css.walkAtRules('keyframes', rule => {
    keyframes++;
    rule.walkDecls(decl => assert.ok(['opacity', 'transform'].includes(decl.prop), `${rule.params}: ${decl.prop}`));
  });
  assert.ok(keyframes > 0);
  assert.match(css.toString(), /prefers-reduced-motion: reduce/);
  assert.match(css.toString(), /command-palette-surface\[data-state="open"\]/);
  assert.match(css.toString(), /prefers-reduced-transparency: reduce/);
});

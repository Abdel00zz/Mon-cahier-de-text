import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readMessageSource } from './readMessages';

const read = (path: string) => readFileSync(path, 'utf8');

// Philosophie « calme » : une information à la fois. Ces garde-fous empêchent
// le retour des ornements et des doublons de texte retirés.
test('les fenêtres n’affichent plus d’ornement andalou', () => {
    const css = read('src/styles/codex-modal.css');
    assert.doesNotMatch(css, /zellige|rosette/, 'aucun motif décoratif dans les en-têtes');
    assert.doesNotMatch(css, /data-codex-title\]::before/, 'plus de glyphe devant le titre');
});

test('aucun texte ne répète ce que dit déjà la section', () => {
    const appearance = read('src/features/settings/components/AppearanceTab.tsx');
    assert.doesNotMatch(appearance, /language\.settings\.active/, 'la langue n’est plus nommée deux fois');

    const archives = read('src/features/settings/components/ArchivesSection.tsx');
    assert.doesNotMatch(archives, /archives\.empty\.body/, 'l’état vide ne répète pas la consigne de la section');

    const notifications = read('src/features/settings/components/NotificationsTab.tsx');
    assert.doesNotMatch(notifications, /notifications\.intro/, 'plus de sous-titre qui redit le titre');

    const account = read('src/features/settings/components/AccountDataTab.tsx');
    assert.doesNotMatch(account, /account\.adminPortalHint/, 'le portail d’administration se décrit par son titre');

    // Deux informations pour un même fait : la pastille d’état et l’heure de la
    // dernière synchronisation. La pastille ne reste que hors de l’état nominal.
    const accountTab = read('src/features/settings/components/AccountTab.tsx');
    assert.match(accountTab, /syncStatus !== 'synced' &&/, 'la pastille disparaît quand tout est synchronisé');
});

test('les clés de texte supprimées ne traînent pas dans les dictionnaires', () => {
    const messages = readMessageSource();
    const domains = read('src/i18n/domains/accountArchivesSchedule.ts');
    for (const key of ['language.settings.active', 'archives.empty.body', 'notifications.intro']) {
        assert.ok(!messages.includes(`'${key}'`), `${key} doit disparaître de messages.ts`);
    }
    assert.ok(!domains.includes("'account.adminPortalHint'"), 'account.adminPortalHint doit disparaître');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { runInboxLongPoll, type InboxLongPollPage } from '../src/infrastructure/messages/inboxLongPoll';

type Page = InboxLongPollPage & { unreadCount: number };

test('attente active : première lecture immédiate, puis attente sur la signature', async () => {
  const calls: { wait: number; since: string }[] = [];
  const pages: Page[] = [{ signature: 'a', unreadCount: 0 }, { signature: 'a', unreadCount: 0 }, { signature: 'b', unreadCount: 1 }];
  const delivered: number[] = [];
  let live = true;
  await runInboxLongPoll<Page>({
    wait: 8_000,
    isActive: () => live,
    load: async options => { calls.push(options); return pages[Math.min(calls.length - 1, pages.length - 1)]; },
    onPage: page => { delivered.push(page.unreadCount); if (delivered.length === 2) live = false; },
  });
  assert.deepEqual(calls, [{ wait: 0, since: '' }, { wait: 8_000, since: 'a' }, { wait: 8_000, since: 'a' }]);
  // Une échéance sans changement ne réveille pas l'interface.
  assert.deepEqual(delivered, [0, 1]);
});

test('signature absente : la boucle s’arrête et laisse le repli périodique travailler', async () => {
  let loads = 0;
  let pages = 0;
  await runInboxLongPoll<Page>({
    isActive: () => true,
    load: async () => { loads += 1; return { unreadCount: 0 } as Page; },
    onPage: () => { pages += 1; },
  });
  assert.equal(loads, 1);
  assert.equal(pages, 0);
});

test('échec réseau : repli progressif puis reprise sur la même boucle', async () => {
  const delays: number[] = [];
  let attempts = 0;
  let live = true;
  const delivered: string[] = [];
  await runInboxLongPoll<Page>({
    isActive: () => live,
    idle: async ms => { delays.push(ms); },
    load: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('réseau indisponible');
      return { signature: 's1', unreadCount: 2 };
    },
    onPage: page => { delivered.push(String(page.signature)); live = false; },
  });
  assert.deepEqual(delays, [1_000, 2_000]);
  assert.deepEqual(delivered, ['s1']);
});

test('boucle inactive : aucune requête n’est émise', async () => {
  let loads = 0;
  await runInboxLongPoll<Page>({
    isActive: () => false,
    load: async () => { loads += 1; return { signature: 'a', unreadCount: 0 }; },
    onPage: () => { throw new Error('aucune page ne doit être transmise'); },
  });
  assert.equal(loads, 0);
});

test('un changement pendant le repli est vu à la reprise, sans doublon', async () => {
  const signatures = ['s1', 's1', 's2'];
  const attempts = { value: 0 };
  const delivered: string[] = [];
  let live = true;
  await runInboxLongPoll<Page>({
    isActive: () => live,
    load: async () => {
      const index = attempts.value;
      attempts.value += 1;
      if (index === signatures.length - 1) assert.equal(delivered.length, 1);
      return { signature: signatures[index], unreadCount: index };
    },
    onPage: page => { delivered.push(String(page.signature)); if (delivered.length === 2) live = false; },
  });
  assert.deepEqual(delivered, ['s1', 's2']);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useClassManager } from '../src/hooks/useClassManager';
import { switchAccountWorkspace } from '../src/infrastructure/storage/accountWorkspace';

test('une suppression refusée par le stockage ne signale pas de succès et conserve le cahier', () => {
  const entries = new Map([
    ['classManager_v1', JSON.stringify([{ id: 'own', name: '1AC 1' }])],
    ['classData_v1_own', '[{"type":"chapter","title":"Conservé"}]'],
  ]);
  const storage = {
    get length() { return entries.size; },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: (key: string) => { entries.delete(key); },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  let manager: ReturnType<typeof useClassManager> | undefined;
  const Probe = () => { manager = useClassManager(); return null; };
  try {
    renderToStaticMarkup(React.createElement(Probe));
    assert.throws(() => manager!.deleteClass('own'), /Impossible de supprimer/);
    assert.match(storage.getItem('classManager_v1')!, /own/);
    assert.match(storage.getItem('classData_v1_own')!, /Conservé/);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('un nouveau compte Google démarre sans classes et conserve celles du compte précédent', () => {
  const entries = new Map<string, string>();
  const storage = {
    get length() { return entries.size; },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
  };
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  const Probe = () => React.createElement('span', null, JSON.stringify(useClassManager().classes));
  try {
    switchAccountWorkspace('acct_11111111111111111111111111111111', { storage });
    storage.setItem('classManager_v1', JSON.stringify([{ id: 'own', name: '1AC 1' }]));
    switchAccountWorkspace('acct_22222222222222222222222222222222', { storage });
    assert.equal(renderToStaticMarkup(React.createElement(Probe)), '<span>[]</span>');
    assert.equal(storage.getItem('classManager_v1'), null);
    assert.equal(storage.getItem('app_first_launch_v1'), null);
    switchAccountWorkspace('acct_11111111111111111111111111111111', { storage });
    assert.match(renderToStaticMarkup(React.createElement(Probe)), /own/);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});


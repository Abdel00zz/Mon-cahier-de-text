import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assignClassColors, classColorFamily, isClassColor } from '../src/domain/classes/classColors';
import type { ClassInfo } from '../src/types';

const classFor = (name: string, id: string): ClassInfo => ({
  name, id, cycle: 'lycee', subject: 'Mathématiques', teacherName: '', color: 'mint', createdAt: '2026-09-01',
});

test('les couleurs regroupent les niveaux et filières, indépendamment du groupe et de la langue', () => {
  const families = [
    ['Tronc Commun Scientifique 1', 'Tronc Commun Lettres et Sciences Humaines 2', 'الجذع المشترك العلمي ٣'],
    ['1er Bac Sciences Expérimentales 1', '1er Bac Sciences Mathématiques 2', 'الأولى بكالوريا علوم رياضية ٣'],
    ['1er Bac Lettres et Sciences Humaines 1', 'الأولى بكالوريا آداب وعلوم إنسانية ٢'],
    ['2ème Bac Sciences Physiques 1', '2BAC SVT 2', 'الثانية بكالوريا علوم رياضية أ ٣'],
    ['2ème Bac Lettres 1', '2ème Bac Sciences Humaines 2', 'الثانية بكالوريا آداب ٣'],
    ['1er Bac Sciences Économiques et Gestion 1', 'الأولى بكالوريا علوم اقتصادية وتدبير ٢'],
    ['2ème Bac Sciences Économiques 1', '2ème Bac Sciences de Gestion Comptable 2'],
    ['1AC 1', 'الأولى إعدادي ٢'], ['2AC 1'], ['3AC 1'],
  ];
  const source = families.flatMap((names, family) => names.map((name, group) => classFor(name, `${family}-${group}`)));
  const migrated = assignClassColors(source);
  const colors = families.map((names, index) => {
    assert.ok(names.every(name => classColorFamily(name) === classColorFamily(names[0])), names.join(' / '));
    const members = migrated.filter(item => item.id.startsWith(`${index}-`));
    assert.equal(new Set(members.map(item => item.color)).size, 1);
    return members[0].color;
  });
  assert.equal(new Set(colors).size, families.length);
  assert.ok(migrated.every(item => isClassColor(item.color)));
  assert.deepEqual(assignClassColors([...source].reverse()).reverse(), migrated);
  assert.deepEqual(assignClassColors(JSON.parse(JSON.stringify(migrated))), migrated);
  assert.ok(assignClassColors(migrated).every((item, index) => item === migrated[index]));
  assert.ok(source.every(item => item.color === 'mint'), 'la migration ne modifie pas la source');
});

test('ajout, suppression et renommage gardent les repères des familles et réparent les collisions libres', () => {
  const original = assignClassColors([classFor('1er Bac Sciences Mathématiques 1', 'science'), classFor('Ma classe libre', 'free')]);
  const added = assignClassColors([...original, classFor('1er Bac Sciences Expérimentales 9', 'new'), classFor('2ème Bac Lettres 1', 'letters')]);
  assert.deepEqual(added.slice(0, 2), original);
  assert.equal(added[0].color, added[2].color);
  assert.notEqual(added[0].color, added[3].color);
  assert.deepEqual(assignClassColors(added.slice(1)), added.slice(1));
  const renamed = assignClassColors(added.map(item => item.id === 'science' ? { ...item, name: '2ème Bac Lettres 3' } : item));
  assert.equal(renamed[0].color, renamed[3].color);
  const collision = assignClassColors([classFor('1er Bac Sciences Mathématiques 1', 'science'), { ...classFor('Ma classe libre', 'free'), color: 'sky' }]);
  assert.notEqual(collision[0].color, collision[1].color);
});

test('les huit aplats du dashboard sont distincts et les textes conservent un contraste AA', () => {
  const css = readFileSync(new URL('../src/features/dashboard/classCards.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/\.class-card\[data-keep-tone="([^"]+)"\]:not\(\[data-class-color\]\)\s*\{([^}]+)\}/g)];
  const token = (body: string, key: string) => body.match(new RegExp(`--class-${key}: (#[a-f0-9]{6})`))![1];
  const luminance = (hex: string) => {
    const [r, g, b] = hex.match(/[a-f0-9]{2}/g)!.map(value => parseInt(value, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
  };
  assert.equal(rules.length, 8);
  assert.equal(new Set(rules.map(([, , body]) => token(body, 'surface'))).size, 8);
  assert.equal(new Set(rules.map(([, , body]) => token(body, 'accent'))).size, 8);
  for (const [, tone, body] of rules) {
    assert.ok((luminance(token(body, 'surface')) + .05) / (luminance(token(body, 'accent')) + .05) >= 4.5, tone);
  }
});

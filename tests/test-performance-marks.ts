import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeasurements } from '../src/platform/performanceMarks';

const harness = (enabled = true) => {
  let clock = 0;
  const lines: string[] = [];
  const measurements = createMeasurements({ enabled, now: () => clock, log: line => { lines.push(line); } });
  return { measurements, lines, advance: (ms: number) => { clock += ms; } };
};

test('mesures : une durée est journalisée en millisecondes avec son détail', () => {
  const { measurements, lines, advance } = harness();
  measurements.start('synchronisation/classes');
  advance(1_240);
  assert.equal(measurements.end('synchronisation/classes', { classes: 8 }), 1_240);
  assert.deepEqual(lines, ['synchronisation/classes: 1240 ms classes=8']);
});

test('mesures : un chronomètre ne sert qu’une fois', () => {
  const { measurements, advance } = harness();
  measurements.start('cahier/ouverture');
  advance(30);
  assert.equal(measurements.end('cahier/ouverture'), 30);
  assert.equal(measurements.end('cahier/ouverture'), null);
});

test('mesures : un nom jamais ouvert ne produit rien', () => {
  const { measurements, lines } = harness();
  assert.equal(measurements.end('connexion/debut'), null);
  assert.deepEqual(lines, []);
});

test('mesures : désactivées, elles n’ont aucun coût et ne journalisent rien', () => {
  const { measurements, lines, advance } = harness(false);
  measurements.start('synchronisation/debut');
  advance(5_000);
  assert.equal(measurements.end('synchronisation/debut'), null);
  assert.deepEqual(lines, []);
});

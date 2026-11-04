import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createVitalsCollector,
    initWebVitals,
    rateVital,
    VITAL_THRESHOLDS,
    type VitalSample,
} from '../src/platform/webVitals';

test('classement des Core Web Vitals selon les seuils web.dev', () => {
    assert.deepEqual(VITAL_THRESHOLDS.LCP, [2500, 4000]);
    assert.equal(rateVital('LCP', 1800), 'good');
    assert.equal(rateVital('LCP', 3000), 'needs-improvement');
    assert.equal(rateVital('LCP', 5200), 'poor');
    assert.equal(rateVital('CLS', 0.05), 'good');
    assert.equal(rateVital('CLS', 0.2), 'needs-improvement');
    assert.equal(rateVital('INP', 640), 'poor');
    assert.equal(rateVital('TTFB', 1200), 'needs-improvement');
});

test('collecteur : conserve la mesure la plus pénalisante et vide son tampon', () => {
    const logged: VitalSample[] = [];
    const sent: VitalSample[][] = [];
    const collector = createVitalsCollector({ log: sample => logged.push(sample), send: samples => sent.push(samples) });
    collector.record('LCP', 1200);
    collector.record('LCP', 3400);
    collector.record('CLS', Number.NaN);
    collector.record('INP', -5);
    assert.deepEqual(collector.pending(), ['LCP']);
    const flushed = collector.flush();
    assert.equal(flushed.length, 1);
    assert.deepEqual(flushed[0], { name: 'LCP', value: 3400, rating: 'needs-improvement' });
    assert.equal(logged.length, 1);
    assert.equal(sent.length, 1);
    assert.deepEqual(collector.pending(), []);
    assert.deepEqual(collector.flush(), []);
});

test('initWebVitals : agrège LCP, CLS, INP et TTFB puis transmet à la sortie de page', () => {
    const handlers = new Map<string, (entries: unknown[]) => void>();
    let hidden = () => {};
    const samples: VitalSample[] = [];
    const dispose = initWebVitals({
        environment: {
            observe: (type, handler) => { handlers.set(type, handler as (entries: unknown[]) => void); return () => handlers.delete(type); },
            navigationEntry: () => ({ responseStart: 640 }),
            onHidden: handler => { hidden = handler; return () => { hidden = () => {}; }; },
        },
        sink: { log: sample => samples.push(sample) },
    });
    handlers.get('largest-contentful-paint')?.([{ startTime: 2100 }]);
    handlers.get('layout-shift')?.([{ value: 0.04, hadRecentInput: false }, { value: 0.3, hadRecentInput: true }]);
    handlers.get('event')?.([{ duration: 96, interactionId: 7 }, { duration: 400 }]);
    handlers.get('first-input')?.([{ duration: 320 }]);
    hidden();
    const byName = new Map(samples.map(sample => [sample.name, sample.value]));
    assert.equal(byName.get('LCP'), 2100);
    // Un décalage provoqué par une saisie n'est pas imputé à l'expérience vécue.
    assert.equal(byName.get('CLS'), 0.04);
    // Seules les interactions réelles (interactionId) comptent pour l'INP.
    assert.equal(byName.get('INP'), 320);
    assert.equal(byName.get('TTFB'), 640);
    dispose();
    assert.equal(handlers.size, 0);
});

test('initWebVitals : sans PerformanceObserver, l’appel reste sans effet', () => {
    const samples: VitalSample[] = [];
    const dispose = initWebVitals({ environment: {}, sink: { log: sample => samples.push(sample) } });
    dispose();
    assert.deepEqual(samples, []);
});

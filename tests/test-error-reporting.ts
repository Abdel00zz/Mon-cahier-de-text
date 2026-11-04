import assert from 'node:assert/strict';
import test from 'node:test';
import { createErrorReporter, type ErrorReport } from '../src/platform/errorReporting';

const collect = (options = {}) => {
    const reports: ErrorReport[] = [];
    const reporter = createErrorReporter({
        now: () => 1_700_000_000_000,
        currentRoute: () => '#/classe/42',
        send: report => reports.push(report),
        ...options,
    });
    return { reporter, reports };
};

test('signalement : message, pile, route et horodatage exploitables', () => {
    const { reporter, reports } = collect();
    const error = new TypeError('lecture impossible');
    reporter(error, { componentStack: '\n  dans Editor' });
    assert.equal(reports.length, 1);
    assert.equal(reports[0].message, 'lecture impossible');
    assert.match(reports[0].stack ?? '', /lecture impossible/);
    assert.equal(reports[0].componentStack, '\n  dans Editor');
    assert.equal(reports[0].route, '#/classe/42');
    assert.equal(reports[0].at, 1_700_000_000_000);
});

test('signalement : une même erreur ne part qu’une fois, et le volume reste borné', () => {
    const { reporter, reports } = collect({ maxReports: 3 });
    reporter(new Error('réseau'));
    reporter(new Error('réseau'));
    assert.equal(reports.length, 1);
    for (const message of ['a', 'b', 'c', 'd']) reporter(new Error(message));
    assert.equal(reports.length, 3);
});

test('signalement : aucun envoi sans point de collecte configuré', () => {
    const reported: ErrorReport[] = [];
    const reporter = createErrorReporter({ log: report => reported.push(report) });
    reporter(new Error('silencieux'));
    assert.equal(reported.length, 1);
    assert.equal(reported[0].message, 'silencieux');
});

test('signalement : les charges sont tronquées pour rester légères', () => {
    const { reporter, reports } = collect();
    reporter(new Error('x'.repeat(5000)));
    assert.equal(reports[0].message.length, 2000);
});

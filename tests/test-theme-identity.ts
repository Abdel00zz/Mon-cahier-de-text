import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
});

const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const channel = (value: number) => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrastWithWhite = (hex: string) => 1.05 / (luminance(hexToRgb(hex)) + 0.05);

// Identité chromatique : papier ivoire (chaleur éditoriale) et dégradé aurore
// réservé aux actions principales. Ces deux décisions sont visibles partout :
// elles méritent un garde-fou, comme les rayons ou les polices.
test('le fond de l’application est un papier ivoire teinté, jamais du blanc pur', () => {
    const tokens = read('src/styles/theme-tokens.css');
    assert.match(tokens, /--background: 45 33% 97%;/, 'fond ivoire');
    assert.match(tokens, /--card: 45 45% 99\.4%;/, 'cartes presque blanches mais chaudes');
    assert.doesNotMatch(tokens, /--background: 0 0% 100%/, 'plus de blanc pur en fond');
});

test('l’encre blanche du dégradé aurore reste lisible sur chacun de ses arrêts', () => {
    const css = read('src/features/dashboard/dashboardCanvas.css');
    const gradient = css.match(/--serenite-grad: linear-gradient\(135deg, var\(--serenite-g1\) 0%, (#[0-9a-f]{6}) 55%, var\(--serenite-g2\) 100%\)/);
    assert.ok(gradient, 'dégradé aurore à trois arrêts');
    const stops = [
        css.match(/--serenite-g1: (#[0-9a-f]{6});/)?.[1],
        gradient[1],
        css.match(/--serenite-g2: (#[0-9a-f]{6});/)?.[1],
    ].filter((stop): stop is string => Boolean(stop));
    assert.equal(stops.length, 3);
    for (const stop of stops) {
        const ratio = contrastWithWhite(stop);
        assert.ok(ratio >= 4.5, `arrêt ${stop} : ${ratio.toFixed(2)}:1 avec le blanc (minimum 4.5:1)`);
    }
});

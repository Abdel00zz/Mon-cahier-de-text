import type { CSSProperties } from 'react';
import type { ClassInfo } from '@/types';
import { KEEP_TONES, keepToneForClass } from '@/platform/keepTheme';
import { hueOf } from '@/domain/classes/classColors';

/** Neutral shell fallback while the classes are loading. */
export const DASHBOARD_CANVAS_STYLE = Object.freeze({
    '--canvas-base': 'hsl(var(--background))',
    '--canvas-base-dark': '#0e0d12',
} as CSSProperties);

interface HarmonicColorPoint {
    hue: number;
    sat: number;
    lightness: number;
}

interface DynamicCanvasPalette {
    zenith: HarmonicColorPoint;
    nadir: HarmonicColorPoint;
    horizon: HarmonicColorPoint;
    dotHue: number;
    tintHue: number;
}

/**
 * Profils chromatiques optimisés pour chaque ton Keep (harmonie sensorielle & contraste).
 */
const TONE_SPECS: Record<typeof KEEP_TONES[number], HarmonicColorPoint> = {
    sand:     { hue: 43,  sat: 85, lightness: 55 },
    coral:    { hue: 24,  sat: 90, lightness: 58 },
    lime:     { hue: 77,  sat: 75, lightness: 52 },
    mint:     { hue: 155, sat: 72, lightness: 48 },
    sky:      { hue: 204, sat: 88, lightness: 56 },
    indigo:   { hue: 236, sat: 80, lightness: 60 },
    lavender: { hue: 276, sat: 75, lightness: 62 },
    rose:     { hue: 348, sat: 85, lightness: 58 },
};

/**
 * Calcule la distance angulaire la plus courte sur le cercle chromatique [0, 360).
 */
export function angularDistance(a: number, b: number): number {
    const delta = Math.abs(a - b) % 360;
    return Math.min(delta, 360 - delta);
}

/**
 * Extrait le point chromatique précis associé à une classe.
 */
export function resolveClassColorPoint(item: Pick<ClassInfo, 'id' | 'color'>): HarmonicColorPoint {
    const color = item.color || keepToneForClass(item.id);
    if (color in TONE_SPECS) {
        return TONE_SPECS[color as keyof typeof TONE_SPECS];
    }
    const hue = hueOf(color);
    const safeHue = typeof hue === 'number' && !Number.isNaN(hue) ? ((hue % 360) + 360) % 360 : 43;
    return {
        hue: safeHue,
        sat: 75,
        lightness: 55,
    };
}

/**
 * Algorithme avancé d'équilibrage chromatique pour le fond dynamique :
 * 1. Extraction et pondération : focus sur la séance en cours ou la classe primaire.
 * 2. Pôle Zénith (haut-droite) : teinte signature de la classe active ou directrice.
 * 3. Pôle Nadir (bas-gauche) : contre-point harmonique (écart angulaire maximal ou split-complémentaire à +145°).
 * 4. Pôle Horizon (centre-flanc) : triade d'équilibre maximisant la diversité visuelle.
 * 5. Moyenne vectorielle circulaire pondérée pour la trame pointillée et la nuance d'ambiance.
 */
export function computeHarmonicCanvasPalette(
    classes: Pick<ClassInfo, 'id' | 'color'>[] = [],
    activeSessionClassIds: string[] = []
): DynamicCanvasPalette {
    if (!classes || classes.length === 0) {
        return {
            zenith: { hue: 43, sat: 85, lightness: 55 },
            nadir: { hue: 155, sat: 72, lightness: 48 },
            horizon: { hue: 204, sat: 80, lightness: 56 },
            dotHue: 43,
            tintHue: 43,
        };
    }

    const activeSet = new Set(activeSessionClassIds);
    const weightedPoints = classes.map(cls => ({
        point: resolveClassColorPoint(cls),
        id: cls.id,
        weight: activeSet.has(cls.id) ? 3.0 : 1.0,
    }));

    // 1. Zénith : pôle principal (classe active en priorité, sinon première classe)
    const activeClass = weightedPoints.find(wp => activeSet.has(wp.id));
    const zenithPoint = activeClass ? activeClass.point : weightedPoints[0].point;

    // 2. Nadir : contre-pôle à séparation angulaire maximale
    let nadirPoint: HarmonicColorPoint;
    let maxDistance = -1;
    let candidateNadir: HarmonicColorPoint | null = null;

    for (const wp of weightedPoints) {
        const dist = angularDistance(wp.point.hue, zenithPoint.hue);
        if (dist > maxDistance) {
            maxDistance = dist;
            candidateNadir = wp.point;
        }
    }

    if (!candidateNadir || maxDistance < 35) {
        // En cas de palette monochrome ou classe unique : split-complémentaire à +145°
        nadirPoint = {
            hue: (zenithPoint.hue + 145) % 360,
            sat: zenithPoint.sat,
            lightness: zenithPoint.lightness,
        };
    } else {
        nadirPoint = candidateNadir;
    }

    // 3. Horizon : équilibre triadique (maximise la distance minimum aux deux pôles)
    let horizonPoint: HarmonicColorPoint;
    let maxMinDist = -1;
    let candidateHorizon: HarmonicColorPoint | null = null;

    for (const wp of weightedPoints) {
        const distToZenith = angularDistance(wp.point.hue, zenithPoint.hue);
        const distToNadir = angularDistance(wp.point.hue, nadirPoint.hue);
        const minDist = Math.min(distToZenith, distToNadir);
        if (minDist > maxMinDist) {
            maxMinDist = minDist;
            candidateHorizon = wp.point;
        }
    }

    if (!candidateHorizon || maxMinDist < 25) {
        const diff = ((nadirPoint.hue - zenithPoint.hue + 540) % 360) - 180;
        horizonPoint = {
            hue: ((zenithPoint.hue + diff * 0.5) % 360 + 360) % 360,
            sat: Math.round((zenithPoint.sat + nadirPoint.sat) / 2),
            lightness: Math.round((zenithPoint.lightness + nadirPoint.lightness) / 2),
        };
    } else {
        horizonPoint = candidateHorizon;
    }

    // 4. Trame de points et bain d'ambiance : moyenne vectorielle circulaire pondérée
    let sumX = 0;
    let sumY = 0;
    for (const wp of weightedPoints) {
        const rad = (wp.point.hue * Math.PI) / 180;
        sumX += wp.weight * Math.cos(rad);
        sumY += wp.weight * Math.sin(rad);
    }

    const length = Math.hypot(sumX, sumY);
    const circularMeanHue = length > 0.001
        ? ((Math.atan2(sumY, sumX) * 180) / Math.PI + 360) % 360
        : zenithPoint.hue;

    return {
        zenith: zenithPoint,
        nadir: nadirPoint,
        horizon: horizonPoint,
        dotHue: Math.round(circularMeanHue * 10) / 10,
        tintHue: Math.round(zenithPoint.hue * 10) / 10,
    };
}

/**
 * Transforme la palette dynamique en variables CSS consommées par `dashboardCanvas.css`.
 */
export function computeDynamicCanvasStyle(
    classes: Pick<ClassInfo, 'id' | 'color'>[] = [],
    activeSessionClassIds: string[] = []
): CSSProperties {
    const palette = computeHarmonicCanvasPalette(classes, activeSessionClassIds);
    return {
        '--canvas-base': 'hsl(var(--background))',
        '--canvas-base-dark': '#0e0d12',
        '--canvas-zenith-hue': `${palette.zenith.hue.toFixed(1)}`,
        '--canvas-zenith-sat': `${palette.zenith.sat.toFixed(1)}%`,
        '--canvas-nadir-hue': `${palette.nadir.hue.toFixed(1)}`,
        '--canvas-nadir-sat': `${palette.nadir.sat.toFixed(1)}%`,
        '--canvas-horizon-hue': `${palette.horizon.hue.toFixed(1)}`,
        '--canvas-horizon-sat': `${palette.horizon.sat.toFixed(1)}%`,
        '--canvas-dot-hue': `${palette.dotHue.toFixed(1)}`,
        '--canvas-tint-hue': `${palette.tintHue.toFixed(1)}`,
    } as CSSProperties;
}

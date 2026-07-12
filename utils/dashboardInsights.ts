import { LatenessSeverity } from './lateness.js';
import { HoursDeviation } from './scheduleInsights.js';

/**
 * Moteur d'ANALYSE du tableau de bord — transforme les données brutes (par
 * classe) en observations classées, actionnables et bienveillantes. C'est
 * l'« analyste » : il repère ce qui mérite l'attention du prof (retard,
 * devoir proche, progression, volume horaire, inactivité) et le formule
 * simplement, sans jamais culpabiliser. Fonction PURE, testable, partagée.
 */

export interface ClassAnalysis {
    classId: string;
    className: string;
    subject: string;
    completion: number;
    planned: number;
    total: number;
    sessionsCount: number;
    /** séances de retard (0 si à jour ou moteur en pause) */
    gapSessions: number;
    severity: LatenessSeverity;
    /** jours de classe depuis la dernière saisie (null si jamais) */
    daysSinceLastEntry: number | null;
    hasSchedule: boolean;
    /** écart heures posées vs officiel */
    hoursDeviation: HoursDeviation;
    delta: number;
    officialHours: number | null;
    /** prochain contenu daté du cahier, quand il existe */
    nextContent?: { title: string; date: string };
}

export type InsightTone = 'good' | 'info' | 'warn' | 'critical';
export type InsightIcon = 'late' | 'exam' | 'progress' | 'hours' | 'idle' | 'schedule' | 'sparkle' | 'today';

export interface Insight {
    id: string;
    tone: InsightTone;
    icon: InsightIcon;
    title: string;
    detail: string;
    classId?: string;
}

const TONE_RANK: Record<InsightTone, number> = { critical: 0, warn: 1, info: 2, good: 3 };

export interface UpcomingLite {
    classId: string;
    className: string;
    /** libellé court, ex. « Devoir surveillé n°1 » */
    label: string;
    inDays: number;
}

/** Agrège les analyses par classe + devoirs proches en observations classées. */
export const buildInsights = (
    rows: ClassAnalysis[],
    upcoming: UpcomingLite[],
    /** classes ayant une séance aujourd'hui sans aucune date posée ce jour */
    undatedToday: { classId: string; className: string }[]
): Insight[] => {
    const insights: Insight[] = [];

    // 1. Séance du jour non datée — l'action la plus immédiate
    for (const u of undatedToday) {
        insights.push({
            id: `today-${u.classId}`,
            tone: 'warn',
            icon: 'today',
            title: `Séance du jour à compléter — ${u.className}`,
            detail: "Le contenu du jour peut être daté lorsque vous êtes prêt(e).",
            classId: u.classId,
        });
    }

    // 2. Retards (par sévérité)
    for (const r of rows) {
        if (r.gapSessions <= 0) continue;
        const tone: InsightTone = r.severity === 'critical' ? 'critical' : r.severity === 'warning' ? 'warn' : 'info';
        insights.push({
            id: `late-${r.classId}`,
            tone,
            icon: 'late',
            title: `${r.className} — ${r.gapSessions} séance${r.gapSessions > 1 ? 's' : ''} à compléter`,
            detail:
                r.daysSinceLastEntry && r.daysSinceLastEntry >= 1
                    ? `Dernière saisie il y a ${r.daysSinceLastEntry} jour${r.daysSinceLastEntry > 1 ? 's' : ''} de classe. À compléter à votre rythme.`
                    : 'Une séance semble ne pas encore être renseignée.',
            classId: r.classId,
        });
    }

    // 3. Devoirs proches (≤ 7 j = warn, sinon info)
    for (const u of upcoming) {
        if (u.inDays > 14) continue;
        const when = u.inDays === 0 ? "aujourd'hui" : u.inDays === 1 ? 'demain' : `dans ${u.inDays} jours`;
        insights.push({
            id: `exam-${u.classId}-${u.label}`,
            tone: u.inDays <= 3 ? 'warn' : 'info',
            icon: 'exam',
            title: `${u.label} — ${u.className}`,
            detail: `Devoir prévu ${when} (planning officiel indicatif).`,
            classId: u.classId,
        });
    }

    // 4. Volume horaire à vérifier
    for (const r of rows) {
        if (r.officialHours === null || (r.hoursDeviation !== 'over' && r.hoursDeviation !== 'under')) continue;
        insights.push({
            id: `hours-${r.classId}`,
            tone: 'info',
            icon: 'hours',
            title: `Volume horaire — ${r.className}`,
            detail:
                r.hoursDeviation === 'over'
                    ? `${Math.abs(r.delta)} h de plus que l'officiel (${r.officialHours} h). Vérifiez l'emploi du temps.`
                    : `${Math.abs(r.delta)} h de moins que l'officiel (${r.officialHours} h). Un créneau oublié ?`,
            classId: r.classId,
        });
    }

    // 5. Emploi du temps manquant
    for (const r of rows) {
        if (r.hasSchedule) continue;
        insights.push({
            id: `schedule-${r.classId}`,
            tone: 'info',
            icon: 'schedule',
            title: `${r.className} sans emploi du temps`,
            detail: 'Ajoutez ses créneaux pour activer le suivi de progression et les alertes.',
            classId: r.classId,
        });
    }

    // 6. Belle progression (encouragement) — complétion élevée, à jour
    const bestDone = rows
        .filter(r => r.total >= 4 && r.completion >= 80 && r.gapSessions === 0)
        .sort((a, b) => b.completion - a.completion)[0];
    if (bestDone) {
        insights.push({
            id: `good-${bestDone.classId}`,
            tone: 'good',
            icon: 'sparkle',
            title: `${bestDone.className} bien avancée — ${bestDone.completion}%`,
            detail: 'Programme presque bouclé et cahier à jour. Beau travail 🌱',
            classId: bestDone.classId,
        });
    }

    return insights.sort(
        (a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]
    );
};

/** Petit bilan chiffré global — l'en-tête de l'analyste. */
export interface AnalystSummary {
    classCount: number;
    avgCompletion: number;
    totalSessions: number;
    lateClasses: number;
    upToDateClasses: number;
    /** phrase d'humeur générale */
    mood: string;
}

export const summarizeAnalysis = (rows: ClassAnalysis[], upcomingCount: number): AnalystSummary => {
    const classCount = rows.length;
    const avgCompletion = classCount === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.completion, 0) / classCount);
    const totalSessions = rows.reduce((s, r) => s + r.sessionsCount, 0);
    const lateClasses = rows.filter(r => r.gapSessions > 0).length;
    const upToDateClasses = rows.filter(r => r.hasSchedule && r.gapSessions === 0).length;

    let mood: string;
    if (classCount === 0) mood = 'Créez vos classes pour lancer le suivi.';
    else if (lateClasses === 0) mood = upcomingCount > 0 ? 'Tout est à jour — gardez un œil sur les devoirs à venir.' : 'Cahiers à jour sur toute la ligne. Excellent rythme !';
    else if (lateClasses === 1) mood = 'Presque parfait : une seule classe attend une mise à jour.';
    else mood = `${lateClasses} classes demandent un petit rattrapage — rien d'insurmontable.`;

    return { classCount, avgCompletion, totalSessions, lateClasses, upToDateClasses, mood };
};

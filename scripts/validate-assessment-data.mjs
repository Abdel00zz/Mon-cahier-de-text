import fs from 'node:fs';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const calendar = read('public/vacances-jourferie.json');
const planning = read('public/planning-devoirs.json');
const sourcesFile = read('public/official-sources.json');
const rulesFile = read('public/assessment-rules.json');

const fail = message => { throw new Error(message); };
const sourceIds = new Set();
for (const source of sourcesFile.sources ?? []) {
    if (!source.id || sourceIds.has(source.id)) fail(`Source invalide ou dupliquée : ${source.id}`);
    sourceIds.add(source.id);
    if (source.status === 'archived' && source.verification !== 'verified_archive') fail(`${source.id}: archive non vérifiée`);
}
for (const rule of rulesFile.rules ?? []) {
    if (!sourceIds.has(rule.sourceRef)) fail(`${rule.id}: sourceRef inconnu`);
    if (!Array.isArray(rule.sourcePages) || rule.sourcePages.length === 0) fail(`${rule.id}: pages source absentes`);
    if (!Array.isArray(rule.timingRules) || rule.timingRules.length === 0) fail(`${rule.id}: règle temporelle absente`);
}
if (planning.schoolYear !== '2026-2027') fail('planning.schoolYear doit identifier la projection annuelle.');

const utc = iso => Date.UTC(...iso.split('-').map((value, index) => index === 1 ? Number(value) - 1 : Number(value)));
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const add = (date, days) => iso(utc(date) + days * 86400000);
const weekday = date => new Date(utc(date)).getUTCDay();
const mondayOf = date => add(date, weekday(date) === 0 ? -6 : 1 - weekday(date));
const closed = date =>
    calendar.joursFeries.some(item => item.date === date) ||
    calendar.vacances.some(item => date >= item.debut && date <= item.fin);
const pedagogicalWeek = (start, number, end) => {
    let monday = mondayOf(start);
    let count = 0;
    for (let guard = 0; monday <= end && guard < 80; guard += 1, monday = add(monday, 7)) {
        const days = Array.from({ length: 6 }, (_, offset) => add(monday, offset))
            .filter(date => date >= start && date <= end && !closed(date));
        if (days.length && ++count === number) return { start: monday, end: add(monday, 5), first: days[0] };
    }
    return null;
};
const schoolYear = calendar.anneesScolaires.find(item => item.libelle === planning.schoolYear);
if (!schoolYear) fail('Année du planning absente du calendrier.');
const midYear = calendar.vacances.find(item => item.debut >= schoolYear.debut && item.fin <= schoolYear.fin && item.nom.toLowerCase().includes('mi-année'));
if (!midYear) fail('Vacances de mi-année introuvables.');
const starts = { 1: schoolYear.debut, 2: add(midYear.fin, 1) };

let assessmentCount = 0;
let closedDateCount = 0;
for (const plan of planning.plans ?? []) {
    if (!sourceIds.has(plan.sourceRef)) fail(`${plan.libelle}: sourceRef inconnu ou absent`);
    for (const semester of plan.semestres ?? []) {
        for (const assessment of semester.devoirs ?? []) {
            assessmentCount += 1;
            const week = pedagogicalWeek(starts[semester.n], assessment.semaine, schoolYear.fin);
            if (!week) fail(`${plan.libelle}: semaine ${assessment.semaine} S${semester.n} introuvable`);
            if (closed(week.first)) closedDateCount += 1;
        }
    }
}
if (closedDateCount) fail(`${closedDateCount} évaluations calculées sur une fermeture.`);

const expectations = [
    [1, 5, '2026-10-05'], [1, 10, '2026-11-16'], [1, 16, '2027-01-04'],
    [2, 5, '2027-03-01'], [2, 10, '2027-04-12'], [2, 15, '2027-05-24'], [2, 18, '2027-06-14'],
];
for (const [semester, number, expected] of expectations) {
    const actual = pedagogicalWeek(starts[semester], number, schoolYear.fin)?.start;
    if (actual !== expected) fail(`S${semester} semaine ${number}: ${actual}, attendu ${expected}`);
}

console.log(`Données évaluations valides : ${assessmentCount} devoirs, ${rulesFile.rules.length} règles, ${sourcesFile.sources.length} sources.`);

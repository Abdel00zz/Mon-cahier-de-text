import assert from 'node:assert/strict';
import test from 'node:test';
import type { PedagogicalEvent } from '../src/types';
import {
    buildNotebookCheckRemarks,
    coveredDates,
    notebookCheckRemarkText,
    REMARK_EVENT_TYPE,
    REMARK_NAME_LIMIT,
} from '../src/domain/evaluations/notebookCheckRemarks';

/*
 * Contrôle des cahiers → remarque de la séance.
 *
 * Ces tests verrouillent le CONTRAT, pas l'affichage : seul le contrôle des
 * cahiers écrit dans la remarque d'une séance, l'indexation se fait par date
 * (une activité de deux jours annote les deux séances), et le texte reste
 * court parce qu'une cellule de remarque mesure quelques centimètres.
 */

const event = (overrides: Partial<PedagogicalEvent> & Pick<PedagogicalEvent, 'date'>): PedagogicalEvent => ({
    id: 'evt-1',
    type: REMARK_EVENT_TYPE,
    title: 'مراقبة دفاتر التلاميذ',
    status: 'planned',
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
});

const names = (...values: string[]) => ({ names: values, updatedAt: '2026-09-01T08:00:00.000Z' });

// Traduction factice : on inspecte les valeurs transmises, jamais du texte figé.
const echo = (key: string, values: Record<string, string | number> = {}) =>
    `${key}|${values.names ?? ''}|${values.more ?? ''}`;

test('seul le contrôle des cahiers écrit dans la remarque d’une séance', () => {
    const marks = buildNotebookCheckRemarks([
        event({ id: 'a', date: '2026-09-14' }),
        event({ id: 'b', type: 'olympiade', date: '2026-09-15' }),
        event({ id: 'c', type: 'examen_blanc', date: '2026-09-16' }),
        event({ id: 'd', type: 'soutien', date: '2026-09-17' }),
    ]);
    assert.deepEqual([...marks.keys()], ['2026-09-14']);
    assert.equal(marks.get('2026-09-14')?.eventId, 'a');
});

test('une activité de deux jours annote les deux séances, bornes incluses', () => {
    const twoDays = event({ id: 'span', date: '2026-09-14', endDate: '2026-09-15' });
    assert.deepEqual(coveredDates(twoDays), ['2026-09-14', '2026-09-15']);
    const marks = buildNotebookCheckRemarks([twoDays]);
    assert.deepEqual([...marks.keys()], ['2026-09-14', '2026-09-15']);
    assert.equal(marks.get('2026-09-15')?.eventId, 'span');
});

test('les dates douteuses ne produisent aucune annotation', () => {
    assert.deepEqual(coveredDates(event({ date: '14/09/2026' })), []);
    assert.deepEqual(coveredDates(event({ date: '2026-09-14', endDate: 'pas-une-date' })), ['2026-09-14']);
    // Fin antérieure au début = contrôle sur la seule journée saisie.
    assert.deepEqual(coveredDates(event({ date: '2026-09-14', endDate: '2026-09-10' })), ['2026-09-14']);
    assert.equal(buildNotebookCheckRemarks([event({ date: '2026-13-40' })]).size, 0);
    assert.equal(buildNotebookCheckRemarks(undefined).size, 0);
    assert.equal(buildNotebookCheckRemarks([]).size, 0);
});

test('un intervalle aberrant est borné pour ne pas boucler', () => {
    const dates = coveredDates(event({ date: '2026-09-01', endDate: '2027-06-30' }));
    assert.equal(dates.length, 31);
    assert.equal(dates[0], '2026-09-01');
    assert.equal(dates[30], '2026-10-01');
});

test('un intervalle franchit correctement la fin du mois', () => {
    assert.deepEqual(
        coveredDates(event({ date: '2026-01-30', endDate: '2026-02-02' })),
        ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'],
    );
});

test('deux contrôles le même jour : le premier posé l’emporte', () => {
    const marks = buildNotebookCheckRemarks([
        event({ id: 'matin', date: '2026-09-14', title: 'الأولى' }),
        event({ id: 'soir', date: '2026-09-14', title: 'الثانية' }),
    ]);
    assert.equal(marks.size, 1);
    assert.equal(marks.get('2026-09-14')?.title, 'الأولى');
});

test('les noms consignés restent bornés, le reste est résumé', () => {
    const marks = buildNotebookCheckRemarks([
        event({ date: '2026-09-14', students: names('أمين', 'سلمى', 'ياسين', 'هند', 'عمر') }),
    ]);
    const remark = marks.get('2026-09-14')!;
    assert.equal(remark.names.length, 5);
    const text = notebookCheckRemarkText(remark, echo, '، ');
    assert.equal(text, 'remark.checkNamesMore|أمين، سلمى، ياسين|2');
    assert.equal(remark.names.slice(0, REMARK_NAME_LIMIT).length, 3);
});

test('jusqu’à trois noms : liste complète, séparateur de la langue', () => {
    const marks = buildNotebookCheckRemarks([
        event({ date: '2026-09-14', students: names('Amin', 'Salma', 'Yassine') }),
    ]);
    const remark = marks.get('2026-09-14')!;
    assert.equal(notebookCheckRemarkText(remark, echo, ', '), 'remark.checkNames|Amin, Salma, Yassine|');
    // Un nom vide (saisie interrompue) ne compte pas comme un élève.
    const trimmed = buildNotebookCheckRemarks([
        event({ date: '2026-09-15', students: names('Amin', '   ', '') }),
    ]).get('2026-09-15')!;
    assert.deepEqual(trimmed.names, ['Amin']);
});

test('sans élève consigné, la séance garde la trace du titre', () => {
    const marks = buildNotebookCheckRemarks([event({ date: '2026-09-14', title: '  مراقبة الدفاتر  ' })]);
    const remark = marks.get('2026-09-14')!;
    assert.deepEqual(remark.names, []);
    assert.equal(remark.title, 'مراقبة الدفاتر');
    assert.equal(notebookCheckRemarkText(remark, echo, ', '), 'مراقبة الدفاتر');
});

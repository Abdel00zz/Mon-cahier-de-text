import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig } from '../src/types';

test('sync granulaire : les suivis élèves les plus récents par évaluation ou activité sont préservés', async () => {
    const { mergeStudentFollowUpRecords } = await import('../src/infrastructure/sync/syncSettings');
    const remote: Partial<AppConfig> = {
        assessmentParticipants: {
            a: {
                c1: { names: ['Amine'], updatedAt: '2026-10-14T08:00:00Z', oralGrades: { Amine: '12' } },
                c2: { names: ['Salma'], updatedAt: '2026-10-16T10:00:00Z', oralGrades: { Salma: '17' } },
            },
        },
        pedagogicalEvents: {
            a: [
                { id: 'cahiers-1', type: 'controle_cahiers', title: 'Cahiers', date: '2026-10-15', status: 'done', createdAt: '', students: { names: ['Amine'], updatedAt: '2026-10-14T09:00:00Z', notebookConditions: { Amine: 'good' } } },
            ],
        },
    };
    const local: Partial<AppConfig> = {
        assessmentParticipants: {
            a: {
                c1: { names: ['Amine'], updatedAt: '2026-10-15T14:00:00Z', oralGrades: { Amine: '16' } },
            },
        },
        pedagogicalEvents: {
            a: [
                { id: 'cahiers-1', type: 'controle_cahiers', title: 'Cahiers', date: '2026-10-15', status: 'done', createdAt: '', students: { names: ['Amine', 'Salma'], updatedAt: '2026-10-16T11:00:00Z', notebookConditions: { Amine: 'good', Salma: 'needs_work' } } },
            ],
        },
    };
    const merged = mergeStudentFollowUpRecords(remote, local);
    assert.equal(merged.assessmentParticipants?.a?.c1?.oralGrades?.Amine, '16', 'la note locale plus récente sur c1 est conservée');
    assert.equal(merged.assessmentParticipants?.a?.c2?.oralGrades?.Salma, '17', 'la note distante plus récente sur c2 est conservée');
    assert.deepEqual(merged.pedagogicalEvents?.a?.[0]?.students?.names, ['Amine', 'Salma'], 'le suivi des cahiers plus récent est conservé');
});

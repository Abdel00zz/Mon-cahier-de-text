import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AppLocale } from '../src/types';
import type { ClassGuidance } from '../src/domain/assistant/classGuidance';
import { classGuidanceMessage } from '../src/features/assistant/companionCopy';

const base = { classId: 'physics', className: '2ème Bac Sciences Physiques 3', remaining: 1 };
const states: ClassGuidance[] = [
  { ...base, step: 'schedule' },
  { ...base, step: 'active-session', notebook: 'has-content' },
  { ...base, step: 'notebook-issue', issueCode: 'unclosedFormula', count: 1 },
  { ...base, step: 'notebook-empty' },
  { ...base, step: 'notebook-unavailable' },
  { ...base, step: 'evaluation-conflict', conflictKind: 'overlap', count: 1 },
  { ...base, step: 'roster-incomplete', reason: 'unmerged-names', count: 2 },
];

test('le compagnon parle d’abord de l’action, sans question rhétorique', () => {
  for (const locale of ['fr', 'ar', 'en'] as const satisfies readonly AppLocale[]) {
    for (const state of states) {
      const message = classGuidanceMessage(state, locale);
      assert.doesNotMatch(message.detail, /[?؟]/u, `${locale}/${state.step} ne doit pas demander la permission`);
      assert.ok(message.detail.length <= 220, `${locale}/${state.step} reste lisible d’un coup d’œil`);
      assert.ok(message.action, `${locale}/${state.step} propose une action explicite`);
    }
  }
});

test('une seule action principale, une seule divulgation pour les outils', () => {
  const source = readFileSync('src/features/assistant/AssistantPopover.tsx', 'utf8');
  assert.equal((source.match(/className="assistant-panel__action"/gu) ?? []).length, 1, 'un seul CTA');
  assert.doesNotMatch(source, /alternateAction|nextTaskLabel|onNextTask/u, 'plus de boutons concurrents');
  assert.match(source, /assistant-panel__disclosure/u, 'les outils sont derrière une divulgation');
  assert.match(source, /assistant-panel__link/u, 'l’action secondaire est un lien, pas un bouton');

  const tips = readFileSync('src/features/assistant/AssistantTips.tsx', 'utf8');
  assert.doesNotMatch(tips, /Une autre idée|Another idea|فكرة أخرى/u, 'la tip ne charge pas un bouton supplémentaire');
});

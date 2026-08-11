/* ── Mappings de types de contenu ────────────────────────────────────────── */

export const TYPE_MAP: { [key: string]: string } = {
  'definition': 'définition', 'définition': 'définition',
  'theorem': 'théorème', 'théorème': 'théorème', 'theoreme': 'théorème',
  'proposition': 'proposition', 'prop': 'proposition',
  'lemma': 'lemme', 'lemme': 'lemme',
  'corollary': 'corollaire', 'corollaire': 'corollaire', 'corol': 'corollaire',
  'remark': 'remarque', 'remarque': 'remarque', 'rem': 'remarque',
  'proof': 'preuve', 'preuve': 'preuve',
  'example': 'exemple', 'exemple': 'exemple', 'ex': 'exemple',
  'exercise': 'exercice', 'exercice': 'exercice', 'exo': 'exercice',
  'activity': 'activité', 'activité': 'activité', 'activite': 'activité', 'act': 'activité',
  'application': 'application', 'app': 'application'
};

export const BADGE_TEXT_MAP: { [key: string]: string } = {
  'définition': 'Déf.',
  'théorème': 'Th.',
  'proposition': 'Prop.',
  'lemme': 'Lem.',
  'corollaire': 'Cor.',
  'remarque': 'Rem.',
  'preuve': 'Prv.',
  'exemple': 'Ex.',
  'exercice': 'Exo.',
  'activité': 'Act.',
  'application': 'Appli.'
};

export const BADGE_COLOR_MAP: { [key: string]: string } = {
    'activité': 'bg-emerald-100/75 text-emerald-800 border-emerald-200/90',
    'définition': 'bg-blue-100/75 text-blue-800 border-blue-200/90',
    'théorème': 'bg-purple-100/75 text-purple-800 border-purple-200/90',
    'proposition': 'bg-indigo-100/75 text-indigo-800 border-indigo-200/90',
    'lemme': 'bg-violet-100/75 text-violet-800 border-violet-200/90',
    'corollaire': 'bg-pink-100/75 text-pink-800 border-pink-200/90',
    'remarque': 'bg-slate-100/85 text-slate-700 border-slate-200/90',
    'preuve': 'bg-zinc-100 text-zinc-800 border-zinc-200/90',
    'exemple': 'bg-cyan-100/75 text-cyan-800 border-cyan-200/90',
    'exercice': 'bg-amber-100/80 text-amber-800 border-amber-200/90',
    'application': 'bg-teal-100/75 text-teal-800 border-teal-200/90',
};

export const BADGE_TOOLTIP_MAP: { [key: string]: string } = {
  'activité': 'Activité',
  'définition': 'Définition',
  'théorème': 'Théorème',
  'proposition': 'Proposition',
  'lemme': 'Lemme',
  'corollaire': 'Corollaire',
  'remarque': 'Remarque',
  'preuve': 'Preuve',
  'exemple': 'Exemple',
  'exercice': 'Exercice',
  'application': "Exercice d'application",
};

export const SUBJECT_ABBREV_MAP: Record<string, string> = {
  'Mathématiques': 'Mathématiques',
  'Physique': 'Physique',
  'Économie': 'Économie',
  'Français': 'Français',
  'SVT': 'SVT',
  'Sciences de la Vie': 'SVT',
  'Sciences de la Vie et de la Terre': 'SVT',
};

/* ── Config du niveau de contenu ─────────────────────────────────────────── */

import type { ComponentType } from 'react';
import { Book, TestTube, Home, FileSignature, CheckCheck, CheckSquare } from '../components/ui/icons';
import type { TopLevelItem } from '../types';

export const TOP_LEVEL_TYPE_CONFIG: Record<TopLevelItem['type'], {
  name: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  badgeColor?: string;
  rowColor?: string;
  autoNumber?: boolean;
}> = {
  'chapter': { name: 'Chapitre', icon: Book, color: 'text-red-700', rowColor: 'bg-slate-50' },
  'evaluation_diagnostic': { name: 'Évaluation diagnostique', icon: TestTube, color: 'text-rose-600', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200', rowColor: 'bg-rose-50/40', autoNumber: true },
  'devoir_maison': { name: 'Devoir maison', icon: Home, color: 'text-blue-600', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', rowColor: 'bg-blue-50/40', autoNumber: true },
  'controle_continu': { name: 'Contrôle continu', icon: FileSignature, color: 'text-indigo-600', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', rowColor: 'bg-indigo-50/40', autoNumber: true },
  'correction_devoir_maison': { name: 'Correction Devoir maison', icon: CheckCheck, color: 'text-cyan-600', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200', rowColor: 'bg-cyan-50/40', autoNumber: true },
  'correction_controle_continu': { name: 'Correction Contrôle continu', icon: CheckSquare, color: 'text-emerald-600', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', rowColor: 'bg-emerald-50/40', autoNumber: true },
};

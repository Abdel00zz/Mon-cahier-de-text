/* ── Mappings de types de contenu ────────────────────────────────────────── */

// Les maps « pures » (sans React) vivent dans type-keys.ts pour être partagées
// avec le pipeline d'import JSON (navigateur + fonctions cloud). On les
// ré-exporte ici pour préserver l'API historique de `@/constants`.
export {
  TYPE_MAP,
  BADGE_TEXT_MAP,
  BADGE_COLOR_MAP,
  BADGE_TOOLTIP_MAP,
  SUBJECT_ABBREV_MAP,
} from './type-keys';

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
  'controle_continu': { name: 'Devoir surveillé', icon: FileSignature, color: 'text-indigo-600', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', rowColor: 'bg-indigo-50/40', autoNumber: true },
  'correction_devoir_maison': { name: 'Correction Devoir maison', icon: CheckCheck, color: 'text-cyan-600', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200', rowColor: 'bg-cyan-50/40', autoNumber: true },
  'correction_controle_continu': { name: 'Correction du devoir surveillé', icon: CheckSquare, color: 'text-emerald-600', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', rowColor: 'bg-emerald-50/40', autoNumber: true },
};

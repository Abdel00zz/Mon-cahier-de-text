/* ── Mappings de types de contenu ────────────────────────────────────────── */

// Les maps « pures » (sans React) vivent dans type-keys.ts pour être partagées
// avec le pipeline d'import JSON (navigateur + fonctions cloud). On les
// ré-exporte ici pour préserver l'API historique de `@/constants`.
export {
  TYPE_MAP,
  BADGE_TEXT_MAP,
  BADGE_TOOLTIP_MAP,
  contentBadgeClass,
  SUBJECT_ABBREV_MAP,
} from './type-keys';

/* ── Config du niveau de contenu ─────────────────────────────────────────── */

import type { ComponentType } from 'react';
import { Book, TestTube, Home, FileSignature, CheckCheck, CheckSquare, Clock, FileText, Users, AwardIcon, GraduationCap } from '../components/ui/icons';
import { Presentation } from 'lucide-react';
import type { TopLevelType } from '../types';
import { TOP_LEVEL_CONTENT_META } from './top-level-types';

export const TOP_LEVEL_TYPE_CONFIG: Record<TopLevelType, {
  name: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  badgeColor?: string;
  rowColor?: string;
  autoNumber?: boolean;
}> = {
  'chapter': { ...TOP_LEVEL_CONTENT_META.chapter, icon: Book, color: 'text-red-700 dark:text-red-400', rowColor: 'bg-slate-50' },
  'evaluation_diagnostic': { ...TOP_LEVEL_CONTENT_META.evaluation_diagnostic, icon: TestTube, color: 'text-rose-600 dark:text-rose-400', badgeColor: 'bg-[#fdf2f4] text-[#9f1239] border-[#fecdd3] dark:bg-[#34161f] dark:text-[#fda4af] dark:border-[#672235]', rowColor: 'bg-rose-50/40' },
  'devoir_maison': { ...TOP_LEVEL_CONTENT_META.devoir_maison, icon: Home, color: 'text-blue-600 dark:text-blue-400', badgeColor: 'bg-[#f0f6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[#142642] dark:text-[#93c5fd] dark:border-[#2b4c7e]', rowColor: 'bg-blue-50/40' },
  'controle_continu': { ...TOP_LEVEL_CONTENT_META.controle_continu, icon: FileSignature, color: 'text-indigo-600 dark:text-indigo-400', badgeColor: 'bg-[#f5f2fd] text-[#532985] border-[#ddd1fa] dark:bg-[#231a38] dark:text-[#d8c5fa] dark:border-[#4d3975]', rowColor: 'bg-indigo-50/40' },
  'controle_court': { ...TOP_LEVEL_CONTENT_META.controle_court, icon: Clock, color: 'text-violet-600 dark:text-violet-400', badgeColor: 'bg-[#eef2ff] text-[#3730a3] border-[#c7d2fe] dark:bg-[#1d1f3d] dark:text-[#c7d2fe] dark:border-[#3b3e70]', rowColor: 'bg-violet-50/40' },
  'controle_global': { ...TOP_LEVEL_CONTENT_META.controle_global, icon: FileText, color: 'text-emerald-600 dark:text-emerald-400', badgeColor: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] dark:bg-[#132c21] dark:text-[#6ee7b7] dark:border-[#26533f]', rowColor: 'bg-emerald-50/40' },
  'oral': { ...TOP_LEVEL_CONTENT_META.oral, icon: Users, color: 'text-pink-600 dark:text-pink-400', badgeColor: 'bg-[#fdf2f8] text-[#9d174d] border-[#fbcfe8] dark:bg-[#321726] dark:text-[#f472b6] dark:border-[#632448]', rowColor: 'bg-pink-50/40' },
  'correction_devoir_maison': { ...TOP_LEVEL_CONTENT_META.correction_devoir_maison, icon: CheckCheck, color: 'text-cyan-600 dark:text-cyan-400', badgeColor: 'bg-[#edfcf8] text-[#0a6659] border-[#b9f2e7] dark:bg-[#122e28] dark:text-[#78f2df] dark:border-[#22574d]', rowColor: 'bg-cyan-50/40' },
  'correction_controle_continu': { ...TOP_LEVEL_CONTENT_META.correction_controle_continu, icon: CheckSquare, color: 'text-emerald-600 dark:text-emerald-400', badgeColor: 'bg-[#edfcf8] text-[#0a6659] border-[#b9f2e7] dark:bg-[#122e28] dark:text-[#78f2df] dark:border-[#22574d]', rowColor: 'bg-emerald-50/40' },
  'examen_blanc': { ...TOP_LEVEL_CONTENT_META.examen_blanc, icon: FileSignature, color: 'text-rose-600 dark:text-rose-400', badgeColor: 'bg-[#fff1f2] text-[#881337] border-[#fecdd3] dark:bg-[#36131c] dark:text-[#fb7185] dark:border-[#692134]', rowColor: 'bg-rose-50/40' },
  'olympiade': { ...TOP_LEVEL_CONTENT_META.olympiade, icon: AwardIcon, color: 'text-amber-600 dark:text-amber-400', badgeColor: 'bg-[#fefce8] text-[#854d0e] border-[#fef08a] dark:bg-[#332a10] dark:text-[#fde047] dark:border-[#5c4a16]', rowColor: 'bg-amber-50/40' },
  'concours': { ...TOP_LEVEL_CONTENT_META.concours, icon: GraduationCap, color: 'text-violet-600 dark:text-violet-400', badgeColor: 'bg-[#faf5ff] text-[#6b21a8] border-[#e9d5ff] dark:bg-[#281b3d] dark:text-[#d8b4fe] dark:border-[#523380]', rowColor: 'bg-violet-50/40' },
  'colle': { ...TOP_LEVEL_CONTENT_META.colle, icon: Presentation, color: 'text-rose-600 dark:text-rose-400', badgeColor: 'bg-[#fff7ed] text-[#9a3412] border-[#fed7aa] dark:bg-[#361c11] dark:text-[#fdba74] dark:border-[#6b351d]', rowColor: 'bg-rose-50/40' },
};

/*
 * Catalogue UNIQUE des natures d'évaluation d'une classe.
 *
 * Un professeur range dans la même page deux familles qui n'ont pas le même
 * destin :
 *   • les DEVOIRS (contrôle continu, devoir maison, oral…), qui suivent le
 *     bulletin et peuvent venir du planning officiel comme d'un ajout manuel ;
 *   • les ACTIVITÉS pédagogiques (diagnostic, contrôle des cahiers, olympiade,
 *     concours, soutien, remédiation, rattrapage, examen blanc), qui racontent
 *     l'année sans entrer dans la moyenne.
 *
 * Les deux partagent ici le même contrat — un libellé, une teinte, une icône —
 * pour que le CHOIX de la nature soit une seule grille de cartes colorées
 * (voir `components/KindChooser.tsx`) et que la page principale parle une seule
 * langue visuelle. Une icône ET une teinte par nature : la carte se reconnaît
 * d'un coup d'œil, sans empiler les pastilles. Deux natures qui partagent une
 * teinte (trois évaluations bleues) se distinguent par leur dessin.
 *
 * L'ordre de déclaration EST l'ordre proposé au professeur : le parcours de
 * l'année, du diagnostic aux épreuves de fin d'année, puis l'accompagnement.
 */
import {
  AwardIcon,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  Clock,
  FileSignature,
  FileText,
  GraduationCap,
  History,
  Home,
  ListChecks,
  PenLine,
  RefreshCw,
  Users,
} from '@/components/ui/icons';
import type { DevoirType, PedagogicalEventType } from '@/types';

/** Teintes disponibles pour une carte (voir `.hub-card[data-tone]`). */
type ActivityTone = 'blue' | 'violet' | 'pink' | 'amber' | 'green' | 'teal' | 'rose' | 'slate';

export interface KindStyle {
  labelKey: string;
  tone: ActivityTone;
  Icon: typeof BookOpen;
}

/** Activités pédagogiques : hors bulletin, mais dans la vie de la classe. */
export const PEDAGOGICAL_EVENT_CONFIG: Record<PedagogicalEventType, KindStyle> = {
  evaluation_diagnostic: { labelKey: 'evaluations.event.evaluation_diagnostic', tone: 'blue', Icon: ListChecks },
  controle_cahiers: { labelKey: 'evaluations.event.controle_cahiers', tone: 'blue', Icon: CheckSquare },
  examen_blanc: { labelKey: 'evaluations.event.examen_blanc', tone: 'rose', Icon: FileSignature },
  olympiade: { labelKey: 'evaluations.event.olympiade', tone: 'amber', Icon: AwardIcon },
  concours: { labelKey: 'evaluations.event.concours', tone: 'violet', Icon: GraduationCap },
  soutien: { labelKey: 'evaluations.event.soutien', tone: 'green', Icon: BookOpen },
  remediation: { labelKey: 'evaluations.event.remediation', tone: 'teal', Icon: RefreshCw },
  rattrapage: { labelKey: 'evaluations.event.rattrapage', tone: 'pink', Icon: History },
  autre: { labelKey: 'evaluations.event.autre', tone: 'slate', Icon: PenLine },
};

/** Devoirs et évaluations : les cinq natures qui alimentent le bulletin. */
export const DEVOIR_KIND_CONFIG: Record<DevoirType, KindStyle> = {
  // L'épreuve écrite en classe : le calendrier des évaluations.
  controle: { labelKey: 'evaluations.type.controle', tone: 'blue', Icon: CalendarCheck },
  // L'épreuve courte : le temps d'une séance.
  controle_court: { labelKey: 'evaluations.type.controle_court', tone: 'violet', Icon: Clock },
  // L'épreuve longue : une copie complète.
  controle_global: { labelKey: 'evaluations.type.controle_global', tone: 'green', Icon: FileText },
  // L'oral : la classe prend la parole.
  oral: { labelKey: 'evaluations.type.oral', tone: 'rose', Icon: Users },
  // Le travail à la maison.
  maison: { labelKey: 'evaluations.type.maison', tone: 'teal', Icon: Home },
};

/** Une nature proposée au professeur, avec la famille qui décide de ses champs. */
export type EvaluationKind =
  | { family: 'devoir'; type: DevoirType; style: KindStyle }
  | { family: 'event'; type: PedagogicalEventType; style: KindStyle };

/**
 * Les familles, dans l'ordre où elles se lisent. Le titre de chaque groupe est
 * celui des sections de la page principale : le professeur retrouve au moment
 * du choix le vocabulaire qu'il vient de lire.
 */
export const KIND_GROUPS: Array<{ id: 'devoir' | 'event'; titleKey: string; kinds: EvaluationKind[] }> = [
  {
    id: 'devoir',
    titleKey: 'evaluations.assessments',
    kinds: (Object.keys(DEVOIR_KIND_CONFIG) as DevoirType[]).map(type => ({ family: 'devoir', type, style: DEVOIR_KIND_CONFIG[type] })),
  },
  {
    id: 'event',
    titleKey: 'evaluations.pedagogicalEvents',
    kinds: (Object.keys(PEDAGOGICAL_EVENT_CONFIG) as PedagogicalEventType[]).map(type => ({ family: 'event', type, style: PEDAGOGICAL_EVENT_CONFIG[type] })),
  },
];

/** Clé de traduction d'une nature — jamais un libellé en dur. */
export const kindLabelKey = (kind: EvaluationKind): string => kind.style.labelKey;

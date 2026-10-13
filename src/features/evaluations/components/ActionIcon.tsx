import { CalendarCheck, FileText, UserX, Users } from '@/components/ui/icons';

/*
 * Le pictogramme d'une commande de la feuille. TROIS fonctions, TROIS pictogrammes — les mêmes
 * pour toutes les natures (devoirs, activités, contrôle continu) :
 *
 *   document  la feuille de contenu (sujet, corrigé)
 *   students  la liste des élèves, quel que soit son habillage (suivi, remises, cahiers…)
 *   absents   les absents d'une épreuve
 *   deadline  la date limite de rendu d'un devoir maison
 *
 * L'état (rédigé, requis, absents consignés) se lit sur la teinte du bouton, jamais sur un
 * pictogramme différent. La corbeille est le même bouton partout (`AnimatedTrashButton`).
 */
const ICONS = { document: FileText, students: Users, absents: UserX, deadline: CalendarCheck } as const;
export type ActionIconName = keyof typeof ICONS;

export function ActionIcon({ name }: { name: ActionIconName }) {
  const Icon = ICONS[name];
  return <Icon size={16} className="ev-action__icon" aria-hidden="true" />;
}
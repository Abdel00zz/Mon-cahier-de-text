import type { TeacherSnapshot } from '../types';

export const globalCompletion = (teacher: TeacherSnapshot): number => {
    const totals = teacher.classes.reduce(
        (acc, c) => {
            acc.planned += c.plannedCount;
            acc.total += c.totalItems;
            return acc;
        },
        { planned: 0, total: 0 }
    );
    return totals.total === 0 ? 0 : Math.round((totals.planned / totals.total) * 100);
};

export const timeAgo = (iso: string | null): string => {
    if (!iso) return 'jamais synchronisé';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '—';
    const diffMs = Date.now() - then;
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
};

export const completionColor = (rate: number): string => {
    if (rate >= 75) return 'bg-emerald-500';
    if (rate >= 40) return 'bg-amber-500';
    return 'bg-red-500';
};

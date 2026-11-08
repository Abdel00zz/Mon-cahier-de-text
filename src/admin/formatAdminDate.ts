/** Formatage des dates côté « Espace Direction » — une seule source pour les
 * trois écrans (fiche enseignant, progression, conversations), en français. */

const formatDate = (iso: string | null | undefined, options: Intl.DateTimeFormatOptions, fallback: string): string => {
    if (!iso) return fallback;
    try {
        const [year, month, day] = iso.split('-').map(Number);
        const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
            ? new Date(year, month - 1, day)
            : new Date(iso);
        if (Number.isNaN(date.getTime())) return iso;
        return date.toLocaleDateString('fr-FR', options);
    } catch {
        return iso;
    }
};

/** Date longue avec jour de la semaine : « lundi 3 novembre 2026 ». */
export const formatDateFr = (iso: string | null | undefined): string =>
    formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, 'Non renseignée');

/** Date longue sans jour : « 3 novembre 2026 ». */
export const formatLongDate = (iso: string | null | undefined): string =>
    formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' }, 'aucune');

/** Horodatage compact : « 3 nov. 14:05 ». */
export const formatDateTimeFr = (iso: string | null | undefined): string => {
    if (!iso) return 'Non renseignée';
    try {
        return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
};

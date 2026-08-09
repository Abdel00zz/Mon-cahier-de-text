export type NotificationsAxisId = 'priorites' | 'echeances' | 'calendrier' | 'classes' | 'activite' | 'ignores';

const INITIAL_AXIS_KEY = 'notifications_initial_axis_v1';
const VALID_AXES = new Set<NotificationsAxisId>([
    'priorites',
    'echeances',
    'calendrier',
    'classes',
    'activite',
    'ignores',
]);

/** Prépare la section exacte à ouvrir lors de la prochaine navigation. */
export const requestNotificationsAxis = (axis: NotificationsAxisId): void => {
    try {
        sessionStorage.setItem(INITIAL_AXIS_KEY, axis);
    } catch {
        // La navigation reste possible si le stockage est indisponible.
    }
};

/** Consomme une seule fois la destination demandée par une carte ou un modal. */
export const consumeNotificationsAxis = (): NotificationsAxisId | null => {
    try {
        const axis = sessionStorage.getItem(INITIAL_AXIS_KEY);
        sessionStorage.removeItem(INITIAL_AXIS_KEY);
        return axis && VALID_AXES.has(axis as NotificationsAxisId)
            ? axis as NotificationsAxisId
            : null;
    } catch {
        return null;
    }
};
